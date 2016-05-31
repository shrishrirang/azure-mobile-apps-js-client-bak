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
    
    return {
        isHandled: false,
        error: operationError,
        handleError: handleError,
        getErrorType: getErrorType,
        isConflict: isConflict,
        updateRecord: updateRecord,
        deleteRecord: deleteRecord,
        cancelRecordPush: cancelRecordPush
    };
    
    function handleError() {
        return Platform.async(function(callback) {
            callback();
        })().then(function() {
            
            if (pushHandler && pushHandler.onRecordPushError) {
                return pushHandler.onRecordPushError(operationError, 
                                                     pushOperation.logRecord.tableName,
                                                     pushOperation.logRecord.action,
                                                     pushOperation.logRecord.data /* this will be undefined for delete operations */);
            }
        });
    }
    
    function getErrorType() {
        return type;
    }
    
    function isConflict() {
        return error.request.status === 412;
    }
    
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
    
    function deleteRecord(cancelRecordPush) {
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
    
    function cancelRecordPush() {
        return storeTaskRunner.run(function() {
            return store.del(pushOperation.logRecord.tableName, pushOperation.logRecord.itemId);
        });
    }
}

exports.createPushError = createPushError;
