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
    sysProps = require('../constants').table.sysProps,
    _ = require('../Utilities/Extensions');

function createPushManager(client, store, storeTaskRunner, operationTableManager) {
    // Task runner for running push tasks. We want only one push to run at a time. 
    var pushTaskRunner = taskRunner();
    
    return {
        push: push
    };

    function push() {
        return pushTaskRunner.run(function() {
            return pushAllOperations();
        });
    }
    
    // Pushes all pending operations, one at a time.
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
                
                return unlockPendingOperation.then(function() {
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
            return operationTableManager.readFirstPendingOperationWithData().then(function(operation) {
                pendingOperation = operation;
                
                if (!pendingOperation) {
                    return;
                }
                
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
                throw new Erorr('Unsupported action ' + operation.logRecord.action);
        }
    }
    
    function removeSysProps(record) {
        for (var i in sysProps) {
            delete record[sysProps[i]];
        }
    }
}

exports.createPushManager = createPushManager;
