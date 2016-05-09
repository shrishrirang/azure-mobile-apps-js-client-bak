﻿// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/**
 * @file Miscellaneous MobileServiceSqliteStore unit tests
 */

var Platform = require('Platforms/Platform'),
    Query = require('query.js').Query,
    MobileServiceSqliteStore = require('Platforms/MobileServiceSqliteStore'),
    testTableName = 'sometable',
    testDbFile = 'somedbfile.db';

$testGroup('SQLiteStore - miscellaneous tests')

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

    $test('Roundtrip non-null property values')
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
                id: MobileServiceSqliteStore.ColumnType.String,
                object: MobileServiceSqliteStore.ColumnType.Object,
                array: MobileServiceSqliteStore.ColumnType.Array,
                integer: MobileServiceSqliteStore.ColumnType.Integer,
                int: MobileServiceSqliteStore.ColumnType.Int,
                float: MobileServiceSqliteStore.ColumnType.Float,
                real: MobileServiceSqliteStore.ColumnType.Real,
                string: MobileServiceSqliteStore.ColumnType.String,
                text: MobileServiceSqliteStore.ColumnType.Text,
                boolean: MobileServiceSqliteStore.ColumnType.Boolean,
                bool: MobileServiceSqliteStore.ColumnType.Bool,
                date: MobileServiceSqliteStore.ColumnType.Date
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

    $test('Roundtrip null property values')
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
                id: MobileServiceSqliteStore.ColumnType.String,
                object: MobileServiceSqliteStore.ColumnType.Object,
                array: MobileServiceSqliteStore.ColumnType.Array,
                integer: MobileServiceSqliteStore.ColumnType.Integer,
                int: MobileServiceSqliteStore.ColumnType.Int,
                float: MobileServiceSqliteStore.ColumnType.Float,
                real: MobileServiceSqliteStore.ColumnType.Real,
                string: MobileServiceSqliteStore.ColumnType.String,
                text: MobileServiceSqliteStore.ColumnType.Text,
                boolean: MobileServiceSqliteStore.ColumnType.Boolean,
                bool: MobileServiceSqliteStore.ColumnType.Bool,
                date: MobileServiceSqliteStore.ColumnType.Date
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

    $test('Read table with columns missing from table definition')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 101, flag: 51, object: { 'a': 21 } },
            tableDefinition = {
                name: testTableName,
                columnDefinitions: {
                    id: MobileServiceSqliteStore.ColumnType.Integer,
                    flag: MobileServiceSqliteStore.ColumnType.Integer,
                    object: MobileServiceSqliteStore.ColumnType.Object
                }
            };

        return store.defineTable(tableDefinition).then(function () {
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

    $test('Verify MobileServiceSqliteStore initialization works as expected with the new operator')
    .check(function () {
        var store = new MobileServiceSqliteStore('somedbname');
        $assert.isNotNull(store._db);
    }),
    
    $test('Verify MobileServiceSqliteStore initialization works as expected without the new operator')
    .check(function () {
        var store = MobileServiceSqliteStore('somedbname');
        $assert.isNotNull(store, 'somedbname');
        $assert.isNotNull(store._db);
    })
);

function createStore() {
    return new MobileServiceSqliteStore(testDbFile);
}