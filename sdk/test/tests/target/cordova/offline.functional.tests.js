// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/**
 * Functional tests for offline scenarios
 */

var Platform = require('Platforms/Platform'),
    Query = require('query.js').Query,
    pullManager = require('../../../../src/sync/pull'),
    MobileServiceSyncContext = require('../../../../src/sync/MobileServiceSyncContext'),
    MobileServiceClient = require('../../../../src/MobileServiceClient'),
    MobileServiceSqliteStore = require('Platforms/MobileServiceSqliteStore'),
    uuid = require('node-uuid'),
    storeTestHelper = require('./storeTestHelper');
    
var client = new MobileServiceClient('http://shrirs-js-dev.azurewebsites.net' /* TODO: Make this configurable */),
    syncContext = new MobileServiceSyncContext(client),
    testTableName = storeTestHelper.testTableName,
    table = client.getTable(testTableName),
    query = new Query(testTableName),
    serverValue,
    clientValue,
    testId,
    store;
    
$testGroup('offline tests')
    .functional()
    .beforeEachAsync(function() {
        return storeTestHelper.createEmptyStore().then(function(localStore) {
            store = localStore;
            return store.defineTable({
                name: testTableName,
                columnDefinitions: {
                    id: MobileServiceSqliteStore.ColumnType.String,
                    text: MobileServiceSqliteStore.ColumnType.String,
                    complete: MobileServiceSqliteStore.ColumnType.Boolean,
                    version: MobileServiceSqliteStore.ColumnType.String
                }
            });
        }).then(function() {
            serverValue = clientValue = undefined;
            return syncContext.initialize(store);
        });
    }).tests(

    $test('Basic push - insert / update / delete')
    .checkAsync(function () {
        var actions = [
            'clientinsert', 'push', 'serverlookup',
            {
                success: function(result) {
                    $assert.isNotNull(clientValue);
                    $assert.areEqual(result.id, clientValue.id);
                    $assert.areEqual(result.text, clientValue.text);
                }
            },
            'clientupdate', 'push', 'serverlookup',
            {
                success: function(result) {
                    $assert.isNotNull(clientValue);
                    $assert.areEqual(result.id, clientValue.id);
                    $assert.areEqual(result.text, clientValue.text);
                }
            },
            'clientdelete', 'push', 'serverlookup',
            {
                success: function(result) {
                    $assert.fail('should have failed to lookup deleted server record');
                },
                fail: function(error) {
                    // error expected
                }
            }
        ];
                        
        return performActions(actions);
    }),
    
    $test('pull inserts, updates and deletes')
    .checkAsync(function () {
        var actions = [
        ];
        
        var query = new Query(testTableName),
            testId = uuid.v4();
        
        var record = {id: testId, text: 'something'};
        
        return table.insert(record).then(function() {
            return syncContext.pull(query);
        }).then(function() {
            return syncContext.lookup(testTableName, record.id);
        }).then(function(result) {
            $assert.areEqual(result.id, record.id);
            $assert.areEqual(result.text, record.text);
            record.text = 'updated';
            return table.update(record);
        }).then(function() {
            return syncContext.pull(query);
        }).then(function() {
            return syncContext.lookup(testTableName, testId);
        }).then(function(result) {
            $assert.areEqual(result.id, record.id);
            $assert.areEqual(result.text, record.text);
            return table.del(record);
        }).then(function() {
            return syncContext.pull(query);
        }).then(function() {
            return syncContext.lookup(testTableName, testId);
        }).then(function(result) {
            $assert.isNull(result);
        }, function(error) {
            $assert.fail(error);
        });
    }),
    
    $test('basic conflict')
    .checkAsync(function () {
        var query = new Query(testTableName);
        
        var record1 = {id: uuid.v4(), text: 'server1'},
            record2 = {id: uuid.v4(), text: 'server2'};
            
        function onRecordPushError(pushError) {
            if (pushError.isConflict()) {
                var newValue = pushError.getClientRecord();
                newValue.version = pushError.getServerRecord().version;
                return pushError.updateClientRecord(newValue).then(function() {
                    pushError.isHandled = true;
                });
            }
        }
        
        return table.insert(record1).then(function() {
            return table.insert(record2);
        }).then(function() {
            return syncContext.pull(query);
        }).then(function() {
            record1.text = 'server11';
            return table.del(record1);
        }).then(function() {
            record2.text = 'server22';
            return table.del(record2);
        }).then(function() {
            record1.text = 'client1';
            return syncContext.update(testTableName, record1);
        }).then(function() {
            record2.text = 'client2';
            return syncContext.update(testTableName, record2);
        }).then(function() {
            return syncContext.lookup(testTableName, record1.id);
        }).then(function(result) {
            $assert.areEqual(result.text, record1.text);
        }).then(function() {
            return syncContext.push({
                onRecordPushError: onRecordPushError
            });
        }).then(function(conflicts) {
            $assert.areEqual(conflicts.length, 0);
        }, function(error) {
            $assert.fail(error);
        }).then(function() {
            return syncContext.push({
                onRecordPushError: onRecordPushError
            });
        }).then(function() {
            return table.lookup(record1.id);
        }).then(function(result) {
            $assert.areEqual(result.text, record1.text);
        }).then(function() {
            return syncContext.lookup(testTableName, record1.id);
        }).then(function(result) {
            $assert.areEqual(result.text, record1.text);
        }).then(function() {
            return table.lookup(record2.id);
        }).then(function(result) {
            $assert.areEqual(result.text, record2.text);
        }, function(error) {
            $assert.fail(error);
        });
    })
);

function performActions (actions) {
    
    var testId = generateId();
    
    var chain = Platform.async(function(callback) {
        callback();
    })();
    
    for (var i in actions) {
        chain = performAction(chain, actions[i]);
    }
    
    return chain;
}

function performAction (chain, action) {
    var record;
    return chain.then(function(result) {
        if (action && action.success) {
            return action.success(result);
        }
        
        switch(action) {
            case 'clientinsert':
                record = generateRecord('client-insert');
                return syncContext.insert(testTableName, record).then(function(result) {
                    clientValue = result;
                    return result;
                });
            case 'clientupdate':
                record = generateRecord('client-update')
                return syncContext.update(testTableName, record).then(function(result) {
                    clientValue = result;
                    return result;
                });
            case 'clientdelete':
                record = generateRecord(id)
                return syncContext.del(testTableName, record).then(function(result) {
                    clientValue = undefined;
                    return result;
                });
            case 'clientlookup':
                return syncContext.lookup(testTableName, testId);
            case 'serverinsert':
                record = generateRecord('server-insert');
                return table.insert(record).then(function(result) {
                    serverValue = result;
                    return result;
                });
            case 'serverupdate':
                record = generateRecord('server-update');
                return table.update(record).then(function(result) {
                    serverValue = result;
                    return result;
                });
            case 'serverdelete':
                record = generateRecord(id);
                return table.del(record).then(function(result) {
                    serverValue = undefined;
                    return result;
                });
            case 'serverlookup':
                return table.lookup(testId);
            case 'push':
                return syncContext.push();
            case 'vanillapull':
                return syncContext.pull(query);
            default:
                throw new Error('Unsupported action : ' + action);
        }
    }, function(error) {
        if (action && action.fail) {
            return action.fail(error);
        } else {
            $assert.fail('Unexpected failure while running action : ' + action);
            $assert.fail(error);
            throw error;
        }
    });
}

function generateRecord(textPrefix) {
    return {
        id: testId,
        text: textPrefix + uuid.v4()
    }
}

function generateId() {
    return uuid.v4();
}