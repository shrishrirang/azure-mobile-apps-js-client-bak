// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

var Platform = require('Platforms/Platform'),
    Query = require('query.js').Query,
    pullManager = require('../../../../src/sync/pull'),
    MobileServiceSyncContext = require('../../../../src/sync/MobileServiceSyncContext'),
    MobileServiceClient = require('../../../../src/MobileServiceClient'),
    MobileServiceSqliteStore = require('Platforms/MobileServiceSqliteStore'),
    storeTestHelper = require('./storeTestHelper');
    
var syncContext = new MobileServiceSyncContext(new MobileServiceClient('http://shrirs-js-dev.azurewebsites.net' /* FIXME */)),
    store,
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
        });
    }).tests(

    $test('basic')
    .checkAsync(function () {
        var query = new Query(tableName);
        var client = new MobileServiceClient('http://shrirs-js-dev.azurewebsites.net');
        var table = client.getTable('todoitem');
        
        table.update({id: 'a', complete: 3});
        
        return syncContext.pull(query).then(function() {
            query = new Query(tableName);
            return store.read(query);
        }).then(function(records) {
            records = records;
        });
    })
);

