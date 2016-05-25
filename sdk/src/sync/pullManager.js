// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

var Validate = require('../Utilities/Validate'),
    Platform = require('Platforms/Platform'),
    createOperationTableManager = require('./operations').createOperationTableManager,
    taskRunner = require('../Utilities/taskRunner'),
    MobileServiceTable = require('../MobileServiceTable'),
    _ = require('../Utilities/Extensions');

function pull(client, query, queryId, pullSettings) {
    //FIXME: support queryId
    //TODO: implement pullSettings
    
    var mobileServiceTable;
    return Platform.async(function(callback) {
        Validate.isObject(client);
        Validate.notNull(client);
        validatePullQuery(query);

        mobileServiceTable = client.getTable(query.getComponents().table);

        callback();
    })().then(function() {
        return mobileServiceTable.read(query);
    }).then(function(results) {
        var x = results;
        
    });
}

function validatePullQuery(query) {
    Validate.isObject(query);
    Validate.notNull(query);
    
    var components = query.getComponents();
    
    for (var i in components.ordering) {
        throw new Error('orderBy and orderByDescending clauses are not supported in the pull query');
    }
    
    if (components.skip) {
        throw new Error('skip is not supported in the pull query');
    }

    if (components.take) {
        throw new Error('take is not supported in the pull query');
    }

    if (components.selections && components.selections.length !== 0) {
        throw new Error('select is not supported in the pull query');
    }

    if (components.includeTotalCount) {
        throw new Error('includeTotalCount is not supported in the pull query');
    }
}

module.exports = {
    pull: pull
}