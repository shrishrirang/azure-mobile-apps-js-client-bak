// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/// <reference path="C:\Program Files (x86)\Microsoft SDKs\Windows\v8.0\ExtensionSDKs\Microsoft.WinJS.1.0\1.0\DesignTime\CommonConfiguration\Neutral\Microsoft.WinJS.1.0\js\base.js" />
/// <reference path="C:\Program Files (x86)\Microsoft SDKs\Windows\v8.0\ExtensionSDKs\Microsoft.WinJS.1.0\1.0\DesignTime\CommonConfiguration\Neutral\Microsoft.WinJS.1.0\js\ui.js" />
/// <reference path=".\Generated\Tests.js" />
/// <reference path=".\Generated\MobileServices.Cordova.Internals.js" />

var Validate = require('Validate');

var testServiceUrl = "http://test.com";
var testServiceKey = "key";
var testTableName = "items";
var testDbFile = "test.db";

function createMobileServiceClient() {
	return new WindowsAzure.MobileServiceClient(testServiceUrl, testServiceKey);
}

function createStore() {
    return new WindowsAzure.MobileServiceSQLiteStore(testDbFile);
}

// TODO(shrirs): Add detailed UTs
$testGroup('Offline tests',

    $test('Basic test')
    .description('Checks basic scenarios')
    .checkAsync(function () {

        var client = createMobileServiceClient(),
            store = createStore(),
            row = {
                "id": "abcdef",
                "description": "Some description. How does it matter?",
                "price": 10.01
            };

        client.getSyncContext().initialize(store);

        var syncTable = client.getSyncTable(testTableName);

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: WindowsAzure.MobileServiceSQLiteStore.ColumnType.TEXT,
                description: WindowsAzure.MobileServiceSQLiteStore.ColumnType.TEXT,
                price: WindowsAzure.MobileServiceSQLiteStore.ColumnType.INTEGER
            }
        }).then(function () {
            // Insert an item if it exists
            row.id = "ABCDEF";
            return syncTable.del(row);
        }).then(function () {
            row.id = "ABCDEF";
            return syncTable.insert(row);
        }).then(function (result) {
            $assert.isNotNull(result);
            $assert.areEqual(result.id, "ABCDEF");
            return syncTable.del(row);
        }).then(function () {
            row.id = "ABCDEF";
            return syncTable.insert(row);
        }).then(function (result) {
            $assert.isNotNull(result);
            $assert.areEqual(result.id, "ABCDEF");
            $assert.areEqual(result.description, "Some description. How does it matter?");
            row.id = "ABCDEF";
            row.description = "new description";
            return syncTable.update(row);
        }).then(function () {
            return syncTable.lookup("ABCDEF");
        }).then(function (result) {
            $assert.areEqual(result.id, "ABCDEF");
            return syncTable.lookup("abcdef"); // different case lookup
        }).then(function (result) {
            $assert.areEqual(result.id, "ABCDEF");
            $assert.areEqual(row.description, "new description");
            row.id = "nullid1";
            row.description = null;
            return syncTable.update(row);
        }).then(function () {
            row.id = "nullid2";
            row.description = null;
            return syncTable.update(row);
        }).then(function () {
            row.id = "nullid3";
            row.description = null;
            return syncTable.update(row);
        }).then(function () {
            return syncTable.where({
                id: "nullid3"
            }).read();
        }).then(function (result) {
            $assert.areEqual(result.length, 1);
            $assert.areEqual(result[0].description, null);
            $assert.areEqual(result[0].id, "nullid3");
            return syncTable.where(function () {
                return true;
            }).read();
        }).then(function (result) {
            $assert.areEqual(result.length, 4);
            return syncTable.read();
        }).then(function (result) {
            $assert.areEqual(result.length, 4);
            return syncTable.includeTotalCount().where(function () {
                return true;
            }).read();
        }).then(function (result) {
            $assert.isNotNull(result.result);
            $assert.areEqual(result.count, 4);
            $assert.areEqual(result.result.length, 4);

            return syncTable.where(function () {
                return true;
            }).skip(1).read();
        }).then(function (result) {
            $assert.areEqual(result.length, 3);

            return syncTable.where(function () {
                return true;
            }).take(1).read();
        }).then(function (result) {
            $assert.areEqual(result.length, 1);

            return syncTable.where(function () {
                return true;
            }).skip(1).take(2).read();
        }).then(function (result) {
            $assert.areEqual(result.length, 2);

            return syncTable.where(function () {
                return false;
            }).read();
        }).then(function (result) {
            $assert.areEqual(result.length, 0);

            return syncTable.where(function () {
                return this.id === "nullid1";
            }).read();
        }).then(function (result) {
            $assert.areEqual(result.length, 1);
            $assert.areEqual(result[0].id, "nullid1");

            return syncTable.where(function () {
                return this.description !== null;
            }).read();
        }).then(function (result) {
            $assert.areEqual(result.length, 1);

            return syncTable.where(function (myid) {
                return this.id === myid;
            }, "nullid3").read();
        }).then(function (result) {
            $assert.areEqual(result.length, 1);
        }).then(function (result) {
        }, function (err) {
            throw err;
        });
    })
);
