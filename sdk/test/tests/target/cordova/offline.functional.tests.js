// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/**
 * Functional tests for offline scenarios
 */

var Platform = require('Platforms/Platform'),
    Query = require('query.js').Query,
    pullManager = require('../../../../src/sync/pull'),
    MobileServiceSyncContext = require('../../../../src/sync/MobileServiceSyncContext'),
    MobileServiceClient = require('../../../../src/MobileServiceClient'),
    MobileServiceSqliteStore = require('Platforms/MobileServiceSqliteStore'),
    uuid = require('node-uuid'),
    storeTestHelper = require('./storeTestHelper');
    
var client = new MobileServiceClient('http://shrirs-js-dev.azurewebsites.net' /* TODO: Make this configurable */),
    syncContext = new MobileServiceSyncContext(client),
    testTableName = storeTestHelper.testTableName,
    table = client.getTable(testTableName),
    store;
    
$testGroup('offline tests')
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
            return syncContext.initialize(store);
        });
    }).tests(

    $test('insert and push')
    .checkAsync(function () {
        var query = new Query(testTableName),
            testId = uuid.v4();
            
        var record = {
            id: testId,
            text: 'inserted locally'
        }

        return syncContext.insert(testTableName, record).then(function() {
            return syncContext.push();
        }).then(function() {
            return table.lookup(testId);
        }).then(function(result) {
            $assert.areEqual(result.id, record.id);
            $assert.areEqual(result.text, record.text);
            record.text = 'updated locally';
            return syncContext.update(testTableName, record);
        }).then(function() {
            return syncContext.push();
        }).then(function() {
            return table.lookup(testId);
        }).then(function(result) {
            $assert.areEqual(result.id, record.id);
            $assert.areEqual(result.text, record.text);
            return syncContext.del(testTableName, {id: testId});
        }).then(function() {
            return syncContext.push();
        }).then(function(result) {
            // Success expected
        }, function(error) {
            $assert.fail(error);
            throw error;
        }).then(function(x) {
            return table.lookup(testId);
        }).then(function(result) {
            $assert.fail('should have failed to lookup the deleted item');
        }, function(error) {
            // Error expected
        });
    }),
    
    $test('pull deleted records')
    .checkAsync(function () {
        var query = new Query(testTableName),
            testId = uuid.v4();
        
        var record = {id: testId, text: 'something'};
        
        return table.insert(record).then(function() {
            return syncContext.pull(query);
        }).then(function() {
            return syncContext.lookup(testTableName, record.id);
        }).then(function(result) {
            $assert.areEqual(result.id, record.id);
            $assert.areEqual(result.text, record.text);
            record.text = 'updated';
            return table.update(record);
        }).then(function() {
            return syncContext.pull(query);
        }).then(function() {
            return syncContext.lookup(testTableName, testId);
        }).then(function(result) {
            $assert.areEqual(result.id, record.id);
            $assert.areEqual(result.text, record.text);
            return table.del(record);
        }).then(function() {
            return syncContext.pull(query);
        }).then(function() {
            return syncContext.lookup(testTableName, testId);
        }).then(function(result) {
            $assert.isNull(result);
        }, function(error) {
            $assert.fail(error);
        });
    })
);

