// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/// <reference path='C:\Program Files (x86)\Microsoft SDKs\Windows\v8.0\ExtensionSDKs\Microsoft.WinJS.1.0\1.0\DesignTime\CommonConfiguration\Neutral\Microsoft.WinJS.1.0\js\base.js' />
/// <reference path='C:\Program Files (x86)\Microsoft SDKs\Windows\v8.0\ExtensionSDKs\Microsoft.WinJS.1.0\1.0\DesignTime\CommonConfiguration\Neutral\Microsoft.WinJS.1.0\js\ui.js' />
/// <reference path='.\Generated\Tests.js' />
/// <reference path='.\Generated\MobileServices.Cordova.Internals.js' />

var Platform = require('Platforms/Platform'),
    Query = require('query.js').Query;

var testTableName = 'sometable';
var testDbFile = 'somedbfile.db';

$testGroup('SQLiteStore upsert tests')
    .beforeEachAsync(Platform.async( function(callback) {
        var db = window.sqlitePlugin.openDatabase({ name: testDbFile });

        // Delete table created by the unit tests
        db.executeSql('DROP TABLE IF EXISTS ' + testTableName, null, function() {
            callback();
        }, function(err) {
            callback(err);
        });
    })).tests(

    $test('when table is not defined')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 101, description: 'some description' };

        return store.upsert(testTableName, row).then(function (result) {
            $assert.fail('failure expected');
        }, function (err) {
        });
    }),

    $test('insert new record and then update it')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 'some id', price: 100 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                price: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, row);
        }).then(function () {
            return store.lookup(testTableName, row.id);
        }).then(function (result) {
            $assert.areEqual(result, row);
            // Change property value and upsert again
            row.price = 5000.1;
            return store.upsert(testTableName, row);
        }).then(function () {
            return store.lookup(testTableName, row.id);
        }).then(function (result) {
            $assert.areEqual(result, row);
        }).then(function () {
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('array of records, all having the same id')
    .checkAsync(function () {
        var store = createStore(),
            rows = [{ id: 't1', description: 'description1', price: 5 }, { id: 't1', description: 'description2' }];

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Text,
                description: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                price: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer
            }
        }).then(function () {
            return store.upsert(testTableName, rows);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [{ id: 't1', description: 'description2', price: 5 }]);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('adding record with columns that are not defined should fail')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 101, flag: 51, undefinedColumn: 1 },
            tableDefinition = {
                name: testTableName,
                columnDefinitions: {
                    id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer,
                    flag: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer
                }
            };

        return store.defineTable(tableDefinition).then(function () {
            return store.upsert(testTableName, row);
        }).then(function (result) {
            $assert.fail('test should have failed');
        }, function (err) {
        });
    }),

    $test('update select properties of an existing record')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                prop1: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real,
                prop2: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, { id: 'some id', prop1: 100, prop2: 200 });
        }).then(function () {
            return store.lookup(testTableName, 'some id');
        }).then(function (result) {
            $assert.areEqual(result, { id: 'some id', prop1: 100, prop2: 200 });
            // Update select properties of an existing record
            return store.upsert(testTableName, { id: 'some id', prop2: -99999 });
        }).then(function () {
            return store.lookup(testTableName, 'some id');
        }).then(function (result) {
            $assert.areEqual(result, { id: 'some id', prop1: 100, prop2: -99999 });
        }).then(function () {
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('verify id case sensitivity')
    .checkAsync(function () {
        var store = createStore(),
            row1 = { id: 'ABC', description: 'old' },
            row2 = { id: 'abc', description: 'new' };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Text,
                description: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String
            }
        }).then(function () {
            // record with an upper cased id
            return store.upsert(testTableName, row1);
        }).then(function () {
            // update record using a lower cased id
            return store.upsert(testTableName, row2);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row1, row2]);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('insert array of records with null values')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 'ABC', description: 'something' };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Text,
                description: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String
            }
        }).then(function () {
            return store.upsert(testTableName, [null, row]);
        }).then(function () {
            return store.lookup(testTableName, row.id);
        }).then(function (result) {
            $assert.areEqual(result, row);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('empty table name')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Text,
                description: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String
            }
        }).then(function () {
            return store.upsert('', [{ id: 'something', description: 'something' }]);
        }).then(function () {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('null table name')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Text,
                description: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String
            }
        }).then(function () {
            return store.upsert(null, [{ id: 'something', description: 'something' }]);
        }).then(function () {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('undefined table name')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Text,
                description: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String
            }
        }).then(function () {
            return store.upsert(undefined, [{ id: 'something', description: 'something' }]);
        }).then(function () {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('invalid table name')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Text,
                description: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String
            }
        }).then(function () {
            return store.upsert('*', [{ id: 'something', description: 'something' }]);
        }).then(function () {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('empty array')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Text,
                description: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String
            }
        }).then(function () {
            return store.upsert(testTableName, []);
        }).then(function () {
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('record is null')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Text,
                description: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String
            }
        }).then(function () {
            return store.upsert(testTableName, null);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, []);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('record is undefined')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Text,
                description: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String
            }
        }).then(function () {
            return store.upsert(testTableName, undefined);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, []);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('adding record with columns that are not defined should fail')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 101, flag: 51, undefinedColumn: 1 },
            tableDefinition = {
                name: testTableName,
                columnDefinitions: {
                    id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer,
                    flag: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer
                }
            };

        return store.defineTable(tableDefinition).then(function () {
            return store.upsert(testTableName, row);
        }).then(function (result) {
            $assert.fail('test should have failed');
        }, function (err) {
        });
    }),

    $test('adding record with incorrect column type should fail')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 101, flag: [1, 2] },
            tableDefinition = {
                name: testTableName,
                columnDefinitions: {
                    id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer,
                    flag: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer
                }
            };

        return store.defineTable(tableDefinition).then(function () {
            return store.upsert(testTableName, row);
        }).then(function (result) {
            $assert.fail('test should have failed');
        }, function (err) {
        });
    }),

    $test('record is not an object')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                prop1: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real,
                prop2: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, 1000);
        }).then(function () {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('record without id property')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                prop1: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real,
                prop2: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, { prop1: 100, prop2: 200 });
        }).then(function () {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('record id is null')
    .description('Check that promise returned by upsert is either resolved or rejected even when id is null')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                prop1: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real,
                prop2: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, { id: null, prop1: 100, prop2: 200 });
        }).then(function () {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('record id is defined as undefined')
    .description('Check that promise returned by upsert is either resolved or rejected even when id is undefined')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                prop1: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real,
                prop2: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, { id: undefined, prop1: 100, prop2: 200 });
        }).then(function () {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('record does not have an id')
    .description('Check that promise returned by upsert is either resolved or rejected even when id is missing')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                prop1: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real,
                prop2: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, { prop1: 100, prop2: 200 });
        }).then(function () {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('invoked with extra parameters')
    .description('Check that promise returned by upsert is either resolved or rejected even when invoked with extra parameters')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                prop1: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real,
                prop2: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, { id: 'someid', prop1: 100, prop2: 200 }, 'extra param');
        }).then(function () {
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('no parameter')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Text,
                description: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String
            }
        }).then(function () {
            return store.upsert();
        }).then(function () {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),
    
    $test('verify serialization error is handled properly')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                prop: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer
            }
        }).then(function () {
            return store.upsert(testTableName, {id: '1', prop: 1.5});
        }).then(function (result) {
            $assert.fail('test should have failed');
        }, function (error) {
        });
    })
);

function createStore() {
    return new WindowsAzure.MobileServiceSQLiteStore(testDbFile);
}
