// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

var Platform = require('Platforms/Platform'),
    Query = require('query.js').Query,
    pullManager = require('../../../../src/sync/pull'),
    MobileServiceSyncContext = require('../../../../src/sync/MobileServiceSyncContext'),
    MobileServiceClient = require('../../../../src/MobileServiceClient'),
    MobileServiceSqliteStore = require('Platforms/MobileServiceSqliteStore'),
    uuid = require('node-uuid'),
    storeTestHelper = require('./storeTestHelper');
    
var syncContext = new MobileServiceSyncContext(new MobileServiceClient('http://shrirs-js-dev.azurewebsites.net' /* FIXME */)),
    store,
    testId = 'x1',
    tableName = 'todoitem';
    
$testGroup('offline tests')
    .functional() //FIXME
    .beforeEachAsync(function() {
        return storeTestHelper.createEmptyStore().then(function(localStore) {
            store = localStore;
            return store.defineTable({
                name: tableName,
                columnDefinitions: {
                    id: MobileServiceSqliteStore.ColumnType.String,
                    text: MobileServiceSqliteStore.ColumnType.String,
                    complete: MobileServiceSqliteStore.ColumnType.Boolean,
                    version: MobileServiceSqliteStore.ColumnType.String
                }
            });
        }).then(function() {
            return syncContext.initialize(store);
        }).then(function() {
            return syncContext.insert(tableName, {id: testId, text: 'inserted locally'});
        });
    }).tests(

    $test('basic')
    .checkAsync(function () {
        var query = new Query(tableName);
        var client = new MobileServiceClient('http://shrirs-js-dev.azurewebsites.net');
        var table = client.getTable('todoitem');
        
        // return syncContext.pull(query).then(function() {
        //     query = new Query(tableName);
        //     return store.read(query);
        // }).then(function(records) {
        //     records = records;
        // });
        
        return syncContext.push().then(function() {
            return syncContext.update(tableName, {id: testId, text: 'updated locally'});
        }).then(function() {
            return syncContext.push();
        }).then(function() {
            return syncContext.del(tableName, {id: testId});
        }).then(function() {
            return syncContext.push();
        }).then(function(x) {
        }).then(function(x) {
            var t = x;
            t = t;
        }).then(function() {
        }, function(error) {
            var x = 1;
            x = error;
        });
    }),
    
    $test('pull deleted records')
    .checkAsync(function () {
        var query = new Query(tableName);
        var client = new MobileServiceClient('http://shrirs-js-dev.azurewebsites.net');
        var table = client.getTable('todoitem');
        
        // return syncContext.pull(query).then(function() {
        //     query = new Query(tableName);
        //     return store.read(query);
        // }).then(function(records) {
        //     records = records;
        // });
        
        var guid = uuid.v4();
        
        var record = {id: guid, text: 'pull deleted records'};
        
        return table.insert(record).then(function() {
            return syncContext.pull(query);
        }).then(function() {
            return syncContext.lookup(tableName, record.id);
        }).then(function(result) {
            $assert.areEqual(result.id, record.id);
            $assert.areEqual(result.text, record.text);
            return table.del(record);
        }).then(function() {
            return syncContext.pull(query);
        }).then(function() {
            return syncContext.lookup(tableName, guid);
        }).then(function(result) {
            $assert.isNull(result);
        }, function(error) {
            $assert.fail(error);
        });
    })
);

