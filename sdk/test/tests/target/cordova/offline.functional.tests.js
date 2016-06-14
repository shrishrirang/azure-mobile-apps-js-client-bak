// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/**
 * Functional tests for offline scenarios
 */

// These tests need the todoitem (quickstart) table to be setup in the backend with the name
// matching storeTestHelper.testTableName

var Platform = require('Platforms/Platform'),
    Query = require('query.js').Query,
    pullManager = require('../../../../src/sync/pull'),
    _ = require('../../../../src/Utilities/Extensions'),
    MobileServiceSyncContext = require('../../../../src/sync/MobileServiceSyncContext'),
    MobileServiceClient = require('../../../../src/MobileServiceClient'),
    MobileServiceSqliteStore = require('Platforms/MobileServiceSqliteStore'),
    serverUrl = require('./config').server,
    uuid = require('node-uuid'),
    storeTestHelper = require('./storeTestHelper');
    
var testTableName = storeTestHelper.testTableName,
    query,
    client,
    table,
    serverValue,
    clientValue,
    currentId,
    syncContext,
    filter,
    id,
    store;

var tablea, tableb, tablec, tabled;
var querya, queryb, queryc, queryd;

$testGroup('offline functional tests')
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
            return store.defineTable({
                name: 'tablea',
                columnDefinitions: {
                    id: MobileServiceSqliteStore.ColumnType.String,
                    text: MobileServiceSqliteStore.ColumnType.String,
                    tablebid: MobileServiceSqliteStore.ColumnType.String,
                    version: MobileServiceSqliteStore.ColumnType.String
                }
            });
        }).then(function() {
            return store.defineTable({
                name: 'tableb',
                columnDefinitions: {
                    id: MobileServiceSqliteStore.ColumnType.String,
                    text: MobileServiceSqliteStore.ColumnType.String,
                    tablecid: MobileServiceSqliteStore.ColumnType.String,
                    version: MobileServiceSqliteStore.ColumnType.String
                }
            });
        }).then(function() {
            return store.defineTable({
                name: 'tablec',
                columnDefinitions: {
                    id: MobileServiceSqliteStore.ColumnType.String,
                    text: MobileServiceSqliteStore.ColumnType.String,
                    tabledid: MobileServiceSqliteStore.ColumnType.String,
                    version: MobileServiceSqliteStore.ColumnType.String
                }
            });
        }).then(function() {
            return store.defineTable({
                name: 'tabled',
                columnDefinitions: {
                    id: MobileServiceSqliteStore.ColumnType.String,
                    text: MobileServiceSqliteStore.ColumnType.String,
                    version: MobileServiceSqliteStore.ColumnType.String
                }
            });
        }).then(function() {
            serverValue = clientValue = filter = currentId = undefined;
            
            client = new MobileServiceClient(serverUrl);
            
            client = client.withFilter(function(req, next, callback) {
                if (filter) {
                    filter(req, next, callback);
                } else {
                    next(req, callback);
                }
            });
            
            syncContext = client.getSyncContext();
            table = client.getTable(testTableName);

            query = new Query(testTableName);
            
            return syncContext.initialize(store);
        }).then(function() {
            tablea = client.getSyncTable('tablea');
            tableb = client.getSyncTable('tableb');
            tablec = client.getSyncTable('tablec');
            tabled = client.getSyncTable('tabled');

            querya = new Query('tablea');
            queryb = new Query('tableb');
            queryc = new Query('tablec');
            queryd = new Query('tabled');

        });
    }).tests(

    $test('foreign key')
    .checkAsync(function () {

        syncContext.pushHandler = {
            onConflict: function(serverval, clientval, pusherror) {
                window.alert('conflict');
            },

            onError: function(pusherror) {
                window.alert('error : ' + JSON.stringify(pusherror.getError()));
            }
        };
        
        var a, b, c, d;

        return tablea.insert({text: 'begin'}).then(function(res) {
            return tablec.insert({text: 'c orig'});
        }).then(function(res) {
            c = res;
            return tabled.insert({text: 'd'});
        }).then(function(res) {
            d = res;
            return tablec.update({id: c.id, text: 'c new', tabledid: d.id});
        }).then(function() {
        }).then(function() {
        }).then(function() {
        }).then(function() {
            return syncContext.push();
        }).then(function(conflicts) {
            if (conflicts.length != 0) {
                window.alert(conflicts.length);
            }
        });
    }),

    $test('Basic push - insert / update / delete')
    .description('performs insert, update and delete on the client and pushes each of them individually')
    .checkAsync(function () {
        var actions = [
            'clientinsert', 'push', 'serverlookup',
            function(result) {
                $assert.isNotNull(clientValue);
                $assert.areEqual(result.id, clientValue.id);
                $assert.areEqual(result.text, clientValue.text);
            },
            
            'clientupdate', 'push', 'serverlookup',
            function(result) {
                $assert.isNotNull(clientValue);
                $assert.areEqual(result.id, clientValue.id);
                $assert.areEqual(result.text, clientValue.text);
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

    $test('vanilla pull - insert / update / delete')
    .description('performs insert, update and delete on the server and pulls each of them individually')
    .checkAsync(function () {
        var actions = [
            'serverinsert', 'vanillapull', 'clientlookup',
            function(result) {
                $assert.areEqual(result.id, serverValue.id);
                $assert.areEqual(result.text, serverValue.text);
            },
            'serverupdate', 'vanillapull', 'clientlookup',
            function(result) {
                $assert.areEqual(result.id, serverValue.id);
                $assert.areEqual(result.text, serverValue.text);
            },
            'serverdelete', 'vanillapull', 'clientlookup',
            {
                success: function(result) {
                    $assert.isNull(result);
                },
                fail: function(error) {
                    $assert.fail(error);
                }
            }
        ];
        
        return performActions(actions);
    }),
    
    $test('Vanilla pull - zero records')
    .checkAsync(function () {
        return performPull(0, 'vanillapull');
    }),

    $test('Vanilla pull - single page')
    .checkAsync(function () {
        return performPull(5, 'vanillapull');
    }),

    $test('Vanilla pull - record count exactly matches page size')
    .checkAsync(function () {
        // FIXME: Hardcoding 50 with an implicit assumption that it is the page size is not good. Fix it!
        return performPull(50, 'vanillapull'); 
    }),

    $test('Vanilla pull - multiple pages')
    .checkAsync(function () {
        return performPull(60, 'vanillapull');
    }),

    $test('Incremental pull - zero records')
    .checkAsync(function () {
        return performPull(0, 'incrementalpull');
    }),

    $test('Incremental pull - single page')
    .checkAsync(function () {
        return performPull(5, 'incrementalpull');
    }),

    $test('Incremental pull - record count exactly matches page size')
    .checkAsync(function () {
        // FIXME: Hardcoding 50 with an implicit assumption that it is the page size is not good. Fix it!
        return performPull(50, 'incrementalpull'); 
    }),

    $test('Incremental pull - multiple pages')
    .checkAsync(function () {
        return performPull(60, 'incrementalpull');
    }),

    $test('Push with response 409 - conflict not handled')
    .description('verifies that push behaves as expected if error is 409 and conflict is not handled')
    .checkAsync(function () {
        
        var actions = [
            'serverinsert', 'clientinsert', 'push',
            function(conflicts) {
                $assert.areEqual(conflicts.length, 1);
                //$assert.areEqual(conflicts[0].getError().request.status, 409);
            }
        ];
        
        return performActions(actions);
    }),
    
    $test('Push with response 409 - conflict handled')
    .description('verifies that push behaves as expected if error is 409 and conflict is handled')
    .checkAsync(function () {
        
        syncContext.pushHandler = {};
        syncContext.pushHandler.onConflict = function (serverRecord, clientRecord, pushError) {
            //$assert.areEqual(pushError.getError().request.status, 409);
            
            return table.lookup(clientRecord.id).then(function(serverValue) {
                return pushError.changeAction('update');
            });
        };
        
        var actions = [
            'serverinsert', 'clientinsert', 'push',
            function(conflicts) {
                $assert.areEqual(conflicts.length, 0);
            },
            'serverlookup',
            function(result) {
                $assert.areEqual(result.id, clientValue.id);
                $assert.areEqual(result.text, clientValue.text);
            }
        ];

        return performActions(actions);
    }),
    
    $test('Push with response 412 - conflict not handled')
    .description('verifies that push behaves as expected if error is 412 and conflict is not handled')
    .checkAsync(function () {
        
        var actions = [
            'serverinsert', 'vanillapull', 'serverupdate', 'clientupdate', 'push',
            function(conflicts) {
                $assert.areEqual(conflicts.length, 1);
                //$assert.areEqual(conflicts[0].getError().request.status, 412);
            }
        ];
        
        return performActions(actions);
    }),
    
    $test('Push with response 412 - conflict handled')
    .description('verifies that push behaves as expected if error is 412 and conflict is handled')
    .checkAsync(function () {
        
        syncContext.pushHandler = {};
        syncContext.pushHandler.onConflict = function (serverRecord, clientRecord, pushError) {
            //$assert.areEqual(pushError.getError().request.status, 412);
            var newValue = clientRecord;
            newValue.version = serverRecord.version;
            return pushError.update(newValue);
        };
        
        var actions = [
            'serverinsert', 'vanillapull', 'serverupdate', 'clientupdate', 'push',
            function(conflicts) {
                $assert.areEqual(conflicts.length, 0);
            },
            'serverlookup',
            function(result) {
                $assert.areEqual(result.id, clientValue.id);
                $assert.areEqual(result.text, clientValue.text);
            }
        ];

        return performActions(actions);
    }),
    
    $test('Push - connection error unhandled')
    .checkAsync(function () {
        
        filter = function (req, next, callback) {
            callback(null, { status: 400, responseText: '{"error":"some error"}' });
        };
        
        var actions = [
            'clientinsert', 'push',
            {
                success: function(conflicts) {
                    $assert.fail('should have failed');
                },
                fail: function(error) {
                    $assert.isNotNull(error);
                }
            }
        ];

        return performActions(actions);
    }),
    
    $test('Push - connection error handled')
    .checkAsync(function () {
        
        var fail = true;

        filter = function (req, next, callback) {
            if (fail) {
                callback(null, { status: 400, responseText: '{"error":"some error"}' });
            } else {
                next(req, callback);
            }
        };

        syncContext.pushHandler = {
            onError: function (pushError) {
                fail = false;
                pushError.isHandled = true;
            }
        };
        
        var actions = [
            'clientinsert', 'push', 'serverlookup',
            function(serverValue) {
                $assert.isNotNull(serverValue);
                $assert.areEqual(serverValue.text, clientValue.text);
            }
        ];

        return performActions(actions);
    }),

    $test('Pull - pending changes on client') 
    .description('Verifies that pull leaves records that are edited on the client untouched')
    .checkAsync(function () {
        
        var actions = [
            'serverinsert', 'vanillapull', 'serverupdate', 'clientupdate', 'vanillapull', 'clientlookup',
            function(result) {
                $assert.areNotEqual(result.text, serverValue.text);
            },
        ];

        return performActions(actions);
    }),
    
    $test('pushError.update() test')
    .description('Verifies correctness of error handling function pushError.update()')
    .checkAsync(function () {
        
        syncContext.pushHandler = {};
        syncContext.pushHandler.onConflict = function (serverRecord, clientRecord, pushError) {
            //$assert.areEqual(pushError.getError().request.status, 412);
            var newValue = clientRecord;
            newValue.version = serverRecord.version;
            return pushError.update(newValue);
        };
        
        var actions = [
            'serverinsert', 'vanillapull', 'serverupdate', 'clientupdate', 'push',
            function(conflicts) {
                $assert.areEqual(conflicts.length, 0);
            },
            'serverlookup',
            function(result) {
                $assert.areEqual(result.id, clientValue.id);
                $assert.areEqual(result.text, clientValue.text);
            }
        ];

        return performActions(actions);
    }),
    
    $test('pushError.cancelAndUpdate() test')
    .description('Verifies correctness of error handling function pushError.cancelAndUpdate()')
    .checkAsync(function () {
        
        syncContext.pushHandler = {};
        syncContext.pushHandler.onConflict = function (serverRecord, clientRecord, pushError) {
            //$assert.areEqual(pushError.getError().request.status, 412);
            var newValue = clientRecord;
            newValue.version = serverRecord.version;
            return pushError.cancelAndUpdate(newValue).then(function() {
                // We are going to push twice. We want pushHandler to be used only the first time.
                syncContext.pushHandler = undefined;
            });
        };
        
        var actions = [
            'serverinsert', 'vanillapull', 'serverupdate', 'clientupdate',
            
            'push',
            function(conflicts) {
                $assert.areEqual(conflicts.length, 0);
            },
            'clientlookup',
            function(result) {
                $assert.areNotEqual(result.version, clientValue.version);
            },
            'serverlookup',
            function (result) {
                $assert.areEqual(result.id, serverValue.id);
                $assert.areEqual(result.text, serverValue.text);
                $assert.isNotNull(result.text);
            },
            
            'push',
            function(conflicts) {
                $assert.areEqual(conflicts.length, 0);
            },
            
            'serverlookup',
            function (result) {
                $assert.areEqual(result.id, serverValue.id);
                $assert.areEqual(result.text, serverValue.text);
                $assert.isNotNull(result.text);
            }
        ];

        return performActions(actions);
    }),
    
    $test('pushError.cancelAndDiscard() test')
    .description('Verifies correctness of error handling function pushError.cancelAndDiscard()')
    .checkAsync(function () {
        
        syncContext.pushHandler = {};
        syncContext.pushHandler.onConflict = function (serverRecord, clientRecord, pushError) {
            $assert.areEqual(pushError.getError().request.status, 412);
            var newValue = clientRecord;
            newValue.version = serverRecord.version;
            return pushError.cancelAndDiscard(newValue).then(function() {
                // We are going to push twice. We want pushHandler to be used only the first time.
                syncContext.pushHandler = undefined;
            });
        };
        
        var actions = [
            'serverinsert', 'vanillapull', 'serverupdate', 'clientupdate',
            
            'push',
            function(conflicts) {
                $assert.areEqual(conflicts.length, 0);
            },
            'clientlookup',
            function(result) {
                $assert.isNull(result);
            },
            'serverlookup',
            function (result) {
                $assert.areEqual(result.id, serverValue.id);
                $assert.areEqual(result.text, serverValue.text);
                $assert.isNotNull(result.text);
            },
            
            'push',
            function(conflicts) {
                $assert.areEqual(conflicts.length, 0);
            },
            
            'serverlookup',
            function (result) {
                $assert.areEqual(result.id, serverValue.id);
                $assert.areEqual(result.text, serverValue.text);
                $assert.isNotNull(result.text);
            }
        ];

        return performActions(actions);
    }),
    
    $test('Multiple records pushed, one conflict - conflict handled')
    .description('Verifies that a conflict, if handled, does not prevent other records from being pushed')
    .checkAsync(function () {
        
        syncContext.pushHandler = {};
        syncContext.pushHandler.onConflict = function (serverRecord, clientRecord, pushError) {
            $assert.areEqual(pushError.getError().request.status, 412);
            var newValue = clientRecord;
            newValue.version = serverRecord.version;
            return pushError.update(newValue);
        };
        
        var serverId1, serverId2, serverId3,
            clientValue1, clientValue2, clientValue3;
        
        var actions = [
            'serverinsert', 'vanillapull', 'clientupdate',
            function() {
                serverId1 = serverValue.id;
                clientValue1 = clientValue;
                currentId = generateGuid();
            },
            'serverinsert', 'vanillapull', 'serverupdate', 'clientupdate',
            function() {
                serverId2 = serverValue.id;
                clientValue2 = clientValue;
                currentId = generateGuid();
            },
            'serverinsert', 'vanillapull', 'clientupdate',
            function() {
                serverId3 = serverValue.id;
                clientValue3 = clientValue;
                currentId = generateGuid();
            },
            'push',
            
            function() {
                currentId = serverId1;
            },
            'serverlookup',
            function (result) {
                $assert.isNotNull(result);
                $assert.isNotNull(result.text);
                $assert.areEqual(result.text, clientValue1.text);
            },

            function() {
                currentId = serverId2;
            },
            'serverlookup',
            function (result) {
                $assert.isNotNull(result);
                $assert.isNotNull(result.text);
                $assert.areEqual(result.text, clientValue2.text);
            },

            function() {
                currentId = serverId3;
            },
            'serverlookup',
            function (result) {
                $assert.isNotNull(result);
                $assert.isNotNull(result.text);
                $assert.areEqual(result.text, clientValue3.text);
            }
        ];

        return performActions(actions);
    }),
    
    $test('Multiple records pushed, one conflict - conflict not handled')
    .description('Verifies that a conflict, if unhandled, does not prevent other records from being pushed')
    .checkAsync(function () {
        
        var serverId1, serverId2, serverId3,
            clientValue1, clientValue2, clientValue3;
        
        var actions = [
            'serverinsert', 'vanillapull', 'clientupdate',
            function() {
                serverId1 = serverValue.id;
                clientValue1 = clientValue;
                currentId = generateGuid();
            },
            'serverinsert', 'vanillapull', 'serverupdate', 'clientupdate',
            function() {
                serverId2 = serverValue.id;
                clientValue2 = clientValue;
                currentId = generateGuid();
            },
            'serverinsert', 'vanillapull', 'clientupdate',
            function() {
                serverId3 = serverValue.id;
                clientValue3 = clientValue;
                currentId = generateGuid();
            },
            'push',
            function(conflicts) {
                $assert.areEqual(conflicts.length, 1);
            },
            
            function() {
                currentId = serverId1;
            },
            'serverlookup',
            function (result) {
                $assert.isNotNull(result);
                $assert.isNotNull(result.text);
                $assert.areEqual(result.text, clientValue1.text);
            },

            function() {
                currentId = serverId2;
            },
            'serverlookup',
            function (result) {
                $assert.isNotNull(result);
                $assert.isNotNull(result.text);
                $assert.areNotEqual(result.text, clientValue2.text);
            },

            function() {
                currentId = serverId3;
            },
            'serverlookup',
            function (result) {
                $assert.isNotNull(result);
                $assert.isNotNull(result.text);
                $assert.areEqual(result.text, clientValue3.text);
            }
        ];

        return performActions(actions);
    }),
    
    $test('Push - A handled conflict should be considered handled if isHandled is set to false')
    .checkAsync(function () {
        
        syncContext.pushHandler = {};
        syncContext.pushHandler.onConflict = function (serverRecord, clientRecord, pushError) {
            $assert.areEqual(pushError.getError().request.status, 412);
            var newValue = clientRecord;
            newValue.version = serverRecord.version;
            return pushError.cancelAndDiscard(newValue).then(function() {
                pushError.isHandled = false;
            });
        };
        
        var actions = [
            'serverinsert', 'vanillapull', 'serverupdate', 'clientupdate', 'push',

            function(conflicts) {
                $assert.areEqual(conflicts.length, 1);
            },

            'clientlookup',
            function(result) {
                $assert.isNull(result);
            },

            'serverlookup',
            function (result) {
                $assert.areEqual(result.id, serverValue.id);
                $assert.areEqual(result.text, serverValue.text);
                $assert.isNotNull(result.text);
            }
        ];

        return performActions(actions);
    }),
    
    $test('Push - A handled conflict should be considered unhandled if onConflict fails')
    .checkAsync(function () {
        
        syncContext.pushHandler = {};
        syncContext.pushHandler.onConflict = function (serverRecord, clientRecord, pushError) {
            $assert.areEqual(pushError.getError().request.status, 412);
            var newValue = clientRecord;
            newValue.version = serverRecord.version;
            return pushError.cancelAndDiscard(newValue).then(function() {
                throw 'some error';
            });
        };
        
        var actions = [
            'serverinsert', 'vanillapull', 'serverupdate', 'clientupdate', 'push',

            function(conflicts) {
                $assert.areEqual(conflicts.length, 1);
            },

            'clientlookup',
            function(result) {
                $assert.isNull(result);
            },

            'serverlookup',
            function (result) {
                $assert.areEqual(result.id, serverValue.id);
                $assert.areEqual(result.text, serverValue.text);
                $assert.isNotNull(result.text);
            }
        ];

        return performActions(actions);
    })   
);

function performActions (actions) {
    
    currentId = generateGuid(); // generate the ID to use for performing the actions
    
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
        
        if (_.isFunction(action)) {
            return action(result);
        }
        
        switch(action) {
            case 'clientinsert':
                record = generateRecord('client-insert');
                return syncContext.insert(testTableName, record).then(function(result) {
                    clientValue = result;
                    return result;
                });
            case 'clientupdate':
                record = generateRecord('client-update');
                return syncContext.update(testTableName, record).then(function(result) {
                    clientValue = result;
                    return result;
                });
            case 'clientdelete':
                record = generateRecord();
                return syncContext.del(testTableName, record).then(function(result) {
                    clientValue = undefined;
                    return result;
                });
            case 'clientlookup':
                return syncContext.lookup(testTableName, currentId);
            case 'clientread':
                return syncContext.read(new Query(testTableName));
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
                record = generateRecord();
                return table.del(record).then(function(result) {
                    serverValue = undefined;
                    return result;
                });
            case 'serverlookup':
                return table.lookup(currentId);
            case 'serverread':
                return table.read(new Query(testTableName));
            case 'push':
                return syncContext.push();
            case 'vanillapull':
                return syncContext.pull(query);
            case 'incrementalpull':
                return syncContext.pull(query, 'queryId');
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

// pullType is either 'vanillapull' or 'incrementalpull'
function performPull(recordCount, pullType) {
    var textPrefix = generateGuid(),
        numServerRequests = 0;

    query = query.where(function(textPrefix) {
        return this.text.indexOf(textPrefix) === 0;
    }, textPrefix);

    var actions = [
        function() {
            return populateServerTable(textPrefix, recordCount);
        },

        pullType,
        'clientread',

        function(result) {
            $assert.areEqual(result.length, recordCount);
        }
    ];

    return performActions(actions);
}

//TODO: Add another test to do a bulk insert by inserting all record in parallel
function populateServerTable(textPrefix, count) {
    var numInsertedRecords = 0;

    var chain = Platform.async(function(callback) {
        callback();
    })();

    for (var i = 0; i < count; i++) {
        chain = insertRecord(chain, {
            id: generateGuid(),
            text: generateText(textPrefix),
            complete: false 
        });
    }

    return chain;
}

function insertRecord(chain, record) {
    return chain.then(function() {
        return table.insert(record);
    });
}

function generateRecord(textPrefix) {
    return {
        id: currentId,
        text: generateText(textPrefix),
        complete: false
    };
}

function generateText(textPrefix) {
    return textPrefix + '__' + generateGuid();
}

function generateGuid() {
    return uuid.v4();
}
