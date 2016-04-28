// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/**
 * @file MobileServiceSqliteStore.lookup(..) unit tests
 */

var Platform = require('Platforms/Platform'),
    Query = require('query.js').Query,
    MobileServiceSqliteStore = require('Platforms/MobileServiceSqliteStore'),
    testTableName = 'sometable',
    testDbFile = 'somedbfile.db';

$testGroup('SQLiteStore - lookup tests')

    // Clear the test table before running each test.
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

    $test('SQLite store lookup: Id of type string')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 'someid', price: 51.5 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.String,
                price: MobileServiceSqliteStore.ColumnType.Real
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

    $test('SQLite store lookup: Id of type integer')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 51, price: 51.5 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                price: MobileServiceSqliteStore.ColumnType.Real
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

    $test('SQLite store lookup: Id of type real')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 21.11, price: 51.5 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Real,
                price: MobileServiceSqliteStore.ColumnType.Real
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

    $test('SQLite store lookup: verify id case insensitivity')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 'ABC', description: 'something' };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Text,
                description: MobileServiceSqliteStore.ColumnType.String
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

    $test('SQLite store lookup: read columns that are missing in table definition')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 'ABC', column1: 1, column2: 2 },
            tableDefinition = {
                name: testTableName,
                columnDefinitions: {
                    id: MobileServiceSqliteStore.ColumnType.Text,
                    column1: MobileServiceSqliteStore.ColumnType.Integer,
                    column2: MobileServiceSqliteStore.ColumnType.Integer
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

    $test('SQLite store lookup: record not found')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                price: MobileServiceSqliteStore.ColumnType.Real
            }
        }).then(function () {
            return store.lookup(testTableName, 'someid');
        }).then(function (result) {
            $assert.areEqual(result, null);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('SQLite store lookup: invoked with extra parameters')
    .description('Check that promise returned by lookup is either resolved or rejected even when invoked with extra parameters')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                price: MobileServiceSqliteStore.ColumnType.Real
            }
        }).then(function () {
            return store.lookup(testTableName, 'some id', 'extra param');
        }).then(function (result) {
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('SQLite store lookup: null id')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                price: MobileServiceSqliteStore.ColumnType.Real
            }
        }).then(function () {
            return store.lookup(testTableName, null);
        }).then(function (result) {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('SQLite store lookup: id defined as undefined')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                price: MobileServiceSqliteStore.ColumnType.Real
            }
        }).then(function () {
            return store.lookup(testTableName, undefined);
        }).then(function (result) {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('SQLite store lookup: id property not defined')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                price: MobileServiceSqliteStore.ColumnType.Real
            }
        }).then(function () {
            return store.lookup(testTableName, undefined);
        }).then(function (result) {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('SQLite store lookup: invalid id')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                price: MobileServiceSqliteStore.ColumnType.Real
            }
        }).then(function () {
            return store.lookup(testTableName, {invalid: 'invalid'});
        }).then(function (result) {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('SQLite store lookup: null table name')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Text,
                description: MobileServiceSqliteStore.ColumnType.String
            }
        }).then(function () {
            return store.lookup(null, [{ id: 'something', description: 'something' }]);
        }).then(function () {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('SQLite store lookup: undefined table name')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Text,
                description: MobileServiceSqliteStore.ColumnType.String
            }
        }).then(function () {
            return store.lookup(undefined, [{ id: 'something', description: 'something' }]);
        }).then(function () {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('SQLite store lookup: invalid table name')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Text,
                description: MobileServiceSqliteStore.ColumnType.String
            }
        }).then(function () {
            return store.lookup('*', [{ id: 'something', description: 'something' }]);
        }).then(function () {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('SQLite store lookup: invoked without any parameter')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Text,
                description: MobileServiceSqliteStore.ColumnType.String
            }
        }).then(function () {
            return store.lookup();
        }).then(function () {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('SQLite store lookup: verify deserialization error is handled properly')
    .checkAsync(function() {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.String,
                prop: MobileServiceSqliteStore.ColumnType.Real
            }
        }).then(function() {
            return store.upsert(testTableName, { id: '1', prop: 1.5 });
        }).then(function() {
            // Change table definition to introduce deserialization error;
            return store.defineTable({
                name: testTableName,
                columnDefinitions: {
                    id: MobileServiceSqliteStore.ColumnType.String,
                    prop: MobileServiceSqliteStore.ColumnType.Date
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
    return new MobileServiceSqliteStore(testDbFile);
}
