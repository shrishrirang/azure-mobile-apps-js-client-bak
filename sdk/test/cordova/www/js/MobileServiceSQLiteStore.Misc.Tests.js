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

$testGroup('Miscellaneous SQLiteStore tests')
    .beforeEachAsync(Platform.async( function(callback) {
        var db = window.sqlitePlugin.openDatabase({ name: testDbFile });

        // Delete table created by the unit tests
        db.executeSql('DROP TABLE IF EXISTS ' + testTableName, null, function() {
            callback();
        }, function(err) {
            callback(err);
        });
    })).tests(

    $test('Roundtripping: non-null property values')
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

    $test('Roundtripping: null property values')
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
    })
);

function createStore() {
    return new WindowsAzure.MobileServiceSQLiteStore(testDbFile);
}
