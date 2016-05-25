// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/**
 * @file unit tests for the 'pullManager' module
 */

var Platform = require('Platforms/Platform'),
    Query = require('query.js').Query,
    pullManager = require('../../../../src/sync/pullManager'),
    MobileServiceClient = require('../../../../src/MobileServiceClient'),
    MobileServiceSqliteStore = require('Platforms/MobileServiceSqliteStore'),
    storeTestHelper = require('./storeTestHelper');
    
var client = new MobileServiceClient('http://shrirs-js-dev.azurewebsites.net');
    
$testGroup('pullManager tests').tests(

    $test('basic')
    .checkAsync(function () {
        var query = new Query(storeTestHelper.testTableName);
        //query.select('a');
        //query.orderByDescending('propertyOrderBy');
        query.where(function() {
            return this.whereproperty == 'a';
        });
        //query.skip(1);
        // query.take(1);
        //query.includeTotalCount(1);
        return pullManager.pull(client, query);
    })
);

