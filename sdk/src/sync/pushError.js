// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/**
 * @file Table push error handling implementation. Defines various methods for resolving conflicts
 */

var Platform = require('Platforms/Platform'),
    _ = require('../Utilities/Extensions'),
    tableConstants = require('../constants').table;
    
var operationTableName = tableConstants.operationTableName,
    deletedColumnName = tableConstants.sysProps.deletedColumnName;

/**
 * Creates a pushError object that wraps the low level error encountered while pushing
 * and adds other useful methods for error handling.
 */
function createPushError(store, storeTaskRunner, pushOperation, operationError) {
    
    return {
        isHandled: false,
        getError: getError,
        
        // Helper methods
        isConflict: isConflict,
        
        // Data query methods
        getTableName: getTableName,
        getAction: getAction,
        getServerRecord: getServerRecord,
        getClientRecord: getClientRecord,
        
        // Error handling methods
        cancelAndUpdate: cancelAndUpdate,
        cancelAndDiscard: cancelAndDiscard,
        cancel: cancel,
        update: update,
        changeAction: changeAction
    };
    
    /**
     * Get the name of the table for which push was performed
     */
    function getTableName() {
        return makeCopy(pushOperation.logRecord.tableName);
    }
    
    /**
     * Gets the action that was pushed to the server.
     * Action can be one of 'insert', 'update' or 'delete'.
     */
    function getAction() {
        return makeCopy(pushOperation.logRecord.action);
    }
    
    /**
     * Gets the value of the server record, if available.
     * **NOTE** Value of the server record may not be available always.
     * Example: If the push failed due to a connection error, the value of server
     * record won't be available.
     */
    function getServerRecord() {
        return makeCopy(operationError.serverInstance);
    }
    
    /**
     * Gets the value of the client record that was sent to the server.
     * Note that this may not be the latest value.
     */
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
        return operationError.request.status === 409 || operationError.request.status === 412;
    }
    
    /**
     * Cancels the push operation for the current record and updates the record in the local store.
     * 
     * @param newValue New value of the client record that will be updated in the local store.
     * 
     * @returns A promise that is fulfilled when the operation is cancelled and the client record is updated.
     */
    function cancelAndUpdate(newValue) {
        var self = this;
        return storeTaskRunner.run(function() {

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
                id: pushOperation.logRecord.id
            };
            
            // Execute the log and data operations
            var operations = [dataUpdateOperation, logDeleteOperation];
            return store.executeBatch(operations).then(function() {
                self.isHandled = true;
            });
        });
    }
    
    /**
     * Cancels the push operation for the current record and discards the record from the local store.
     * 
     * @returns A promise that is fulfilled when the operation is cancelled and the client record is discarded.
     */
    function cancelAndDiscard() {
        var self = this;
        return storeTaskRunner.run(function() {
            
            // Operation to delete the data record
            var dataDeleteOperation = {
                tableName: pushOperation.logRecord.tableName,
                action: 'delete',
                id: pushOperation.logRecord.itemId
            };
            
            // Operation to delete the log record
            var logDeleteOperation = {
                tableName: operationTableName,
                action: 'delete',
                id: pushOperation.logRecord.id
            };
            
            // Execute the log and data operations
            var operations = [dataDeleteOperation, logDeleteOperation];
            return store.executeBatch(operations).then(function() {
                self.isHandled = true;
            })
        });
    }
    
    /**
     * Updates the client data record associated with the current operation.
     *
     * @param newValue New value of the data record. 
     * 
     * @returns A promise that is fulfilled when the data record is updated in the localstore.
     */
    function update(newValue) {
        var self = this;
        return storeTaskRunner.run(function() {
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

            //TODO: Do we need to disallow updating record if the record has been deleted after
            //we attempted push?
                        
            return store.upsert(pushOperation.logRecord.tableName, newValue).then(function() {
                self.isHandled = this;
            })
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
     * @param newAction New type of the operation. Valid values are 'insert', 'update' and 'delete'
     * @param [newClientRecord] New value of the client record. The new record ID should match the original record ID. Also,
     *                         a new record value cannot be specified if the new action is 'delete'
     * 
     * @returns A promise that is fulfilled when the action is changed and, optionally, the data record is updated / deleted.
     */
    function changeAction(newAction, newClientRecord) {
        var self = this;
        return storeTaskRunner.run(function() {
            var dataOperation, // operation to edit the data record
                logOperation = { // operation to edit the log record 
                    tableName: operationTableName,
                    action: 'upsert',
                    data: makeCopy(pushOperation.logRecord)
                };
            
            if (newAction === 'insert' || newAction === 'update') {
                
                // Change the action as specified
                logOperation.data.action = newAction;
                
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
                logOperation.data.action = 'delete';
                
                // Delete the client record as the new action is 'delete'
                dataOperation = {
                    tableName: pushOperation.logRecord.tableName,
                    action: 'delete',
                    id: pushOperation.logRecord.id
                };

            } else {
                throw new Error('Action ' + newAction + ' not supported.');
            }
            
            // Execute the log and data operations
            var operations = dataOperation ? [logOperation, dataOperation] : [logOperation];
            return store.executeBatch(operations).then(function() {
                self.isHandled = true;
            });
        });
    }
    
    /**
     * Cancels pushing the current operation to the server permanently.
     * 
     * This method simply removes the pending operation from the operation table, thereby 
     * permanently skipping the associated change. A future change done to the same record
     * will not be affected and such changes will continue to be pushed. 
     */
    function cancel() {
        var self = this;
        return storeTaskRunner.run(function() {
            return store.del(operationTableName, pushOperation.logRecord.id).then(function() {
                self.isHandled = true;
            });
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
        
        if (pushError.isConflict()) {
            if (pushHandler && pushHandler.onConflict) {
                // NOTE: value of server record will not be available in case of 409.
                return pushHandler.onConflict(pushError.getServerRecord(), pushError.getClientRecord(), pushError);
            }
        } else if (pushHandler && pushHandler.onError) {
            return pushHandler.onError(pushError);
        }

    }).then(undefined, function(error) {
        // Set isHandled to false even if the user has set it to handled if the onConflict / onError failed 
        pushError.isHandled = false;
    });
}

exports.createPushError = createPushError;
exports.handlePushError = handlePushError;
