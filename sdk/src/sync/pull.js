// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/**
 * Pull logic implementation
 */

var Validate = require('../Utilities/Validate'),
    Query = require('query.js').Query,
    Platform = require('Platforms/Platform'),
    taskRunner = require('../Utilities/taskRunner'),
    MobileServiceTable = require('../MobileServiceTable'),
    _ = require('../Utilities/Extensions');

var pageSize = 2; //TODO: This needs to be 50

function createPullManager(syncContext, pullHandler) {
    
    pullTaskRunner = taskRunner();
    
    return {
        pull: pull
    };

    var mobileServiceTable,
        pullQuery;
    
    function pull(query, queryId) {
        //FIXME: support queryId
        //TODO: page size should be configurable
        return pullTaskRunner.run(function() {
            validateQuery(query);
            Validate.isString(queryId); // non-null string or null - both are valid

            // Make a copy of the query as we will be editing it            
            var components = query.getComponents();
            pullQuery = new Query(components.table);
            pullQuery.setComponents(components);
          
            return setupQuery(pullQuery, queryId).then(function() {
                return pullAllPages(pullQuery, queryId)
            });
        });
    }
    
    function setupQuery(query, queryId) {
        return Platform.async(function(callback) {
            
            // Sort the results by 'updatedAt' column and fetch pageSize results
            query.orderBy('updatedAt');
            query.take(pageSize);

            callback();
        })();
    }
    
    function pullAllPages(query, queryId) {
        mobileServiceTable = syncContext.client.getTable(query.getComponents().table);
        
        return pullPage(query, queryId).then(function(pulledRecords) {
            if (pulledRecords.length > 0) {
                return updateQueryForNextPage(query, queryId, pulledRecords).then(function() {
                    return pullAllPages(query, queryId);
                });
            }
        });
    }
    
    function pullPage(query, queryId) {
        return mobileServiceTable.read(query).then(function(pulledRecords) {
            if (pulledRecords.length <= 0) {
                return pulledRecords;
            }
            
            var chain = Platform.async(function(callback) {
                callback();
            })();
            
            for (var i in pulledRecords) {
                chain = processPulledRecord(chain, pulledRecords[i]); 
            }
            
            return chain.then(function() {
                return pulledRecords;
            });
        });
    }
    
    function processPulledRecord(chain, record) {
        return chain.then(function() {
            return pullHandler(mobileServiceTable.getTableName(), record);
        });
    }

    // update the query to get the next page
    function updateQueryForNextPage(query, queryId, pulledRecords) {
        
        return Platform.async(function(callback) {
            callback();
        })().then(function() {
            if (queryId) {
                //FIXME: Incremental pull
            } else {
                query.skip(query.getComponents().skip + pulledRecords.length);
            }
        });
    }

    function validateQuery(query) {
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
}

exports.createPullManager = createPullManager;