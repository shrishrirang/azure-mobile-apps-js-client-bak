// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

var Platform = require('Platforms/Platform'),
    Query = require('query.js').Query,
    MobileServiceSQLiteStore = require('Platforms/MobileServiceSQLiteStore');

var testTableName = 'sometable';
var testDbFile = 'somedbfile.db';

$testGroup('SQLiteStore lookup tests')
    .beforeEachAsync(Platform.async( function(callback) {
        var db = window.sqlitePlugin.openDatabase({ name: testDbFile });

        // Delete table created by the unit tests
        db.executeSql('DROP TABLE IF EXISTS ' + testTableName, null, function() {
            callback();
        }, function(err) {
            callback(err);
        });
    })).tests(

    $test('table not defined')
    .checkAsync(function () {
        return createStore().lookup(testTableName, 'one').then(function (result) {
            $assert.fail('failure expected');
        }, function (err) {
        });
    }),

    $test('Id of type string')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 'someid', price: 51.5 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.String,
                price: MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, row);
        }).then(function () {
            return store.lookup(testTableName, row.id);
        }).then(function (result) {
            $assert.areEqual(result, row);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('Id of type integer')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 51, price: 51.5 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.Integer,
                price: MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, row);
        }).then(function () {
            return store.lookup(testTableName, '51');
        }).then(function (result) {
            $assert.areEqual(result, row);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('Id of type real')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 21.11, price: 51.5 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.Real,
                price: MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, row);
        }).then(function () {
            return store.lookup(testTableName, '21.11');
        }).then(function (result) {
            $assert.areEqual(result, row);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('verify id case insensitivity')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 'ABC', description: 'something' };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.Text,
                description: MobileServiceSQLiteStore.ColumnType.String
            }
        }).then(function () {
            return store.upsert(testTableName, row);
        }).then(function () {
            return store.lookup(testTableName, 'abc');
        }).then(function (result) {
            $assert.areEqual(result, row);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('read columns that are missing in table definition')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 'ABC', column1: 1, column2: 2 },
            tableDefinition = {
                name: testTableName,
                columnDefinitions: {
                    id: MobileServiceSQLiteStore.ColumnType.Text,
                    column1: MobileServiceSQLiteStore.ColumnType.Integer,
                    column2: MobileServiceSQLiteStore.ColumnType.Integer
                }
            };

        return store.defineTable(tableDefinition).then(function () { 
            return store.upsert(testTableName, row);
        }).then(function () {
            // Redefine the table without column2
            delete tableDefinition.columnDefinitions.column2;
            return store.defineTable(tableDefinition);
        }).then(function () {
            return store.lookup(testTableName, 'abc');
        }).then(function (result) {
            $assert.areEqual(result, row);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('record not found')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.Integer,
                price: MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.lookup(testTableName, 'someid');
        }).then(function (result) {
            $assert.areEqual(result, null);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('invoked with extra parameters')
    .description('Check that promise returned by lookup is either resolved or rejected even when invoked with extra parameters')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.Integer,
                price: MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.lookup(testTableName, 'some id', 'extra param');
        }).then(function (result) {
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('null id')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.Integer,
                price: MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.lookup(testTableName, null);
        }).then(function (result) {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('id defined as undefined')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.Integer,
                price: MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.lookup(testTableName, undefined);
        }).then(function (result) {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('id property not defined')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.Integer,
                price: MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.lookup(testTableName, undefined);
        }).then(function (result) {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('invalid id')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.Integer,
                price: MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.lookup(testTableName, {invalid: 'invalid'});
        }).then(function (result) {
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
                id: MobileServiceSQLiteStore.ColumnType.Text,
                description: MobileServiceSQLiteStore.ColumnType.String
            }
        }).then(function () {
            return store.lookup(null, [{ id: 'something', description: 'something' }]);
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
                id: MobileServiceSQLiteStore.ColumnType.Text,
                description: MobileServiceSQLiteStore.ColumnType.String
            }
        }).then(function () {
            return store.lookup(undefined, [{ id: 'something', description: 'something' }]);
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
                id: MobileServiceSQLiteStore.ColumnType.Text,
                description: MobileServiceSQLiteStore.ColumnType.String
            }
        }).then(function () {
            return store.lookup('*', [{ id: 'something', description: 'something' }]);
        }).then(function () {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('invoked without any parameter')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.Text,
                description: MobileServiceSQLiteStore.ColumnType.String
            }
        }).then(function () {
            return store.lookup();
        }).then(function () {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('verify deserialization error is handled properly')
    .checkAsync(function() {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.String,
                prop: MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function() {
            return store.upsert(testTableName, { id: '1', prop: 1.5 });
        }).then(function() {
            // Change table definition to introduce deserialization error;
            return store.defineTable({
                name: testTableName,
                columnDefinitions: {
                    id: MobileServiceSQLiteStore.ColumnType.String,
                    prop: MobileServiceSQLiteStore.ColumnType.Date
                }
            });
        }).then(function() {
            return store.lookup(testTableName, '1');
        }).then(function(result) {
            $assert.fail('lookup should have failed');
        }, function(error) {
        });
    })
);

function createStore() {
    return new MobileServiceSQLiteStore(testDbFile);
}
