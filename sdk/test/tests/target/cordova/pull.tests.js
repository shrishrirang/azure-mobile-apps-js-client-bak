// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/**
 * @file unit tests for the 'pull' scenarios
 */

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
    
$testGroup('table pull tests')
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
    .check(function () {
    })
);

