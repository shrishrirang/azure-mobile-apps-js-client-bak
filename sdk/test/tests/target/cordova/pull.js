// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/**
 * @file unit tests for the 'pull' module
 */

var Platform = require('Platforms/Platform'),
    Query = require('query.js').Query,
    pullManager = require('../../../../src/sync/pull'),
    MobileServiceSyncContext = require('../../../../src/sync/MobileServiceSyncContext'),
    MobileServiceClient = require('../../../../src/MobileServiceClient'),
    MobileServiceSqliteStore = require('Platforms/MobileServiceSqliteStore'),
    storeTestHelper = require('./storeTestHelper');
    
var syncContext = new MobileServiceSyncContext(new MobileServiceClient('http://shrirs-js-dev.azurewebsites.net')),
    tableName = 'todoitem';
    
$testGroup('pullManager tests').tests(

    $test('basic')
    .checkAsync(function () {
        var query = new Query(tableName);
        //query.select('a');
        //query.orderByDescending('propertyOrderBy');
        
        // syncContext.client.getTable('todoitem').insert({
        //     id: 'item4',
        //     text: 'another false',
        //     complete: false
        // });
        
        
        //query.skip(1);
        // query.take(1);
        //query.includeTotalCount(1);
        return pullManager.pull(syncContext, query);
    })
);

