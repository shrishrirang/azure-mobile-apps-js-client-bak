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
    Query = require('query.js').Query;

var errorType = {
    conflict: 'conflict'
};

function createPushError(store, storeTaskRunner, operationTableManager, pushOperation, pushHandler) {
    
    var type; // type of error. Egs: 'conflict'
    
    function updateRecord(newValue, cancelRecordPush) {
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
                tableName: 
            }
            if (cancelRecordPush) {
                
            }
            
            return store.executeBatch([
                {
                    tableName: pushOperation.logRecord.tableName,
                    action: 'upsert',
                    data: newValue
                }
            ]);
        });
    }
    
    function deleteRecord(cancelRecordPush) {
        return storeTaskRunner.run(function() {
            return store.del(pushOperation.logRecord.tableName, {id: pushOperation.logRecord.itemId});
        });
    }
    
    function cancelRecordPush() {
        return storeTaskRunner.run(function() {
            return operationTableManager.removeLockedOperation();
        });
    }
    
    function deleteRecord() {
        
    }
    
}

exports.createPushError = createPushError;
