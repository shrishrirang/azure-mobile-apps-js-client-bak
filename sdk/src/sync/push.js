// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/**
 * Table push logic implementation
 */

var Validate = require('../Utilities/Validate'),
    Query = require('query.js').Query,
    Platform = require('Platforms/Platform'),
    taskRunner = require('../Utilities/taskRunner'),
    MobileServiceTable = require('../MobileServiceTable'),
    tableConstants = require('../constants').table,
    sysProps = require('../constants').table.sysProps,
    _ = require('../Utilities/Extensions');

function createPushManager(client, store, storeTaskRunner, operationTableManager) {
    // Task runner for running push tasks. We want only one push to run at a time. 
    var pushTaskRunner = taskRunner(),
        lastProcessOperationId;
    
    return {
        push: push
    };

    /**
     * Pushes operations performed on the local store to the server tables.
     * 
     * @returns A promise that is fulfilled when all pending operations are pushed OR is rejected if the push fails or is cancelled.  
     */
    function push() {
        return pushTaskRunner.run(function() {
            reset();
            return pushAllOperations();
        });
    }
    
    // Resets the state for starting a new push operation
    function reset() {
        lastProcessOperationId = -1; // Initialize to an invalid operation id
    }
    
    // Pushes all pending operations, one at a time.
    // 1. Read the oldest pending operation
    // 2. Lock the operation obtained in step 1. If 1 did not fetch any operation, we are done push is complete.
    // 3. Push the operation obtained in step 1.
    // 4. If 3 is successful, remove the locked operation from the operation table. Else FIXME: TBD
    // 5. Go to 1. 
    function pushAllOperations() {
        return readAndLockFirstPendingOperation().then(function(pendingOperation) {
            if (!pendingOperation) {
                return; // No more pending operations. Push is complete
            }
            
            return pushOperation(pendingOperation).then(function() {
                return removeLockedOperation();
            }, function(error) {
                // failed to push
                // FIXME: Handle errors / conflicts
                
                return unlockPendingOperation().then(function() {
                    throw error;
                });
            }).then(function() {
                return pushAllOperations(); // push remaining operations
            });
        });
    }
    
    function readAndLockFirstPendingOperation() {
        return storeTaskRunner.run(function() {
            var pendingOperation;
            return operationTableManager.readFirstPendingOperationWithData(lastProcessOperationId).then(function(operation) {
                pendingOperation = operation;
                
                if (!pendingOperation) {
                    return;
                }
                
                lastProcessOperationId = operation.logRecord.id;
                return operationTableManager.lockOperation(pendingOperation.logRecord.id);
            }).then(function() {
                return pendingOperation;
            });
        });
    }
    
    function unlockPendingOperation() {
        return storeTaskRunner.run(function() {
            return operationTableManager.unlockOperation();
        });
    }
    
    function removeLockedOperation() {
        return storeTaskRunner.run(function() {
            return operationTableManager.removeLockedOperation();
        });
    }
    
    function pushOperation(operation) {
        
        return Platform.async(function(callback) {
            callback();
        })().then(function() {
            // TODO: push request filter
        }).then(function() {
            // perform push

            var mobileServiceTable = client.getTable(operation.logRecord.tableName);
            switch(operation.logRecord.action) {
                case 'insert':
                    removeSysProps(operation.data); // We need to remove system properties before we insert in the server table
                    return mobileServiceTable.insert(operation.data).then(function(result) {
                        store.upsert(operation.logRecord.tableName, result); // Upsert the result of insert into the local table
                    });
                case 'update':
                    return mobileServiceTable.update(operation.data).then(function(result) {
                        store.upsert(operation.logRecord.tableName, result); // Upsert the result of update into the local table
                    });
                case 'delete':
                    return mobileServiceTable.del({id: operation.logRecord.itemId});
                default:
                    throw new Error('Unsupported action ' + operation.logRecord.action);
            }
            
        }).then(function() {
            // TODO: push response filter
        });
        
    }
    
    function removeSysProps(record) {
        for (var i in sysProps) {
            delete record[sysProps[i]];
        }
    }
}

exports.createPushManager = createPushManager;
