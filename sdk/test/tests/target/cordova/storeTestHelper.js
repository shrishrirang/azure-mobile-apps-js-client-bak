// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/**
 * @file Helper file for local store unit tests
 */

var Platform = require('Platforms/Platform'),
    Query = require('query.js').Query,
    operations = require('../../../../src/sync/operations'),
    MobileServiceSqliteStore = require('Platforms/MobileServiceSqliteStore'),
    testTableName = 'sometable',
    testDbFile = 'somedbfile.db',
    store;

// Method need not be async, but defining it async to be consistent with createEmptyStore    
function createStore() {
    return Platform.async(function(callback) {
        if (!store) {
            store = new MobileServiceSqliteStore(testDbFile);
        }

        callback(null, Object.create(store));
    })();
}

function resetStore(store) {
    return Platform.async(function(callback) {
        store._db.sqlBatch([
            'DROP TABLE IF EXISTS ' + operations._operationTableName,
            'DROP TABLE IF EXISTS ' + 'todoitem',
            'DROP TABLE IF EXISTS ' + testTableName
        ], function() {
            callback(null, store);
        }, function(error) {
            callback(error);
        });
    })();
}

function createEmptyStore() {
    return createStore().then(function(store) {
        return resetStore(store);
    });
}

module.exports = {
    createStore: createStore,
    createEmptyStore: createEmptyStore,
    resetStore: resetStore,
    
    testTableName: testTableName
};
