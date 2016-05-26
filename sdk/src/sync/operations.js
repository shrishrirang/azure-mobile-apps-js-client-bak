// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/**
 * @file Implements operation table management functions like defining the operation table,
 * adding log operations to the operation table, condensing operations, etc
 */

var Validate = require('../Utilities/Validate'),
    Platform = require('Platforms/Platform'),
    ColumnType = require('./ColumnType'),
    taskRunner = require('../Utilities/taskRunner'),
    _ = require('../Utilities/Extensions'),
    Query = require('query.js').Query;

var operationTableName = '__operations';
    
function createOperationTableManager(store) {

    Validate.isObject(store);
    Validate.notNull(store);

    var runner = taskRunner(),
        isInitialized,
        maxOperationId = 0,
        lockedOperationId;

    return operationTableManager = {
        initialize: initialize,
        lockOperation: lockOperation,
        unlockOperation: unlockOperation,
        readPendingOperations: readPendingOperations,
        getLoggingOperation: getLoggingOperation
    };
    
    /**
     * Defines the operation table in the local store.
     * Schema of the operation table is: [ INT id | TEXT tableName | TEXT action | TEXT itemId ]
     * If the table already exists, it will have no effect.
     * @param localStore The local store to create the operation table in.
     * @returns A promise that is resolved when initialization is complete and rejected if it fails.
     */
    function initialize () {
        return store.defineTable({
            name: operationTableName,
            columnDefinitions: {
                id: ColumnType.Integer,
                tableName: ColumnType.String,
                action: ColumnType.String,
                itemId: ColumnType.String
            }
        }).then(function() {
            return getMaxOperationId();
        }).then(function(id) {
            maxId = id;
            isInitialized = true;
        });
    }
    
    /**
     * Locks the operation with the specified id.
     * 
     * TODO: Lock state and the value of the locked operation should be persisted.
     * That way we can handle the following scenario: insert -> initiate push -> connection failure after item inserted in server table
     * -> client crashes or cancels push -> client app starts again -> delete -> condense. 
     * In the above scenario if we condense insert and delete into nothing, we end up not deleting the item we sent to server.
     * And if we do not condense, insert will have no corresponding data in the table to send to the server while pushing as 
     * the record would have been deleted.
     */
    function lockOperation(id) {
        
        // Locking a locked operation should have no effect
        if (lockedOperationId === id) {
            return;
        }
        
        if (!lockedOperationId) {
            lockedOperationId = id;
            return;
        }

        throw new Error('Only one operation can be locked at a time');
    }
    
    /**
     * Unlock the locked operation
     */
    function unlockOperation() {
        lockedOperationId = undefined;
    }
    
    /**
     * Checks if the specified operation is locked
     */
    function isLocked(operation) {
        return operation && operation.id === lockedOperationId;
    }

    /**
     * Given an operation that will be performed on the store, this method returns a corresponding operation for recording it in the operation table.
     * The logging operation can add a new record, edit an earlier record or remove an earlier record from the operation table.
     * 
     * @param tableName Name of the table on which the action is performed
     * @param action Action performed on the table. Valid actions are 'insert', 'update' or 'delete'
     * @param itemId ID of the record that is being inserted, updated or deleted.
     * 
     * @returns Promise that is resolved with the logging operation. In case of a failure the promise is rejected.
     */
    function getLoggingOperation(tableName, action, itemId) {
        
        // Run as a single task to avoid task interleaving.
        return runner.run(function() {
            Validate.notNull(tableName);
            Validate.isString(tableName);
            
            Validate.notNull(action);
            Validate.isString(action);
            
            Validate.isValidId(itemId);
            
            if (!isInitialized) {
                throw new Error('Operation table manager is not initialized');
            }
            
            return readPendingOperations(tableName, itemId).then(function(pendingOperations) {
                
                // Multiple operations can be pending for <tableName, itemId> due to an opertion being locked in the past.
                // Get the last pending operation
                var pendingOperation = pendingOperations.pop(),
                    condenseAction;
                
                // If the operation table has a pending operation, we attempt to condense the new action into the pending operation.
                // If not, we simply add a new operation.
                if (pendingOperation) {
                    condenseAction = getCondenseAction(pendingOperation, action);
                } else {
                    condenseAction = 'add';
                }

                if (condenseAction === 'add') { // Add a new operation
                    return insertLoggingOperation(tableName, action, itemId);
                } else if (condenseAction === 'modify') { // Edit the pending operation's action to be the new action.
                    return updateLoggingOperation(pendingOperation.id, action /* new action */);
                } else if (condenseAction === 'remove') { // Remove the earlier log from the operation table
                    return deleteLoggingOperation(pendingOperation.id);
                } else if (condenseAction === 'nop') { // NO OP. Nothing to be logged
                    return; 
                } else  { // Error
                    throw new Error('Unknown condenseAction: ' + condenseAction);
                }
            });
        });
    }
    
    /**
     * Reads the pending operations for the specified table and item / record ID from the operation table.
     * @param tableName Name of the table whose operations we are looking for
     * @param itemId ID of the record whose operations we are looking for 
     */
    function readPendingOperations(tableName, itemId) {
        return Platform.async(function(callback) {
            callback();
        })().then(function() {
            var query = new Query(operationTableName);
            return store.read(query.where(function (tableName, itemId) {
                return this.tableName === tableName && this.itemId === itemId;
            }, tableName, itemId).orderBy('id'));
        });
    }

    /**
     * Determines how to condense the new action into the pending operation
     * @returns 'nop' - if no action is needed
     *          'remove' - if the pending operation should be removed
     *          'modify' - if the pending action should be modified to be the new action
     *          'add' - if a new operation should be added
     */
    function getCondenseAction(pendingOperation, newAction) {
        
        var pendingAction = pendingOperation.action,
            condenseAction;
        if (pendingAction === 'insert' && newAction === 'update') {
            condenseAction = 'nop';
        } else if (pendingAction === 'insert' && newAction === 'delete') {
            condenseAction = 'remove';
        } else if (pendingAction === 'update' && newAction === 'update') {
            condenseAction = 'nop';
        } else if (pendingAction === 'update' && newAction === 'delete') {
            condenseAction = 'modify';
        } else if (pendingAction === 'delete' && newAction === 'delete') {
            condenseAction = 'nop';
        } else if (pendingAction === 'delete') {
            throw new Error('Operation ' + newAction + ' not supported as a DELETE operation is pending'); //TODO: Limitation on all client SDKs
        } else {
            throw new Error('Condense not supported when pending action is ' + pendingAction + ' and new action is ' + newAction);
        }
        
        if (isLocked(pendingOperation)) {
            condenseAction = 'add';
        }
        
        return condenseAction;
    }
    
    /**
     * Gets the operation that will insert a new record in the operation table.
     */
    function insertLoggingOperation(tableName, action, itemId) {
        return {
            tableName: operationTableName,
            action: 'upsert',
            data: {
                id: ++maxId,
                tableName: tableName,
                action: action,
                itemId: itemId
            }
        };
    }
    
    /**
     * Gets the operation that will update an existing record in the operation table.
     */
    function updateLoggingOperation(id, action) {
        return {
            tableName: operationTableName,
            action: 'upsert',
            data: {
                id: id,
                action: action
            }
        };
    }
    
    /**
     * Gets an operation that will delete a record from the operation table.
     */
    function deleteLoggingOperation(id) {
        return {
            tableName: operationTableName,
            action: 'delete',
            id: id
        };
    }

    /**
     * Gets the largest operation ID from the operation table
     * If there are no records in the operation table, returns 0.
     */
    function getMaxOperationId() {
        var query = new Query(operationTableName);
        return store.read(query.orderByDescending('id').take(1)).then(function(result) {
            Validate.isArray(result);
            
            if (result.length === 0) {
                return 0;
            } else if (result.length === 1) {
                return result[0].id;
            } else {
                throw new Error('something is wrong!');
            }
        });
    }
}

module.exports = {
    createOperationTableManager: createOperationTableManager
};
// exports for unit testing
module.exports._operationTableName = operationTableName;
