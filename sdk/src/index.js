// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

var _ = require('./Utilities/Extensions');

// Target (i.e. Cordova / Browser / etc) specific definitions that need to be exposed outside the SDK
var targetExports = require('Platforms/index');

// Modules that need to be exposed outside the SDK and shared across all targets 
var api = {
    MobileServiceClient: require('./MobileServiceClient'),
    MobileServiceLogin: require('./MobileServiceLogin'),
    MobileServiceSyncTable: require('./sync/MobileServiceSyncTable'),
    MobileServiceTable: require('./MobileServiceTable'),
    Query: require('query.js').Query
};

for (var i in targetExports) {
    if ( _.isNull(api[i]) ) {
        api[i] = targetExports[i];
    } else {
        throw new Error('Cannot export definition ' + i + ' outside the SDK. Multiple definitions with the same name exist');
    }
}

module.exports = api;
