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

$testGroup('SQLiteStore tests')
    .beforeEachAsync(Platform.async( function(callback) {
        var db = window.sqlitePlugin.openDatabase({ name: testDbFile });

        // Delete table created by the unit tests
        db.executeSql('DROP TABLE IF EXISTS ' + testTableName, null, function() {
            callback();
        }, function(err) {
            callback(err);
        });
    })).tests(

    $test('defineTable: basic')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 101, price: 51.5 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer,
                price: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
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

    $test('defineTable: single column')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 101 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer
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

    $test('defineTable: add new columns')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 101, price: 51.5 },
            tableDefinition = {
                name: testTableName,
                columnDefinitions: {
                    id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer,
                    price: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
                }
            };

        return store.defineTable(tableDefinition).then(function () {
            return store.upsert(testTableName, row);
        }).then(function () {
            tableDefinition.columnDefinitions.newColumn = WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer;
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

    $test('defineTable: change type of existing column')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 101, flag: 51 },
            tableDefinition = {
                name: testTableName,
                columnDefinitions: {
                    id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer,
                    flag: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer
                }
            };

        return store.defineTable(tableDefinition).then(function () {
            return store.upsert(testTableName, row);
        }).then(function () {
            tableDefinition.columnDefinitions.flag = WindowsAzure.MobileServiceSQLiteStore.ColumnType.Boolean;
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

    $test('defineTable: table definition without table name')
    .checkAsync(function () {
        var tableDefinition = {
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer,
                flag: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer
            }
        };

        return createStore().defineTable(tableDefinition).then(function () {
            $assert.fail('test should fail');
        }, function (error) {
        });
    }),

    $test('defineTable: table definition with an invalid table name')
    .checkAsync(function () {
        var tableDefinition = {
            tableName: '*',
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer,
                flag: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer
            }
        };

        return createStore().defineTable(tableDefinition).then(function () {
            $assert.fail('test should fail');
        }, function (error) {
        });
    }),

    $test('defineTable: table definition without column definitions')
    .checkAsync(function () {
        var tableDefinition = {
            name: testTableName
        };

        return createStore().defineTable(tableDefinition).then(function () {
            $assert.fail('test should fail');
        }, function (error) {
        });
    }),

    $test('defineTable: table definition with an invalid column name')
    .checkAsync(function () {
        var tableDefinition = {
            tableName: '*',
            columnDefinitions: {}
        };

        tableDefinition.columnDefinitions.id = WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer;
        tableDefinition.columnDefinitions['*'] = WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer;

        return createStore().defineTable(tableDefinition).then(function () {
            $assert.fail('test should fail');
        }, function (error) {
        });
    }),

    $test('defineTable: primary key int')
    .checkAsync(function () {
        var store = createStore(),
            row1 = { id: 1, str: 'str1'},
            row2 = { id: 1, str: 'str2' },
            tableDefinition = {
                name: testTableName,
                columnDefinitions: {
                    id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer,
                    str: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Text
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

    $test('defineTable: primary key real')
    .checkAsync(function () {
        var store = createStore(),
            row1 = { id: 1.1, str: 'str1' },
            row2 = { id: 1.1, str: 'str2' },
            tableDefinition = {
                name: testTableName,
                columnDefinitions: {
                    id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real,
                    str: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Text
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

    $test('defineTable: primary key string')
    .checkAsync(function () {
        var store = createStore(),
            row1 = { id: '1', str: 'str1'},
            row2 = { id: '1', str: 'str2' },
            tableDefinition = {
                name: testTableName,
                columnDefinitions: {
                    id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                    str: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Text
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

    $test('defineTable: column definition invalid')
    .checkAsync(function () {
        var tableDefinition = {
            columnDefinitions: [
                WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer,
                WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer
            ]
        };

        return createStore().defineTable(tableDefinition).then(function () {
            $assert.fail('test should fail');
        }, function (error) {
        });
    }),

    $test('defineTable: id column missing from column definitions')
    .checkAsync(function () {
        var tableDefinition = {
            columnDefinitions: {
                flag: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer
            }
        };

        return createStore().defineTable(tableDefinition).then(function () {
            $assert.fail('test should fail');
        }, function (error) {
        });
    }),

    $test('defineTable: column type not supported')
    .checkAsync(function () {
        var tableDefinition = {
            columnDefinitions: {
                id: 'unsupportedtype',
                flag: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer
            }
        };

        return createStore().defineTable(tableDefinition).then(function () {
            $assert.fail('test should fail');
        }, function (error) {
        });
    }),

    $test('defineTable: column type undefined')
    .checkAsync(function () {
        var tableDefinition = {
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer,
                flag: undefined
            }
        };

        return createStore().defineTable(tableDefinition).then(function () {
            $assert.fail('test should fail');
        }, function (error) {
        });
    }),

    $test('defineTable: column type null')
    .checkAsync(function () {
        var tableDefinition = {
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer,
                flag: null
            }
        };

        return createStore().defineTable(tableDefinition).then(function () {
            $assert.fail('test should fail');
        }, function (error) {
        });
    }),

    $test('defineTable: invoked with extra parameters')
    .checkAsync(function () {
        return createStore().defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer,
                flag: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer,
                object: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Object
            }
        }, 'extra parameter').then(function() {
        }, function(error) {
            $assert.fail(error);
        });
    }),

    $test('defineTable: invoked with no parameter')
    .checkAsync(function () {
        return createStore().defineTable().then(function () {
            $assert.fail('failure expected');
        }, function(error) {
        });
    }),

    $test('defineTable: reading undefined columns should work')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 101, flag: 51, object: { 'a': 21 } },
            tableDefinition = {
                name: testTableName,
                columnDefinitions: {
                    id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer,
                    flag: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer,
                    object: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Object
                }
            };

        return store.defineTable(tableDefinition).then(function() {
            return store.upsert(testTableName, row);
        }).then(function () {
            // Now change column definition to only contain id column
            delete tableDefinition.columnDefinitions.flag;
            return store.defineTable(tableDefinition);
        }).then(function () {
            // Now read data inserted before changing column definition
            return store.lookup(testTableName, row.id);
        }).then(function (result) {
            // Check that the original data is read irrespective of whether the properties are defined by defineColumn
            $assert.areEqual(result, row);
        }, function (err) {
            $assert.fail(err);
        });
    }),

    $test('upsert when table is not defined')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 101, description: 'some description' };

        return store.upsert(testTableName, row).then(function (result) {
            $assert.fail('failure expected');
        }, function (err) {
        });
    }),

    $test('lookup when table is not defined')
    .checkAsync(function () {
        return createStore().lookup(testTableName, 'one').then(function (result) {
            $assert.fail('failure expected');
        }, function (err) {
        });
    }),

    $test('delete when table is not defined')
    .checkAsync(function () {
        return createStore().del(testTableName, 'one').then(function (result) {
            $assert.fail('failure expected');
        }, function (err) {
        });
    }),

    $test('read when table is not defined')
    .checkAsync(function () {
        return createStore().read(new Query(testTableName)).then(function (result) {
            $assert.fail('failure expected');
        }, function (err) {
        });
    }),

    $test('lookup: Id of type string')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 'someid', price: 51.5 };

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
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('lookup: Id of type integer')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 51, price: 51.5 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer,
                price: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
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

    $test('lookup: Id of type real')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 21.11, price: 51.5 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real,
                price: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
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

    $test('lookup: verify id case insensitivity')
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
            return store.upsert(testTableName, row);
        }).then(function () {
            return store.lookup(testTableName, 'abc');
        }).then(function (result) {
            $assert.areEqual(result, row);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('lookup: read columns that are missing in table definition')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 'ABC', column1: 1, column2: 2 },
            tableDefinition = {
                name: testTableName,
                columnDefinitions: {
                    id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Text,
                    column1: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer,
                    column2: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer
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

    $test('lookup: record not found')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer,
                price: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.lookup(testTableName, 'someid');
        }).then(function (result) {
            $assert.areEqual(result, null);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('lookup: invoked with extra parameters')
    .description('Check that promise returned by lookup is either resolved or rejected even when invoked with extra parameters')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer,
                price: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.lookup(testTableName, 'some id', 'extra param');
        }).then(function (result) {
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('lookup: null id')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer,
                price: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.lookup(testTableName, null);
        }).then(function (result) {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('lookup: id defined as undefined')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer,
                price: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.lookup(testTableName, undefined);
        }).then(function (result) {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('lookup: id property not defined')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer,
                price: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.lookup(testTableName, undefined);
        }).then(function (result) {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('lookup: invalid id')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer,
                price: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.lookup(testTableName, {invalid: 'invalid'});
        }).then(function (result) {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('lookup: null table name')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Text,
                description: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String
            }
        }).then(function () {
            return store.lookup(null, [{ id: 'something', description: 'something' }]);
        }).then(function () {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('lookup: undefined table name')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Text,
                description: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String
            }
        }).then(function () {
            return store.lookup(undefined, [{ id: 'something', description: 'something' }]);
        }).then(function () {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('lookup: invalid table name')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Text,
                description: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String
            }
        }).then(function () {
            return store.lookup('*', [{ id: 'something', description: 'something' }]);
        }).then(function () {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('lookup: no parameter')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Text,
                description: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String
            }
        }).then(function () {
            return store.lookup();
        }).then(function () {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('lookup: verify deserialization error is handled properly')
    .checkAsync(function() {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                prop: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function() {
            return store.upsert(testTableName, { id: '1', prop: 1.5 });
        }).then(function() {
            // Change table definition to introduce deserialization error;
            return store.defineTable({
                name: testTableName,
                columnDefinitions: {
                    id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                    prop: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Date
                }
            });
        }).then(function() {
            return store.lookup(testTableName, '1');
        }).then(function(result) {
            $assert.fail('lookup should have failed');
        }, function(error) {
        });
    }),

    $test('Serialization: roundtripping verification non-null values')
    .checkAsync(function () {
        var store = createStore(),
            row = {
                id: 'someid',
                object: {
                    int: 1,
                    string: 'str1'
                },
                array: [
                    2,
                    'str2',
                    {
                        int: 3,
                        array: [4, 5, 6]
                    }
                ],
                integer: 7,
                int: 8,
                float: 8.5,
                real: 9.5,
                string: 'str3',
                text: 'str4',
                boolean: true,
                bool: false,
                date: new Date(2015, 11, 11, 23, 5, 59)
            };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                object: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Object,
                array: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Array,
                integer: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer,
                int: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Int,
                float: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Float,
                real: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real,
                string: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                text: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Text,
                boolean: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Boolean,
                bool: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Bool,
                date: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Date
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

    $test('Serialization: roundtripping verification null values')
    .checkAsync(function () {
        var store = createStore(),
            row = {
                id: '1',
                object: null,
                array: null,
                integer: null,
                int: null,
                float: null,
                real: null,
                string: null,
                text: null,
                boolean: null,
                bool: null,
                date: null,
            };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                object: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Object,
                array: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Array,
                integer: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer,
                int: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Int,
                float: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Float,
                real: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real,
                string: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                text: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Text,
                boolean: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Boolean,
                bool: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Bool,
                date: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Date
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

    $test('upsert: insert new record and then update it')
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

    $test('upsert: array of records, all having the same id')
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

    $test('upsert: adding record with columns that are not defined should fail')
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

    $test('upsert: update select properties of an existing record')
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

    $test('upsert: verify id case insensitivity')
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
            // record with an upper cased id
            return store.upsert(testTableName, { id: 'ABC', description: 'old' });
        }).then(function () {
            // update record using a lower cased id
            return store.upsert(testTableName, { id: 'abc', description: 'new' });
        }).then(function () {
            // lookup record using upper cased id
            return store.lookup(testTableName, 'ABC');
        }).then(function (result) {
            $assert.areEqual(result, { id: 'ABC', description: 'new' });
            // lookup record using lower cased id
            return store.lookup(testTableName, 'abc');
        }).then(function (result) {
            $assert.areEqual(result, { id: 'ABC', description: 'new' });
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('upsert: insert array of records with null values')
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

    $test('upsert: empty table name')
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

    $test('upsert: null table name')
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

    $test('upsert: undefined table name')
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

    $test('upsert: invalid table name')
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

    $test('upsert: empty array')
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

    $test('upsert: record is null')
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

    $test('upsert: record is undefined')
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

    $test('upsert: adding record with columns that are not defined should fail')
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

    $test('upsert: adding record with incorrect column type should fail')
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

    $test('upsert: record is not an object')
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

    $test('upsert: record without id property')
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

    $test('upsert: record id is null')
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

    $test('upsert: record id is defined as undefined')
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

    $test('upsert: record does not have an id')
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

    $test('upsert: invoked with extra parameters')
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

    $test('upsert: no parameter')
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

    $test('upsert: verify serialization error is handled properly')
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
    }),

    $test('delete: id of type string')
    .checkAsync(function () {
        var store = createStore(),
            row1 = { id: 'id1', prop1: 100, prop2: 200 },
            row2 = { id: 'id2', prop1: 100, prop2: 200 },
            row3 = { id: 'id3', prop1: 100, prop2: 200 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                prop1: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real,
                prop2: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, [row1, row2, row3]);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row1, row2, row3]);
        }).then(function () {
            // Specify a single id to delete
            return store.del(testTableName, row1.id);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row2, row3]);
            // Specify an array of ids to delete
            return store.del(testTableName, [row2.id, row3.id]);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, []);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('delete: id of type int')
    .checkAsync(function () {
        var store = createStore(),
            row1 = { id: 101, prop1: 100, prop2: 200 },
            row2 = { id: 102, prop1: 100, prop2: 200 },
            row3 = { id: 103, prop1: 100, prop2: 200 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Integer,
                prop1: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real,
                prop2: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, [row1, row2, row3]);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row1, row2, row3]);
        }).then(function () {
            // Specify a single id to delete
            return store.del(testTableName, row1.id);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row2, row3]);
            // Specify an array of ids to delete
            return store.del(testTableName, [row2.id, row3.id]);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, []);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('delete: id of type real')
    .checkAsync(function () {
        var store = createStore(),
            row1 = { id: 1.5, prop1: 100, prop2: 200 },
            row2 = { id: 2.5, prop1: 100, prop2: 200 },
            row3 = { id: 3.5, prop1: 100, prop2: 200 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real,
                prop1: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real,
                prop2: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, [row1, row2, row3]);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row1, row2, row3]);
        }).then(function () {
            // Specify a single id to delete
            return store.del(testTableName, row1.id);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row2, row3]);
            // Specify an array of ids to delete
            return store.del(testTableName, [row2.id, row3.id]);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, []);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('del: verify id case insensitivity')
    .checkAsync(function () {
        var store = createStore(),
            row1 = { id: 'ABC_def_Yz1', description: 'something' },
            row2 = { id: 'ABC_def_Yz2', description: 'something' },
            row3 = { id: 'ABC_def_Yz3', description: 'something' };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Text,
                description: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String
            }
        }).then(function () {
            return store.upsert(testTableName, [row1, row2, row3]);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row1, row2, row3]);
            // Specify a single id to delete
            return store.del(testTableName, 'abc_DEF_Yz1');
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row2, row3]);
            // Specify an array of ids to delete
            return store.del(testTableName, ['abc_DEF_Yz2', 'abc_DEF_Yz3']);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, []);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('delete: record not found')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 'id1', description: 'something' };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Text,
                description: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String
            }
        }).then(function () {
            return store.upsert(testTableName, [row]);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row]);
            // Specify a single id to delete
            return store.del(testTableName, 'notfound1');
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row]);
            // Specify an array of ids to delete
            return store.del(testTableName, ['notfound2', 'notfound3']);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row]);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('delete: empty array')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Text,
                description: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String
            }
        }).then(function () {
            return store.del(testTableName, []);
        }).then(function () {
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('delete: null id')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 'id1', description: 'something' };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Text,
                description: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String
            }
        }).then(function () {
            return store.upsert(testTableName, [row]);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row]);
            // Specify a single id to delete
            return store.del(testTableName, null);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row]);
            // Specify an array of ids to delete
            return store.del(testTableName, [null, row.id]);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, []);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('delete: id specified as undefined')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 'id1', description: 'something' };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Text,
                description: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String
            }
        }).then(function () {
            return store.upsert(testTableName, [row]);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row]);
            // Specify a single id to delete
            return store.del(testTableName, undefined);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row]);
            // Specify an array of ids to delete
            return store.del(testTableName, [undefined, row.id]);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, []);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('delete: id not specified')
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
            return store.upsert(testTableName, { id: 'someid', prop1: 100, prop2: 200 });
        }).then(function () {
            return store.del(testTableName);
        }).then(function () {
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('delete: a single invalid id')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 'someid', prop1: 100, prop2: 200 },
            testError;

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                prop1: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real,
                prop2: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, row);
        }).then(function (result) {
            // Specify a single id to delete
            return store.del(testTableName, { id: 'this object is an invalid id' });
        }).then(function () {
            testError = 'delete should have failed';
        }, function (error) {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.isNull(testError);
            $assert.areEqual(result, [row]);
        }, function (error) {
            $assert.isNull(testError);
            $assert.fail(error);
        });
    }),

    $test('delete: array of ids containing an invalid id')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 'validid', prop1: 100, prop2: 200 },
            testError;

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                prop1: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real,
                prop2: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, row);
        }).then(function (result) {
            // Specify an array of ids to delete
            return store.del(testTableName, [{ id: 'this object is an invalid id' }, 'validid']);
        }).then(function () {
            testError = 'delete should have failed';
        }, function (error) {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.isNull(testError);
            $assert.areEqual(result, [row]);
        }, function (error) {
            $assert.isNull(testError);
            $assert.fail(error);
        });
    }),

    $test('delete: null table name')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 'validid', prop1: 100, prop2: 200 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                prop1: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real,
                prop2: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, row);
        }).then(function () {
            return store.del(null, 'validid');
        }).then(function () {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('delete: undefined table name')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 'validid', prop1: 100, prop2: 200 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                prop1: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real,
                prop2: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, row);
        }).then(function () {
            return store.del(undefined, 'validid');
        }).then(function () {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('delete: empty table name')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 'validid', prop1: 100, prop2: 200 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                prop1: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real,
                prop2: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, row);
        }).then(function () {
            return store.del('', 'validid');
        }).then(function () {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('delete: invalid table name')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 'validid', prop1: 100, prop2: 200 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                prop1: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real,
                prop2: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert('*', row);
        }).then(function () {
            return store.del(undefined, 'validid');
        }).then(function () {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('delete: no parameter')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Text,
                description: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String
            }
        }).then(function () {
            return store.del();
        }).then(function () {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('delete: invoked with table name and extra parameters')
    .description('Check that promise returned by upsert is either resolved or rejected even when invoked with extra parameters')
    .checkAsync(function () {
        var store = createStore(),
            row1 = { id: 'someid1', prop1: 100, prop2: 200 },
            row2 = { id: 'someid2', prop1: 100, prop2: 200 },
            row3 = { id: 'someid3', prop1: 100, prop2: 200 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                prop1: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real,
                prop2: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, [row1, row2, row3]);
        }).then(function () {
            // Specify a single id to delete
            return store.del(testTableName, row1.id, 'extra param');
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row2, row3]);
        }).then(function () {
            // Specify an array of ids to delete
            return store.del(testTableName, [row2.id, row3.id], 'extra param');
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, []);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('delete: basic query')
    .checkAsync(function () {
        var store = createStore(),
            row1 = { id: 'someid1', prop1: 'abc', prop2: 200 },
            row2 = { id: 'someid2', prop1: 'abc', prop2: 100 },
            row3 = { id: 'someid3', prop1: 'def', prop2: 200 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                prop1: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                prop2: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, [row1, row2, row3]);
        }).then(function () {
            return store.del(new Query(testTableName));
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, []);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('delete: query using where')
    .checkAsync(function () {
        var store = createStore(),
            row1 = { id: 'someid1', prop1: 'abc', prop2: 200 },
            row2 = { id: 'someid2', prop1: 'abc', prop2: 100 },
            row3 = { id: 'someid3', prop1: 'def', prop2: 200 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                prop1: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                prop2: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, [row1, row2, row3]);
        }).then(function () {
            var query = new Query(testTableName);
            return store.del(query.where(function () {
                return this.prop1 === 'abc';
            }));
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row3]);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('delete: query using multiple clauses')
    .checkAsync(function () {
        var store = createStore(),
            row1 = { id: 'someid1', prop1: 'a', prop2: 100 },
            row2 = { id: 'someid2', prop1: 'b', prop2: 100 },
            row3 = { id: 'someid3', prop1: 'c', prop2: 100 },
            row4 = { id: 'someid4', prop1: 'd', prop2: 100 },
            row5 = { id: 'someid5', prop1: 'e', prop2: 200 },
            row6 = { id: 'someid6', prop1: 'str', prop2: 100 },
            row7 = { id: 'someid7', prop1: 'str', prop2: 100 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                prop1: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                prop2: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, [row1, row2, row3, row4, row5, row6, row7]);
        }).then(function () {
            var query = new Query(testTableName);
            return store.del(query.where(function (limit) {
                return this.prop1 !== 'str' && this.prop2 < limit;
            }, 150).select('id', 'prop1').skip(2).take(1).orderByDescending('prop1').includeTotalCount());
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row1, row3, row4, row5, row6, row7]);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('delete: query matching no records')
    .checkAsync(function () {
        var store = createStore(),
            row1 = { id: 'someid1', prop1: 'a', prop2: 100 },
            row2 = { id: 'someid2', prop1: 'b', prop2: 100 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                prop1: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                prop2: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, [row1, row2]);
        }).then(function () {
            var query = new Query(testTableName);
            return store.del(query.where(function () {
                return false;
            }));
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row1, row2]);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('delete: invoked with query and extra parameters')
    .description('Check that promise returned by upsert is either resolved or rejected even when invoked with extra parameters')
    .checkAsync(function () {
        var store = createStore(),
            row1 = { id: 'someid1', prop1: 100, prop2: 200 },
            row2 = { id: 'someid2', prop1: 100, prop2: 200 },
            row3 = { id: 'someid3', prop1: 100, prop2: 200 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                prop1: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real,
                prop2: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, [row1, row2, row3]);
        }).then(function () {
            return store.del(new Query(testTableName), 'extra param');
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, []);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('read: Read entire table')
    .checkAsync(function () {
        var store = createStore(),
            rows = [{ id: 1, int: 101, str: 'text1' }, { id: 2, int: 102, str: 'text2' }];

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Int,
                int: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Int,
                str: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Text
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

    $test('read: simple select')
    .checkAsync(function () {
        var store = createStore(),
            rows = [{ id: 1, int: 101, str: 'text1' }];

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Int,
                int: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Int,
                str: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Text
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

    $test('read: select invalid columns')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 1, int: 101, str: 'text1' };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Int,
                int: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Int,
                str: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Text
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

    $test('read: select same columns more than once')
    .checkAsync(function () {
        var store = createStore(),
            row1 = { id: 1, int: 101, str: 'text1' },
            row2 = { id: 2, int: 102, str: 'text2' },
            row3 = { id: 3, int: 103, str: 'text3' },
            rows = [row1, row2, row3];

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Int,
                int: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Int,
                str: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Text
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

    $test('read: query referencing non-existent table')
    .checkAsync(function () {
        var store = createStore();

        return store.read(new Query('nonexistenttable')).then(function (results) {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('read: query referencing invalid table name')
    .checkAsync(function () {
        var store = createStore();

        return store.read(new Query('*')).then(function (results) {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('read: no parameter')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Text,
                description: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String
            }
        }).then(function () {
            return store.read();
        }).then(function () {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('read: invoked with extra parameters')
    .description('Check that promise returned by read is either resolved or rejected even when invoked with extra parameters')
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
            return store.read(new Query(testTableName), 'extra param');
        }).then(function (result) {
            $assert.areEqual(result, []);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('read: verify deserialization error is handled properly')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.String,
                prop: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, {id: '1', prop: 1.5});
        }).then(function () {
            // Change table definition to introduce deserialization error;
            return store.defineTable({
                name: testTableName,
                columnDefinitions: {
                    id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Date,
                    prop: WindowsAzure.MobileServiceSQLiteStore.ColumnType.Real
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
    return new WindowsAzure.MobileServiceSQLiteStore(testDbFile);
}

