// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/**
 * Table pull logic implementation
 */

var Validate = require('../Utilities/Validate'),
    Query = require('query.js').Query,
    Platform = require('Platforms/Platform'),
    taskRunner = require('../Utilities/taskRunner'),
    MobileServiceTable = require('../MobileServiceTable'),
    tableConstants = require('../constants').table,
    _ = require('../Utilities/Extensions');
    
var pageSize = 2, //TODO: Pick a reasonable page size
    idPropertyName = tableConstants.idPropertyName,
    sysProps = tableConstants.sysProps;
    
function createPullManager(client, store, storeTaskRunner) {
    // Task runner for running pull tasks. We want only one pull to run at a time. 
    var pullTaskRunner = taskRunner();
    
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

            // Make a copy of the query as we will be modifying it            
            var components = query.getComponents();
            pullQuery = new Query(components.table);
            pullQuery.setComponents(components);
          
            return setupQuery(pullQuery, queryId).then(function() {
                return pullAllPages(pullQuery, queryId)
            });
        });
    }
    
    // Setup the query to get started with pull
    function setupQuery(query, queryId) {
        return Platform.async(function(callback) {
            
            // Sort the results by 'updatedAt' column and fetch pageSize results
            query.orderBy('updatedAt');
            query.take(pageSize);

            callback();
        })();
    }

    function pullAllPages(query, queryId) {
        mobileServiceTable = client.getTable(query.getComponents().table);
        
        return pullPage(query, queryId).then(function(pulledRecords) {
            if (!isPullComplete(pulledRecords)) {
                // update query and continue pulling the remaining pages
                return updateQueryForNextPage(query, queryId, pulledRecords).then(function() {
                    return pullAllPages(query, queryId);
                });
            }
        });
    }
    
    function isPullComplete(pulledRecords) {
        return pulledRecords.length <= 0; // Pull is complete when no more records can be fetched
    }
    
    function pullPage(query, queryId) {
        var params = {};
        params[tableConstants.includeDeletedFlag] = true;
        
        return mobileServiceTable.read(query, params).then(function(pulledRecords) {

            var chain = Platform.async(function(callback) {
                callback();
            })();
            
            var tableName = query.getComponents().table;
            
            // Process all records in the page
            for (var i in pulledRecords) {
                chain = processPulledRecord(chain, tableName, pulledRecords[i]); 
            }
            
            // Return the pulled records after we are done processing them
            return chain.then(function() {
                return pulledRecords;
            });
        });
    }
    
    // Processes the pulled record by taking appropriate action which can be one of:
    // inserting, updating, deleting in the local store or no action at all.
    function processPulledRecord(chain, tableName, pulledRecord) {
        return chain.then(function() {

            // Update the store as per the pulled record 
            return storeTaskRunner.run(function() {
                if (Validate.isValidId(pulledRecord[idPropertyName])) {
                    throw new Error('Pulled record does not have a valid ID');
                }
                
                return operationTableManager.readPendingOperations(tableName, pulledRecord[idPropertyName]).then(function(pendingOperations) {
                    // If there are pending operations for the record we just pulled, we just ignore it.
                    if (pendingOperations.length > 0) {
                        return;
                    }

                    if (pulledRecord[sysProps.deletedColumnName] === true) {
                        return store.del(tableName, pulledRecord.id);
                    } else if (pulledRecord[sysProps.deletedColumnName] === false) {
                        return store.upsert(tableName, pulledRecord);
                    } else {
                        throw new Error("'" + sysProps.deletedColumnName + "' system property is missing. Pull cannot work without it.'");
                    }
                });
            });
            
        });
    }

    // update the query to pull the next page
    function updateQueryForNextPage(query, queryId, pulledRecords) {
        return Platform.async(function(callback) {
            callback();
        })().then(function() {
            if (queryId) { // Incremental pull
                //FIXME: Implement incremental pull
            } else { // Vanilla pull
                query.skip(query.getComponents().skip + pulledRecords.length);
            }
        });
    }

    // Not all query operations are allowed while pulling.
    // This function validates that the query does not perform unsupported operations.
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
