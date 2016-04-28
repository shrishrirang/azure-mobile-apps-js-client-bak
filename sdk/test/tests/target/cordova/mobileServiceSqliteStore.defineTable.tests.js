// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/**
 * @file MobileServiceSqliteStore.defineTable(..) unit tests
 */

var Platform = require('Platforms/Platform'),
    Query = require('query.js').Query,
    MobileServiceSqliteStore = require('Platforms/MobileServiceSqliteStore'),
    testTableName = 'sometable';
    testDbFile = 'somedbfile.db';

$testGroup('SQLiteStore - defineTable tests')

    // Clear the test table before running each test.
    .beforeEachAsync(Platform.async( function(callback) {
        var db = window.sqlitePlugin.openDatabase({ name: testDbFile, location: 'default' });

        // Delete table created by the unit tests
        db.executeSql('DROP TABLE IF EXISTS ' + testTableName, null, function() {
            callback();
        }, function(err) {
            callback(err);
        });
    })).tests(

    $test('basic table definition')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 101, price: 51.5 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
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

    $test('table definition containing a single column')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 101 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer
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

    $test('add new columns to existing table')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 101, price: 51.5 },
            tableDefinition = {
                name: testTableName,
                columnDefinitions: {
                    id: MobileServiceSqliteStore.ColumnType.Integer,
                    price: MobileServiceSqliteStore.ColumnType.Real
                }
            };

        return store.defineTable(tableDefinition).then(function () {
            return store.upsert(testTableName, row);
        }).then(function () {
            tableDefinition.columnDefinitions.newColumn = MobileServiceSqliteStore.ColumnType.Integer;
            return store.defineTable(tableDefinition);
        }).then(function () {
            return store.lookup(testTableName, row.id);
        }).then(function (result) {
            // Expect a null value for the newly added column
            row.newColumn = null;
            $assert.areEqual(result, row);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('change type of existing columns')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 101, flag: 51 },
            tableDefinition = {
                name: testTableName,
                columnDefinitions: {
                    id: MobileServiceSqliteStore.ColumnType.Integer,
                    flag: MobileServiceSqliteStore.ColumnType.Integer
                }
            };

        return store.defineTable(tableDefinition).then(function () {
            return store.upsert(testTableName, row);
        }).then(function () {
            // Change type of the flag column from Integer to Boolean
            tableDefinition.columnDefinitions.flag = MobileServiceSqliteStore.ColumnType.Boolean;
            return store.defineTable(tableDefinition);
        }).then(function () {
            return store.lookup(testTableName, row.id);
        }).then(function (result) {
            row.flag = true;
            $assert.areEqual(result, row);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('table definition without table name')
    .checkAsync(function () {
        var tableDefinition = {
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                flag: MobileServiceSqliteStore.ColumnType.Integer
            }
        };

        return createStore().defineTable(tableDefinition).then(function () {
            $assert.fail('test should fail');
        }, function (error) {
        });
    }),

    $test('table definition with an invalid table name')
    .checkAsync(function () {
        var tableDefinition = {
            tableName: '*',
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                flag: MobileServiceSqliteStore.ColumnType.Integer
            }
        };

        return createStore().defineTable(tableDefinition).then(function () {
            $assert.fail('test should fail');
        }, function (error) {
        });
    }),

    $test('table definition with column definitions missing')
    .checkAsync(function () {
        var tableDefinition = {
            name: testTableName
        };

        return createStore().defineTable(tableDefinition).then(function () {
            $assert.fail('test should fail');
        }, function (error) {
        });
    }),

    $test('table definition with an invalid column name')
    .checkAsync(function () {
        var tableDefinition = {
            tableName: '*',
            columnDefinitions: {}
        };

        tableDefinition.columnDefinitions.id = MobileServiceSqliteStore.ColumnType.Integer;
        tableDefinition.columnDefinitions['*'] = MobileServiceSqliteStore.ColumnType.Integer;

        return createStore().defineTable(tableDefinition).then(function () {
            $assert.fail('test should fail');
        }, function (error) {
        });
    }),

    $test('table definition with primary key of type int')
    .checkAsync(function () {
        var store = createStore(),
            row1 = { id: 1, str: 'str1'},
            row2 = { id: 1, str: 'str2' },
            tableDefinition = {
                name: testTableName,
                columnDefinitions: {
                    id: MobileServiceSqliteStore.ColumnType.Integer,
                    str: MobileServiceSqliteStore.ColumnType.Text
                }
            };

        return store.defineTable(tableDefinition).then(function() {
            return store.upsert(testTableName, [row1, row2]);
        }).then(function() {
            return store.read(new Query(testTableName));
        }).then(function(result) {
            $assert.areEqual(result, [row2]);
        }, function(error) {
            $assert.fail(error);
        });
    }),

    $test('table definition with primary key of type real')
    .checkAsync(function () {
        var store = createStore(),
            row1 = { id: 1.1, str: 'str1' },
            row2 = { id: 1.1, str: 'str2' },
            tableDefinition = {
                name: testTableName,
                columnDefinitions: {
                    id: MobileServiceSqliteStore.ColumnType.Real,
                    str: MobileServiceSqliteStore.ColumnType.Text
                }
            };

        return store.defineTable(tableDefinition).then(function () {
            return store.upsert(testTableName, [row1, row2]);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row2]);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('table definition with primary key of type string')
    .checkAsync(function () {
        var store = createStore(),
            row1 = { id: '1', str: 'str1'},
            row2 = { id: '1', str: 'str2' },
            tableDefinition = {
                name: testTableName,
                columnDefinitions: {
                    id: MobileServiceSqliteStore.ColumnType.String,
                    str: MobileServiceSqliteStore.ColumnType.Text
                }
            };

        return store.defineTable(tableDefinition).then(function() {
            return store.upsert(testTableName, [row1, row2]);
        }).then(function() {
            return store.read(new Query(testTableName));
        }).then(function(result) {
            $assert.areEqual(result, [row2]);
        }, function(error) {
            $assert.fail(error);
        });
    }),

    $test('invalid column definition')
    .checkAsync(function () {
        var tableDefinition = {
            columnDefinitions: [
                MobileServiceSqliteStore.ColumnType.Integer,
                MobileServiceSqliteStore.ColumnType.Integer
            ]
        };

        return createStore().defineTable(tableDefinition).then(function () {
            $assert.fail('test should fail');
        }, function (error) {
        });
    }),

    $test('id column missing from column definitions')
    .checkAsync(function () {
        var tableDefinition = {
            columnDefinitions: {
                flag: MobileServiceSqliteStore.ColumnType.Integer
            }
        };

        return createStore().defineTable(tableDefinition).then(function () {
            $assert.fail('test should fail');
        }, function (error) {
        });
    }),

    $test('unsupported column type in table definition')
    .checkAsync(function () {
        var tableDefinition = {
            columnDefinitions: {
                id: 'unsupportedtype',
                flag: MobileServiceSqliteStore.ColumnType.Integer
            }
        };

        return createStore().defineTable(tableDefinition).then(function () {
            $assert.fail('test should fail');
        }, function (error) {
        });
    }),

    $test('undefined column type in table definition')
    .checkAsync(function () {
        var tableDefinition = {
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                flag: undefined
            }
        };

        return createStore().defineTable(tableDefinition).then(function () {
            $assert.fail('test should fail');
        }, function (error) {
        });
    }),

    $test('null column type in table definition')
    .checkAsync(function () {
        var tableDefinition = {
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                flag: null
            }
        };

        return createStore().defineTable(tableDefinition).then(function () {
            $assert.fail('test should fail');
        }, function (error) {
        });
    }),

    $test('method invoked with extra parameters')
    .checkAsync(function () {
        return createStore().defineTable({
                name: testTableName,
                columnDefinitions: {
                    id: MobileServiceSqliteStore.ColumnType.Integer,
                    flag: MobileServiceSqliteStore.ColumnType.Integer,
                    object: MobileServiceSqliteStore.ColumnType.Object
                }
            },
            'extra parameter'
        ).then(function() {
        }, function(error) {
            $assert.fail(error);
        });
    }),

    $test('invoked with no parameter')
    .checkAsync(function () {
        return createStore().defineTable().then(function () {
            $assert.fail('failure expected');
        }, function(error) {
        });
    })
);

function createStore() {
    return new MobileServiceSqliteStore(testDbFile);
}
