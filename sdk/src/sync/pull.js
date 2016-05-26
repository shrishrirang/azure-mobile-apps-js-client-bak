// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

var Validate = require('../Utilities/Validate'),
    Platform = require('Platforms/Platform'),
    createOperationTableManager = require('./operations').createOperationTableManager,
    taskRunner = require('../Utilities/taskRunner'),
    MobileServiceTable = require('../MobileServiceTable'),
    _ = require('../Utilities/Extensions');

var pageSize = 2;

function createPullManager(pullHandler) {
    
    pullTaskRunner = taskRunner();

    var mobileServiceTable;
    
    function reset() {
        mobileServiceTable = undefined;//FIXME: do we need this
    }
    
    function pull(query, queryId) {
        
        //FIXME: support queryId
        //TODO: page size should be configurable

        // Make a copy of the query
        query = JSON.parse(JSON.stringify(query));
        
        return pullTaskRunner.run(function() {
            validateQuery(query);
            Validate.isString(queryId); // non-null string or null - both are valid
            
            reset();
            return setupQuery(query, queryId).then(function() {
                return pullAllPages(query, queryId)
            });
        });
    }
    
    function setupQuery(query, queryId) {
        return Platform.async(function(callback) {
            // Sort the results by 'updatedAt' column and fetch pageSize results
            query.orderBy('updatedAt');
            query.take(pageSize);

            // FIXME: implement incremental sync
        })();
    }
    
    function pullAllPages(query, queryId) {
        mobileServiceTable = syncContext.client.getTable(query.getComponents().table);
        
        return pullPage(query, queryId).then(function(pulledRecords) {
            if (pulledRecords.count > 0) {
                return updateQueryForNextPage(query, queryId).then(function() {
                    return pullAllPages(query, queryId);
                });
            }
        });
    }
    
    function pullPage(query, queryId) {
        return mobileServiceTable.read(query).then(function(pulledRecords) {
            if (pulledRecords.count <= 0) {
                return pulledRecords;
            }
            
            var chain = Promise.async(function(callback) {
                callback();
            })();
            
            for (var i in pulledRecords) {
                var record = pulledRecords[i];
                chain = processPulledRecord(chain, record); 
            }
            
            chain.then(function() {
                return pulledRecords;
            });
        });
    }
    
    function processPulledRecord(chain, record) {
        chain = chain.then(function() {
            return pullHandler(mobileServiceTable.getTableName(), record);
        });
    }

    function updateQueryForNextPage(query, queryId) {
        // update the query to get the next page
        if (queryId) { // Incremental pull
            
        } else { // Vanilla pull
            
        }
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
