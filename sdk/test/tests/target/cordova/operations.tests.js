// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/**
 * @file unit tests for the 'operations' module
 */

var Platform = require('Platforms/Platform'),
    Query = require('query.js').Query,
    operations = require('../../../../src/sync/operations'),
    MobileServiceSqliteStore = require('Platforms/MobileServiceSqliteStore'),
    storeTestHelper = require('./storeTestHelper');
    
var createOperationTableManager = operations.createOperationTableManager,
    operationTableName = operations._operationTableName,
    store;

$testGroup('operations tests')

    // Clear the store before running each test.
    .beforeEachAsync(function() {
        return storeTestHelper.createEmptyStore().then(function(emptyStore) {
            store = emptyStore;
        }).then(function() {
            return store.defineTable({
                name: storeTestHelper.testTableName,
                columnDefinitions: {
                    id: MobileServiceSqliteStore.ColumnType.String
                }
            })
        });
    }).tests(

    $test('verify initialization')
    .checkAsync(function () {
        var operationTableManager = createOperationTableManager(store);
        
        return operationTableManager.initialize().then(function() {
            return store.read(new Query(operationTableName));
        }).then(function(result) {
            $assert.areEqual(result, []);
        }, function(error) {
            $assert.fail(error);
        });
    }),
    
    $test('basic logging')
    .checkAsync(function () {
        var operationTableManager = createOperationTableManager(store),
            itemId = 'abc';
        
        return operationTableManager.initialize().then(function() {
            return operationTableManager.getLoggingOperation(storeTestHelper.testTableName, 'insert', itemId);
        }).then(function(op) {
            return store.executeBatch([op]);
        }).then(function() {
            return operationTableManager.readPendingOperations(storeTestHelper.testTableName, itemId);
        }).then(function(result) {
            $assert.areEqual(result, [
                {
                    action: 'insert',
                    id: 1,
                    itemId: itemId,
                    tableName: storeTestHelper.testTableName
                }
            ]);
        }, function(error) {
            $assert.fail(error);
        });
    }),
    
    $test('operation ID generation')
    .checkAsync(function () {
        var operationTableManager = createOperationTableManager(store),
            itemId1 = 'abc',
            itemId2 = 'def';
        
        return operationTableManager.initialize().then(function() {
            return operationTableManager.getLoggingOperation(storeTestHelper.testTableName, 'insert', itemId1); // insert item1
        }).then(function(op) {
            return store.executeBatch([op]);
        }).then(function() {
            return operationTableManager.readPendingOperations(storeTestHelper.testTableName, itemId1);
        }).then(function(result) {
            $assert.areEqual(result, [
                {
                    action: 'insert',
                    id: 1,
                    itemId: itemId1,
                    tableName: storeTestHelper.testTableName
                }
            ]);
        }).then(function() {
            return operationTableManager.getLoggingOperation(storeTestHelper.testTableName, 'delete', itemId1); // delete item1
        }).then(function(op) {
            return store.executeBatch([op]);
        }).then(function() {
            return operationTableManager.getLoggingOperation(storeTestHelper.testTableName, 'insert', itemId1); // insert item1
        }).then(function(op) {
            return store.executeBatch([op]);
        }).then(function() {
            return operationTableManager.readPendingOperations(storeTestHelper.testTableName, itemId1);
        }).then(function(result) {
            $assert.areEqual(result, [
                {
                    action: 'insert',
                    id: 2,
                    itemId: itemId1,
                    tableName: storeTestHelper.testTableName
                }
            ]);
        }).then(function() {
            operationTableManager = createOperationTableManager(store); // create new instance of operation table manager
            return operationTableManager.initialize();
        }).then(function() {
            return operationTableManager.getLoggingOperation(storeTestHelper.testTableName, 'insert', itemId2); // insert item1
        }).then(function(op) {
            return store.executeBatch([op]);
        }).then(function() {
            return operationTableManager.readPendingOperations(storeTestHelper.testTableName, itemId2);
        }).then(function(result) {
            $assert.areEqual(result, [
                {
                    action: 'insert',
                    id: 3,
                    itemId: itemId2,
                    tableName: storeTestHelper.testTableName
                }
            ]);
        }, function(error) {
            $assert.fail(error);
        });
    }),
    
    // Successful operation sequences starting with insert..
     
    $test('getLoggingOperation insert')
    .checkAsync(function () {
        return performActionsAndVerifySuccess(['insert'], [
            {id: 1, action: 'insert'}
        ]);
    }),
    
    $test('getLoggingOperation insert, update')
    .checkAsync(function () {
        return performActionsAndVerifySuccess(['insert', 'update'], [
            {id: 1, action: 'insert'}
        ]);
    }),
    
    $test('getLoggingOperation insert, delete')
    .checkAsync(function () {
        return performActionsAndVerifySuccess(['insert', 'delete'], []);
    }),
    
    $test('getLoggingOperation insert, lock, update')
    .checkAsync(function () {
        return performActionsAndVerifySuccess(['insert', 'lock', 'update'], [
            {id: 1, action: 'insert'},
            {id: 2, action: 'update'},
        ]);
    }),
    
    $test('getLoggingOperation insert, lock, delete')
    .checkAsync(function () {
        return performActionsAndVerifySuccess(['insert', 'lock', 'delete'], [
            {id: 1, action: 'insert'},
            {id: 2, action: 'delete'},
        ]);
    }),
    
    // Successful operation sequences starting with update..
    
    $test('getLoggingOperation update')
    .checkAsync(function () {
        return performActionsAndVerifySuccess(['update'], [
            {id: 1, action: 'update'}
        ]);
    }),
    
    $test('getLoggingOperation update, update')
    .checkAsync(function () {
        return performActionsAndVerifySuccess(['update', 'update'], [
            {id: 1, action: 'update'}
        ]);
    }),
    
    $test('getLoggingOperation update, delete')
    .checkAsync(function () {
        return performActionsAndVerifySuccess(['update', 'delete'], [
            {id: 1, action: 'delete'}
        ]);
    }),
    
    $test('getLoggingOperation update, lock, update')
    .checkAsync(function () {
        return performActionsAndVerifySuccess(['update', 'lock', 'update'], [
            {id: 1, action: 'update'},
            {id: 2, action: 'update'},
        ]);
    }),
    
    $test('getLoggingOperation update, lock, delete')
    .checkAsync(function () {
        return performActionsAndVerifySuccess(['update', 'lock', 'delete'], [
            {id: 1, action: 'update'},
            {id: 2, action: 'delete'},
        ]);
    }),
    
    // Successful operation sequences starting with delete..
    
    $test('getLoggingOperation delete')
    .checkAsync(function () {
        return performActionsAndVerifySuccess(['delete'], [
            {id: 1, action: 'delete'}
        ]);
    }),
    
    $test('getLoggingOperation delete, delete')
    .checkAsync(function () {
        return performActionsAndVerifySuccess(['delete', 'delete'], [
            {id: 1, action: 'delete'}
        ]);
    }),
    
    $test('getLoggingOperation delete, lock, delete')
    .checkAsync(function () {
        return performActionsAndVerifySuccess(['delete', 'lock', 'delete'], [
            {id: 1, action: 'delete'},
            {id: 2, action: 'delete'},
        ]);
    }),
    
    // Failure sequences starting with insert...
    
    $test('getLoggingOperation insert, insert')
    .checkAsync(function () {
        return performActionsAndVerifyError(['insert'], 'insert');
    }),
    
    $test('getLoggingOperation insert, lock, insert')
    .checkAsync(function () {
        return performActionsAndVerifyError(['insert', 'lock'], 'insert');
    }),
    
    // Failure sequences starting with update...
    
    $test('getLoggingOperation update, insert')
    .checkAsync(function () {
        return performActionsAndVerifyError(['update'], 'insert');
    }),
    
    $test('getLoggingOperation update, lock, insert')
    .checkAsync(function () {
        return performActionsAndVerifyError(['update', 'lock'], 'insert');
    }),
    
    // Failure sequences starting with delete...
    
    $test('getLoggingOperation delete, insert')
    .checkAsync(function () {
        return performActionsAndVerifyError(['delete'], 'insert');
    }),
    
    $test('getLoggingOperation delete, update')
    .checkAsync(function () {
        return performActionsAndVerifyError(['delete'], 'update');
    }),
    
    $test('getLoggingOperation delete, lock, insert')
    .checkAsync(function () {
        return performActionsAndVerifyError(['delete', 'lock'], 'insert');
    }),
    
    $test('getLoggingOperation delete, lock, update')
    .checkAsync(function () {
        return performActionsAndVerifyError(['delete', 'lock'], 'update');
    }),
    
    $test('readFirstPendingOperationWithData - insert log operation')
    .checkAsync(function () {
        var operationTableManager = createOperationTableManager(store);
        var logRecord1 = { id: 1001, action: 'update', tableName: storeTestHelper.testTableName, itemId: 'a' },
            logRecord2 = { id: 1,    action: 'insert', tableName: storeTestHelper.testTableName, itemId: 'b' },
            logRecord3 = { id: 2001, action: 'delete', tableName: storeTestHelper.testTableName, itemId: 'dd' },
            data1 = { id: 'a' },
            data2 = { id: 'b' },
            data3 = { id: 'c' };            
            
        return operationTableManager.initialize().then(function() {
            return store.executeBatch([
                { tableName: operationTableName, action: 'upsert', data: logRecord1 },
                { tableName: operationTableName, action: 'upsert', data: logRecord2 },
                { tableName: operationTableName, action: 'upsert', data: logRecord3 },
                { tableName: storeTestHelper.testTableName, action: 'upsert', data: data1 },
                { tableName: storeTestHelper.testTableName, action: 'upsert', data: data2 },
                { tableName: storeTestHelper.testTableName, action: 'upsert', data: data3 }
            ]);
        }).then(function() {
            return operationTableManager.readFirstPendingOperationWithData();
        }).then(function(result) {
            $assert.areEqual(result, {
                logRecord: logRecord2,
                data: data2
            });
        }, function(error) {
            $assert.fail(error);
        });
    }),
    
    $test('readFirstPendingOperationWithData - update log operation')
    .checkAsync(function () {
        var operationTableManager = createOperationTableManager(store);
        var logRecord1 = { id: 1001, action: 'insert', tableName: storeTestHelper.testTableName, itemId: 'a' },
            logRecord2 = { id: 1,    action: 'update', tableName: storeTestHelper.testTableName, itemId: 'b' },
            logRecord3 = { id: 2001, action: 'delete', tableName: storeTestHelper.testTableName, itemId: 'dd' },
            data1 = { id: 'a' },
            data2 = { id: 'b' },
            data3 = { id: 'c' };            
            
        return operationTableManager.initialize().then(function() {
            return store.executeBatch([
                { tableName: operationTableName, action: 'upsert', data: logRecord1 },
                { tableName: operationTableName, action: 'upsert', data: logRecord2 },
                { tableName: operationTableName, action: 'upsert', data: logRecord3 },
                { tableName: storeTestHelper.testTableName, action: 'upsert', data: data1 },
                { tableName: storeTestHelper.testTableName, action: 'upsert', data: data2 },
                { tableName: storeTestHelper.testTableName, action: 'upsert', data: data3 }
            ]);
        }).then(function() {
            return operationTableManager.readFirstPendingOperationWithData();
        }).then(function(result) {
            $assert.areEqual(result, {
                logRecord: logRecord2,
                data: data2
            });
        }, function(error) {
            $assert.fail(error);
        });
    }),
    
    $test('readFirstPendingOperationWithData - delete log operation')
    .checkAsync(function () {
        var operationTableManager = createOperationTableManager(store);
        var logRecord1 = { id: 1001, action: 'insert', tableName: storeTestHelper.testTableName, itemId: 'a' },
            logRecord2 = { id: 1,    action: 'delete', tableName: storeTestHelper.testTableName, itemId: 'b' },
            logRecord3 = { id: 2001, action: 'update', tableName: storeTestHelper.testTableName, itemId: 'dd' },
            data1 = { id: 'a' },
            data2 = { id: 'b' },
            data3 = { id: 'c' };            
            
        return operationTableManager.initialize().then(function() {
            return store.executeBatch([
                { tableName: operationTableName, action: 'upsert', data: logRecord1 },
                { tableName: operationTableName, action: 'upsert', data: logRecord2 },
                { tableName: operationTableName, action: 'upsert', data: logRecord3 },
                { tableName: storeTestHelper.testTableName, action: 'upsert', data: data1 },
                { tableName: storeTestHelper.testTableName, action: 'upsert', data: data2 },
                { tableName: storeTestHelper.testTableName, action: 'upsert', data: data3 }
            ]);
        }).then(function() {
            return operationTableManager.readFirstPendingOperationWithData();
        }).then(function(result) {
            $assert.areEqual(result, {
                logRecord: logRecord2
            });
        }, function(error) {
            $assert.fail(error);
        });
    }),
    
    $test('readFirstPendingOperationWithData - first log record without data record, next log record has data record')
    .checkAsync(function () {
        var operationTableManager = createOperationTableManager(store);
        var logRecord1 = { id: 1001, action: 'udpate', tableName: storeTestHelper.testTableName, itemId: 'a' },
            logRecord2 = { id: 1,    action: 'insert', tableName: storeTestHelper.testTableName, itemId: 'b' },
            logRecord3 = { id: 2001, action: 'delete', tableName: storeTestHelper.testTableName, itemId: 'dd' },
            data1 = { id: 'a' },
            data2 = { id: 'c' };            
            
        return operationTableManager.initialize().then(function() {
            return store.executeBatch([
                { tableName: operationTableName, action: 'upsert', data: logRecord1 },
                { tableName: operationTableName, action: 'upsert', data: logRecord2 },
                { tableName: operationTableName, action: 'upsert', data: logRecord3 },
                { tableName: storeTestHelper.testTableName, action: 'upsert', data: data1 },
                { tableName: storeTestHelper.testTableName, action: 'upsert', data: data2 }
            ]);
        }).then(function() {
            return operationTableManager.readFirstPendingOperationWithData();
        }).then(function(result) {
            $assert.areEqual(result, {
                logRecord: logRecord1,
                data: data1
            });
            return store.read(new Query(operationTableName).orderBy('id'));
        }).then(function(result) {
            $assert.areEqual(result, [logRecord1, logRecord3]);
        }, function(error) {
            $assert.fail(error);
        });
    }),
    
    $test('readFirstPendingOperationWithData - first log record without data record, next log record does not exist')
    .checkAsync(function () {
        var operationTableManager = createOperationTableManager(store);
        var logRecord1 = { id: 1,    action: 'insert', tableName: storeTestHelper.testTableName, itemId: 'b' };            
            
        return operationTableManager.initialize().then(function() {
            return store.executeBatch([
                { tableName: operationTableName, action: 'upsert', data: logRecord1 }
            ]);
        }).then(function() {
            return operationTableManager.readFirstPendingOperationWithData();
        }).then(function(result) {
            $assert.isNull(result);
            return store.read(new Query(operationTableName));
        }).then(function(result) {
            $assert.areEqual(result, []);
        }, function(error) {
            $assert.fail(error);
        });
    }),
    
    $test('readFirstPendingOperationWithData - log record does not exist')
    .checkAsync(function () {
        var operationTableManager = createOperationTableManager(store);
            
        return operationTableManager.initialize().then(function() {
            return operationTableManager.readFirstPendingOperationWithData();
        }).then(function(result) {
            $assert.isNull(result);
        }, function(error) {
            $assert.fail(error);
        });
    }),
    
    $test('removeLockedOperation')
    .checkAsync(function () {
        var operationTableManager = createOperationTableManager(store);
        var logRecord1 = { id: 1, action: 'udpate', tableName: storeTestHelper.testTableName, itemId: 'a' },
            logRecord2 = { id: 101,    action: 'insert', tableName: storeTestHelper.testTableName, itemId: 'b' },
            logRecord3 = { id: 2001, action: 'delete', tableName: storeTestHelper.testTableName, itemId: 'dd' };            
            
        return operationTableManager.initialize().then(function() {
            return store.executeBatch([
                { tableName: operationTableName, action: 'upsert', data: logRecord1 },
                { tableName: operationTableName, action: 'upsert', data: logRecord2 },
                { tableName: operationTableName, action: 'upsert', data: logRecord3 }
            ]);
        }).then(function() {
            return operationTableManager.lockOperation(logRecord2.id);
        }).then(function(result) {
            return operationTableManager.removeLockedOperation();
        }).then(function(result) {
            return store.read(new Query(operationTableName).orderBy('id'));
        }).then(function(result) {
            $assert.areEqual(result, [logRecord1, logRecord3]);
        }, function(error) {
            $assert.fail(error);
        });
    })
);

