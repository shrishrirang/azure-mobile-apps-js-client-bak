// ----------------------------------------------------------------------------
// right (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/**
 * @file Table push error handling implementation. Defines various methods for resolving conflicts
 */

// TODO: All conflict resolution methods should check that data hasn't changed and it is safe to modify the state
// of the operation table / data table.

var Platform = require('Platforms/Platform'),
    _ = require('../Utilities/Extensions'),
    operationTableName = require('../constants').table.operationTableName;

/**
 * Creates a pushError object that wraps the low level error encountered while pushing
 * and adds other useful methods for error handling.
 */
function createPushError(store, storeTaskRunner, pushOperation, operationError) {
    
    return {
        // Properties
        isHandled: false,

        // Methods        
        getTableName: getTableName,
        getAction: getAction,
        getServerRecord: getServerRecord,
        getClientRecord: getClientRecord,
        getError: getError,
        isConflict: isConflict,
        updateClientRecord: updateClientRecord,
        deleteClientRecord: deleteClientRecord,
        cancelRecordPush: cancelRecordPush,
        changeAction: changeAction
    };
    
    function getTableName() {
        return makeCopy(pushOperation.logRecord.tableName);
    }
    
    function getAction() {
        return makeCopy(pushOperation.logRecord.action);
    }
    
    function getServerRecord() {
        return makeCopy(operationError.serverInstance);
    }
    
    // client value sent to the server. This may not be the latest value.
    function getClientRecord() {
        return makeCopy(pushOperation.data);
    }
    
    /**
     * Gets the underlying error.
     * This contains grannular details about the failure. Egs: server response, etc
     */
    function getError() {
        return makeCopy(operationError);
    }
    
    /**
     * Checks if the current error is a conflict error.
     * @returns true - if the current error is a conflict error. false - otherwise.
     */
    function isConflict() {
        return operationError.request.status === 412;
    }
    
    /**
     * Updates the data record associated with the current operation in the local store.
     *
     * @param newValue New value of the data record. Note that the new record cannot change the ID. 
     * @param {boolean} [cancelRecordPush] Flag specifying whether or not to cancel sending this operation (i.e. changes
     * associated with this record since the last push) to the server. Note that cancelling push only affects this instance of push and 
     * future changes to the record will continue to be pushed to the server.
     * 
     * @returns A promise that is fulfilled when the data record is updated and, optionally, the pending change is cancelled.
     */
    function updateClientRecord(newValue, cancelRecordPush) {
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
            
            // Operation to update the data record
            var dataUpdateOperation = {
                tableName: pushOperation.logRecord.tableName,
                action: 'upsert',
                data: newValue
            };
            
            // Operation to delete the log record
            var logDeleteOperation = {
                tableName: operationTableName,
                action: 'delete',
                data: newValue.id
            }
            
            // Execute the log and data operations
            var operations = cancelRecordPush ? [dataUpdateOperation, logDeleteOperation] : [dataUpdateOperation];
            return store.executeBatch(operations);
        });
    }
    
    /**
     * Deletes the data record associated with the current operation from the local store.
     * 
     * @param {boolean} [cancelRecordPush] Flag specifying whether or not to cancel sending this operation (i.e. changes
     * associated with this record since the last push) to the server. Note that cancelling push only affects this instance of push and 
     * future changes to the record will continue to be pushed to the server.
     * 
     * @returns A promise that is fulfilled when the data record is deleted and, optionally, the pending change is cancelled.
     */
    function deleteClientRecord(cancelRecordPush) {
        return storeTaskRunner.run(function() {
            
            // Operation to delete the data record
            var dataDeleteOperation = {
                tableName: pushOperation.logRecord.tableName,
                action: 'delete',
                data: pushOperation.logRecord.itemId
            };
            
            // Operation to delete the log record
            var logDeleteOperation = {
                tableName: operationTableName,
                action: 'delete',
                data: newValue.id
            }
            
            // Execute the log and data operations
            var operations = cancelRecordPush ? [dataDeleteOperation, logDeleteOperation] : [dataDeleteOperation];
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
     * Note: Changing the action to delete will automatically remove the associated record from the 
     * data table in the local store.
     * 
     * @param newAction New type of the operation. Valid values are 'insert', 'update' and 'delete' / 'del'
     * @param [newClientRecord] New value of the client record. The new record ID should match the original record ID. Also,
     *                         a new record value cannot be specified if the new action is 'delete' / 'del'
     * 
     * @returns A promise that is fulfilled when the action is changed and, optionally, the data record is updated / deleted.
     */
    function changeAction(newAction, newClientRecord) {
        return storeTaskRunner.run(function() {
            var dataOperation, // operation to edit the data record
                logOperation = { // operation to edit the log record 
                    tableName: operationTableName,
                    data: pushOperation.logRecord.itemId
                };
            
            if (newAction === 'insert' || newAction === 'update') {
                
                // Change the action as specified
                logOperation.action = newAction;
                
                // Update the client record, if a new value is specified
                if (newClientRecord) {
                    
                    if (!newClientRecord.id) {
                        throw new Error('New client record value must specify the record ID');
                    }
                    
                    if (newClientRecord.id !== pushOperation.logRecord.itemId) {
                        throw new Error('New client record value cannot change the record ID. Original ID: ' + pushOperation.logRecord.id + ' New ID: ' + newClientRecord.id);
                    }
                    
                    dataOperation = {
                        tableName: pushOperation.logRecord.tableName,
                        action: 'upsert',
                        data: newClientRecord
                    };
                    
                }
                
            } else if (newAction === 'delete' || newAction === 'del') {

                if (newClientRecord) {
                    throw new Error('Cannot specify a new value for the client record if the new action is delete');
                }

                // Change the action to 'delete'
                logOperation.action = 'delete';
                
                // Delete the client record as the new action is 'delete'
                dataOperation = {
                    tableName: pushOperation.logRecord.tableName,
                    action: 'delete',
                    data: pushOperation.logRecord.id
                };

            } else {
                throw new Error('Action ' + newAction + ' not supported.');
            }
            
            // Execute the log and data operations
            var operations = dataOperation ? [logOperation, dataOperation] : [logOperation];
            return store.executeBatch(operations);
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

function makeCopy(value) {
    if (!_.isNull(value)) {
        value = JSON.parse( JSON.stringify(value) );
    }
    return value;
}

/**
 * Attempts error handling by delegating it to the user, if a push handler is provided
 */
function handlePushError(pushError, pushHandler) {
    return Platform.async(function(callback) {
        callback();
    })().then(function() {
        
        // Check if a handler is provided for errors encountered while pushing records
        if (pushHandler && pushHandler.onRecordPushError) {
            //TODO: Parameter value should be a  and not the original value as it can be changed accidentally
            return pushHandler.onRecordPushError(pushError);
        }
    });
}

exports.createPushError = createPushError;
exports.handlePushError = handlePushError;
