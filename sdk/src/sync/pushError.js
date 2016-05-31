// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/**
 * Table push error handling implementation
 */

var Validate = require('../Utilities/Validate'),
    Platform = require('Platforms/Platform'),
    ColumnType = require('./ColumnType'),
    taskRunner = require('../Utilities/taskRunner'),
    _ = require('../Utilities/Extensions'),
    Query = require('query.js').Query,
    operationTableName = require('../constants').table.operationTableName;

function createPushError(store, storeTaskRunner, pushOperation, operationError, pushHandler) {
    
    var pushError = {
        isHandled: false,
        error: operationError,
        handleError: handleError,
        isConflict: isConflict,
        updateRecord: updateLocalRecord,
        deleteRecord: deleteRecord,
        cancelRecordPush: cancelRecordPush
    };
    
    return pushError;
    
    function handleError() {
        return Platform.async(function(callback) {
            callback();
        })().then(function() {
            
            if (pushHandler && pushHandler.onRecordPushError) {
                //TODO: Send a copy as parameter values, instead of the original
                return pushHandler.onRecordPushError(pushError,
                                                     pushOperation.logRecord.tableName,
                                                     pushOperation.logRecord.action,
                                                     pushOperation.data /* this will be undefined for delete operations */);
            }
        });
    }
    
    /**
     * Checks if the current error is a conflict error
     * 
     * @returns true - if the current error is a conflict error. false - otherwise.
     */
    function isConflict() {
        return operationError.request.status === 412;//FIXME: this cna be property
    }
    
    /**
     * Updates the data record associated with the current operation from the local store.
     *
     * @param newValue New value of the data record. Note that the new record cannot change the ID. 
     * @param {boolean} [cancelRecordPush] Flag specifying whether or not to cancel sending this change (i.e. change
     * associated with this record) to the server. Note that cancelling push only affects this instance of push and 
     * future changes to the record will continue to be pushed to the server.
     * 
     * @returns A promise that is fulfilled when the data record is updated and optionally, the pending change is cancelled.
     */
    function updateLocalRecord(newValue, cancelRecordPush) {
        return storeTaskRunner.run(function() {
            //TODO: If the record has changed do not allow error handling for it
            
            if (pushOperation.logRecord.action === 'delete') {
                throw new Error('Cannot update a deleted record');
            }
            
            if (_.isNull(newValue)) {
                throw new Error('Need a valid object to update the record');
            }
            
            if (!_.isValidId(newValue.id)) {
                throw new Error('Invalid ID: ' + newValue.id);
            }
            
            if (newValue.id !== pushOperation.data.id) {
                throw new Error('Only updating the record being pushed is allowed');
            }
            
            var dataUpdateOperation = {
                tableName: pushOperation.logRecord.tableName,
                action: 'upsert',
                data: newValue
            };
            
            var logDeleteOperation = {
                tableName: operationTableName,
                action: 'delete',
                data: newValue.id
            }
            
            var operations = [dataUpdateOperation];
            
            if (cancelRecordPush) {
                operations.push(logDeleteOperation);
            }
            
            return store.executeBatch(operations);
        });
    }
    
    /**
     * Deletes the data record associated with the current operation from the local store.
     * 
     * @param {boolean} [cancelRecordPush] Flag specifying whether or not to cancel sending this change (i.e. change
     * associated with this record) to the server. Note that cancelling push only affects this instance of push and 
     * future changes to the record will continue to be pushed to the server.
     * 
     * @returns A promise that is fulfilled when the data record is deleted and optionally, the pending change is cancelled.
     */
    function deleteLocalRecord(cancelRecordPush) {
        return storeTaskRunner.run(function() {
            
            var dataDeleteOperation = {
                tableName: pushOperation.logRecord.tableName,
                action: 'delete',
                data: pushOperation.logRecord.itemId
            };
            
            var logDeleteOperation = {
                tableName: operationTableName,
                action: 'delete',
                data: newValue.id
            }
            
            var operations = [dataDeleteOperation];
            
            if (cancelRecordPush) {
                operations.push(logDeleteOperation);
            }
            
            return store.executeBatch(operations);
        });
    }
    
    /**
     * Changes the type of operation that will be pushed to the server.
     * This is useful for handling conflicts where you might need to change the type of the 
     * operation to be able to push the changes to the server.
     *
     * Example: You might need to change 'insert' to 'update' to be able to push a record that 
     * was already inserted on the server.
     * 
     * Note: Changing the operation type to delete will automatically remove the associated record from the 
     * data table in the local store.
     * 
     * @param newOperationType New type of the operation. Valid values are 'insert', 'update' and 'delete' / 'del'
     * @param [newRecordValue] New value of the record. The new record ID should match the original record ID. Also,
     *                         a new record value cannot be specified if the new operation type is 'delete' / 'del'
     * 
     * @returns A promise that is fulfilled when the operation type is changed and optionally, the data record is updated.
     */
    function changeOperationType(newOperationType, newRecordValue) {
        return storeTaskRunner.run(function() {
            var newDataOperation,
                newLogOperation = {
                    tableName: operationTableName,
                    data: pushOperation.logRecord.itemId
                };
            
            if (newOperationType === 'insert' || newOperationType === 'update') {

                newLogOperation.action = newOperationType;
                if (newRecordValue) {
                    
                    if (!newRecordValue.id) {
                        throw new Error('New record value must specify the record ID');
                    }
                    
                    if (newRecordValue.id !== pushOperation.logRecord.itemId) {
                        throw new Error('New record value cannot change the record ID. Original ID: ' + pushOperation.logRecord.id + ' New ID: ' + 'newRecordValue.id');
                    }
                    
                    newDataOperation = {
                        tableName: pushOperation.logRecord.tableName,
                        action: 'upsert',
                        data: newRecordValue
                    };
                    
                }
                
            } else if (newOperationType === 'delete' || newOperationType === 'del') {

                if (newRecordValue) {
                    throw new Error('Cannot specify a new value for the record if the new operation type is delete');
                }

                newLogOperation.action = 'delete';
                newDataOperation = {
                    tableName: pushOperation.logRecord.tableName,
                    action: 'delete',
                    data: pushOperation.logRecord.id
                };

            } else {
                throw new Error('Operation type ' + newOperationType + ' not supported.');
            }

        });
    }
    
    /**
     * Cancels pushing the current operation to the server permanently.
     * This method simply removes the pending operation from the operation table, thereby 
     * permanently skipping the associated change. A future change done to the same record
     * will not be affected and such changes will continue to be pushed. 
     */
    function cancelRecordPush() {
        return storeTaskRunner.run(function() {
            return store.del(operationTableName, pushOperation.logRecord.id);
        });
    }
}

exports.createPushError = createPushError;