// Perform the specified actions and verify that the operation table has the expected operations
function performActionsAndVerifySuccess(actions, expectedOperations) {
    var operationTableManager = createOperationTableManager(store),
        itemId = 'abc';

    return performActions(operationTableManager, itemId, actions).then(function() {
        $assert.isNotNull(expectedOperations);
        return verifyOperations(operationTableManager, itemId, expectedOperations);
    }, function(error) {
        $assert.isNull(expectedOperations);
    });
}

// Perform the specified setupActions and then verify that errorAction fails
function performActionsAndVerifyError(setupActions, errorAction) {
    var operationTableManager = createOperationTableManager(store),
        itemId = 'abc';

    return performActions(operationTableManager, itemId, setupActions).then(function() {
        return performActions(operationTableManager, itemId, [errorAction]);
    }, function(error) {
        $assert.fail(error);
    }).then(function() {
        $assert.fail('failure expected');
    }, function(error) {
        // Failure Expected.
    });
}

// Perform actions specified by the actions array. Valid values for the actions
// array are 'insert', 'update', 'delete', 'lock' and 'unlock'.
function performActions(operationTableManager, itemId, actions) {
    var asyncChain = operationTableManager.initialize();
    for (var i in actions) {
        asyncChain = performAction(asyncChain, operationTableManager, itemId, actions[i]);
    }
    return asyncChain;
}

function performAction(asyncChain, operationTableManager, itemId, action) {
    return asyncChain.then(function() {
        if (action === 'insert' || action === 'update' || action === 'delete') {
            return operationTableManager.getLoggingOperation(storeTestHelper.testTableName, action, itemId).then(function(operation) {
                return store.executeBatch([operation]);
            });
        } else if (action === 'lock') {
            return operationTableManager.lockOperation(1 /* For this test the first operation will always have ID = 1 */);
        } else if (action === 'unlock') {
            return operationTableManager.unlockOperation();
        } else {
            throw new Error('something is wrong');
        }
    });
}

// Verify that the pending operations in the operation table are as expected
function verifyOperations(operationTableManager, itemId, expectedOperations) {
    return operationTableManager.readPendingOperations(storeTestHelper.testTableName, itemId).then(function(operations) {
        
        for (var i in expectedOperations) {
            expectedOperations[i].tableName = storeTestHelper.testTableName;
            expectedOperations[i].itemId = itemId;
        }
        
        $assert.areEqual(operations, expectedOperations);
    }, function(error) {
        $assert.fail(error);
    });
}
