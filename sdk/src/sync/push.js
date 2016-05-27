// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/**
 * Table pull logic implementation
 */

var Validate = require('../Utilities/Validate'),
    Query = require('query.js').Query,
    Platform = require('Platforms/Platform'),
    taskRunner = require('../Utilities/taskRunner'),
    MobileServiceTable = require('../MobileServiceTable'),
    _ = require('../Utilities/Extensions');

function createPushManager(client, operationTableManager) {
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
    
    function pushAllOperations() {
        return operationTableManager.getFirstPendingOperation().then(function(pendingOperation) {
            if (!pendingOperation) {
                return; // No more pending operations. Push is complete
            }
            
            return pushOperation(pendingOperation).then(function() {
                return operationTableManager.removePendingOperation(pendingOperation.logRecord.id);
            }, function(error) {
                // failed to push
                throw error; // Handle this - FIXME
            }).then(function() {
                return pushAllOperations();
            });
        });
    }
    
    function pushOperation(operation) {
        var mobileServiceTable = client.getTable(operation.logRecord.tableName);
        
        switch(operation.logRecord.action) {
            case 'insert':
                // FIXME: remove sys properties for insert to work
                return mobileServiceTable.insert(operation.data);
            case 'update':
                return mobileServiceTable.update(operation.data);
            case 'delete':
                return mobileServiceTable.del(operation.data);
            default:
                throw new Erorr('Unsupported action ' + operation.logRecord.action);
        }
    }
}

exports.createPushManager = createPushManager;
