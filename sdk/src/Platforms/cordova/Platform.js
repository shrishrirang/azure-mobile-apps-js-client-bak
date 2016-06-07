// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/**
 * @file Defines Cordova implementation of target independent APIs.
 * For now, the browser implementation works as-is for Cordova, so we 
 * just reuse the browser definitions.
 */

var browserDefinitions = require('../web/Platform');

// Simply returning browserDefinitions breaks browserify's cyclic dependency handling logic.
// Following is a workaround for it.

for (var i in browserDefinitions) {
    module.exports[i] = browserDefinitions[i];
}   
