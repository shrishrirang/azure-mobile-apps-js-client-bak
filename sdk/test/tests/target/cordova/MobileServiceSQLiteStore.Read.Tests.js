// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/**
 * @file MobileServiceSQLiteStore.read(..) unit tests
 */

var Platform = require('Platforms/Platform'),
    Query = require('query.js').Query,
    MobileServiceSQLiteStore = require('Platforms/MobileServiceSQLiteStore'),
    testTableName = 'sometable',
    testDbFile = 'somedbfile.db';

$testGroup('SQLiteStore read tests')

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

    $test('SQLite store read: table not defined')
    .checkAsync(function () {
        return createStore().read(new Query(testTableName)).then(function (result) {
            $assert.fail('failure expected');
        }, function (err) {
        });
    }),

    $test('SQLite store read: Read entire table')
    .checkAsync(function () {
        var store = createStore(),
            rows = [{ id: 1, int: 101, str: 'text1' }, { id: 2, int: 102, str: 'text2' }];

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.Int,
                int: MobileServiceSQLiteStore.ColumnType.Int,
                str: MobileServiceSQLiteStore.ColumnType.Text
            }
        }).then(function () {
            return store.upsert(testTableName, rows);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (results) {
            $assert.areEqual(results, rows);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('SQLite store read: simple select')
    .checkAsync(function () {
        var store = createStore(),
            rows = [{ id: 1, int: 101, str: 'text1' }];

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.Int,
                int: MobileServiceSQLiteStore.ColumnType.Int,
                str: MobileServiceSQLiteStore.ColumnType.Text
            }
        }).then(function () {
            return store.upsert(testTableName, rows);
        }).then(function () {
            var query = new Query(testTableName);
            return store.read(query.select('str', 'int'));
        }).then(function (results) {
            $assert.areEqual(results, rows.map(function (obj) {
                return {
                    str: obj.str,
                    int: obj.int
                };
            }));
        }, function (error) {
        });
    }),

    $test('SQLite store read: select invalid columns')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 1, int: 101, str: 'text1' };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.Int,
                int: MobileServiceSQLiteStore.ColumnType.Int,
                str: MobileServiceSQLiteStore.ColumnType.Text
            }
        }).then(function () {
            return store.upsert(testTableName, row);
        }).then(function () {
            var query = new Query(testTableName);
            return store.read(query.select('invalid column'));
        }).then(function (results) {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('SQLite store read: select same columns more than once')
    .checkAsync(function () {
        var store = createStore(),
            row1 = { id: 1, int: 101, str: 'text1' },
            row2 = { id: 2, int: 102, str: 'text2' },
            row3 = { id: 3, int: 103, str: 'text3' },
            rows = [row1, row2, row3];

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.Int,
                int: MobileServiceSQLiteStore.ColumnType.Int,
                str: MobileServiceSQLiteStore.ColumnType.Text
            }
        }).then(function () {
            return store.upsert(testTableName, rows);
        }).then(function () {
            var query = new Query(testTableName);
            return store.read(query.select('id', 'id', 'str', 'str'));
        }).then(function (results) {
            $assert.areEqual(results, rows.map(function (obj) {
                return {
                    id: obj.id,
                    str: obj.str
                };
            }));
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('SQLite store read: query a non-existent table')
    .checkAsync(function () {
        var store = createStore();

        return store.read(new Query('nonexistenttable')).then(function (results) {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('SQLite store read: query an invalid table name')
    .checkAsync(function () {
        var store = createStore();

        return store.read(new Query('*')).then(function (results) {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('SQLite store read: read performed without any arguments')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.Text,
                description: MobileServiceSQLiteStore.ColumnType.String
            }
        }).then(function () {
            return store.read();
        }).then(function () {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('SQLite store read: read invoked with extra parameters')
    .description('Check that promise returned by read is either resolved or rejected even when invoked with extra parameters')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.String,
                prop1: MobileServiceSQLiteStore.ColumnType.Real,
                prop2: MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.read(new Query(testTableName), 'extra param');
        }).then(function (result) {
            $assert.areEqual(result, []);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('SQLite store read: verify deserialization error is handled properly')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.String,
                prop: MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, {id: 'not-an-integer', prop: 1.5});
        }).then(function () {
            // Change table definition to introduce deserialization error;
            return store.defineTable({
                name: testTableName,
                columnDefinitions: {
                    id: MobileServiceSQLiteStore.ColumnType.Integer,
                    prop: MobileServiceSQLiteStore.ColumnType.Real
                }
            });
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.fail('test should have failed');
        }, function (error) {
        });
    })
);

function createStore() {
    return new MobileServiceSQLiteStore(testDbFile);
}

