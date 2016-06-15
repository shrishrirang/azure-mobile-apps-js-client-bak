// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/**
 * Table push logic implementation
 */

var Validate = require('../Utilities/Validate'),
    Query = require('query.js').Query,
    verror = require('verror'),
    Platform = require('Platforms/Platform'),
    taskRunner = require('../Utilities/taskRunner'),
    MobileServiceTable = require('../MobileServiceTable'),
    tableConstants = require('../constants').table,
    sysProps = require('../constants').table.sysProps,
    createPushError = require('./pushError').createPushError,
    handlePushError = require('./pushError').handlePushError,
    _ = require('../Utilities/Extensions');

function createPushManager(client, store, storeTaskRunner, operationTableManager) {
    // Task runner for running push tasks. We want only one push to run at a time. 
    var pushTaskRunner = taskRunner(),
        lastProcessedOperationId,
        pushConflicts,
        depChain,
        pushHandler;
    
    return {
        push: push
    };

    /**
     * Pushes operations performed on the local store to the server tables.
     * 
     * @returns A promise that is fulfilled when all pending operations are pushed. Conflict errors won't fail the push operation.
     *          All conflicts are collected and returned to the user at the completion of the push operation. 
     *          The promise is rejected if pushing any record fails for reasons other than conflict or is cancelled.
     */
    function push(handler, relationships) {

        relationships = {
            tablea: ['tableb', 'tabled'],
            tableb: [],
            tablec: ['tabled'],
            tabled: []
        }

        return pushTaskRunner.run(function() {
            reset();
            pushHandler = handler;

            depChain = getTableDependencyChain(relationships);

            return pushAllOperations().then(function() {
                return pushConflicts;
            });
        });
    }

    function getNode(nodes, name) {
        if (!nodes[name]) {
            nodes[name] = {
                name: name,
                children: []
            };
        }

        return nodes[name];
    }

    function getRelationshipGraph(relationships) {

        var nodes = {};

        for (var source in relationships) {
            var destinations = relationships[source];

            var sourceNode = getNode(nodes, source);
            
            for (var i in destinations) {
                var destination = destinations[i];
                var destinationNode = getNode(nodes, destination);
                sourceNode.children.push(destinationNode);
            }
        }

        return nodes;
    }

    // chain[x] does not depend on any chain[y], where y >= x
    function getTableDependencyChain(relationships) {

        var nodes = getRelationshipGraph(relationships);

        var chain = [];
        for (var i in nodes) {
            var node = nodes[i];

            traverse(node, chain);
        }

        return chain;
    }

    function traverse(node, chain) {
        if (node.visited) {
            return;
        }

        if (node.processing) {
            throw new Error('loop detected');
        }

        node.processing = true;

        for (var i in node.children) {
            var child = node.children[i];
            traverse(child, chain);
        }

        chain.push(node);
        node.processing = false;
        node.visited = true;
    }
    
    // Resets the state for starting a new push operation
    function reset() {
        lastProcessedOperationId = -1; // Initialize to an invalid operation id
        pushConflicts = [];
        nodes = {};
    }
    
    // Pushes all pending operations, one at a time.
    // 1. Read the oldest pending operation
    // 2. If 1 did not fetch any operation, go to 6.
    // 3. Lock the operation obtained in step 1 and push it.
    // 4. If 3 is successful, unlock and remove the locked operation from the operation table and go to 1
    //    Else if 3 fails, unlock the operation.
    // 5. If the error is a conflict, handle the conflict and go to 1.
    // 6. Else, EXIT.
    function pushAllOperations() {
        var currentOperation,
            pushError;
        return readAndLockFirstPendingOperation().then(function(pendingOperation) {
            if (!pendingOperation) {
                return; // No more pending operations. Push is complete
            }
            
            var currentOperation = pendingOperation;
            
            return pushOperation(currentOperation).then(function() {
                return removeLockedOperation();
            }, function(error) {
                // failed to push
                return unlockPendingOperation().then(function() {
                    pushError = createPushError(store, storeTaskRunner, currentOperation, error);
                    //TODO: If the conflict isn't resolved but the error is marked as handled by the user,
                    //we can end up in an infinite loop. Guard against this by capping the max number of 
                    //times handlePushError can be called for the same record.
                    return handlePushError(pushError, pushHandler);
                });
            }).then(function() {
                if (!pushError) { // no push error
                    currentOperation.node.lastProcessedOperationId = currentOperation.logRecord.id;
                } else if (pushError && !pushError.isHandled) { // push failed and not handled

                    // For conflict errors, we add the error to the list of errors and continue pushing other records
                    // For other errors, we abort push.
                    if (pushError.isConflict()) {
                        currentOperation.node.lastProcessedOperationId = currentOperation.logRecord.id;
                        pushConflicts.push(pushError);
                    } else { 
                        throw new verror.VError(pushError.getError(), 'Push failed while pushing operation for tableName : ' + currentOperation.logRecord.tableName +
                                                                 ', action: ' + currentOperation.logRecord.action +
                                                                 ', and record ID: ' + currentOperation.logRecord.itemId);
                    }
                } else { // push error handled
                    // No action needed - We want the operation to be re-pushed.
                    // No special handling is needed even if the operation was cancelled by the user as part of error handling  
                }
            }).then(function() {
                return pushAllOperations(); // push remaining operations
            });
        });
    }
    
    function readAndLockFirstPendingOperation() {
        return storeTaskRunner.run(function() {
            var pendingOperation;
            return operationTableManager.readFirstPendingOperationWithData(depChain).then(function(operation) {
                pendingOperation = operation;
                
                if (!pendingOperation) {
                    return;
                }
                
                return operationTableManager.lockOperation(pendingOperation.logRecord);
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
            // TODO: Invoke push request filter to allow user to change how the record is sent to the server
        }).then(function() {
            // perform push

            var mobileServiceTable = client.getTable(operation.logRecord.tableName);
            switch(operation.logRecord.action) {
                case 'insert':
                    removeSysProps(operation.data); // We need to remove system properties before we insert in the server table
                    return mobileServiceTable.insert(operation.data).then(function(result) {
                        return store.upsert(operation.logRecord.tableName, result); // Upsert the result of insert into the local table
                    });
                case 'update':
                    return mobileServiceTable.update(operation.data).then(function(result) {
                        return store.upsert(operation.logRecord.tableName, result); // Upsert the result of update into the local table
                    });
                case 'delete':
                    return mobileServiceTable.del({id: operation.logRecord.itemId});
                default:
                    throw new Error('Unsupported action ' + operation.logRecord.action);
            }
            
        }).then(function() {
            // TODO: Invoke hook to notify record push completed successfully
        });
        
    }
    
    function removeSysProps(record) {
        for (var i in sysProps) {
            delete record[sysProps[i]];
        }
    }
}

exports.createPushManager = createPushManager;
