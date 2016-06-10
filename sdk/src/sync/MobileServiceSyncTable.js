// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

var Validate = require('../Utilities/Validate'),
    Query = require('Query.js').Query,
    _ = require('../Utilities/Extensions'),
    tableHelper = require('../tableHelper'),
    Platform = require('Platforms/Platform');

/**
 * Creates an instance of MobileServiceSyncTable
 * @param tableName Name of the local table
 * @param client The MobileServiceClient to be used to make requests to the backend.
 */
function MobileServiceSyncTable(tableName, client) {
    Validate.isString(tableName, 'tableName');
    Validate.notNullOrEmpty(tableName, 'tableName');

    Validate.notNull(client, 'client');

    /**
     * Gets the name of the local table
     */
    this.getTableName = function () {
        return tableName;
    };

    /**
     * Gets the MobileServiceClient associated with this table
     */
    this.getClient = function () {
        return client;
    };

    /**
     * Inserts a new object / record in the local table
     * @param instance Object / record to be inserted in the local table 
     * @returns A promise that is resolved with the inserted object when the operation is completed successfully.
     *          If the operation fails, the promise is rejected.
     */
    this.insert = function (instance) {
        return client.getSyncContext().insert(tableName, instance);
    };

    /**
     * Updates an object / record in the local table
     * @param instance New value of the object / record. The id field determines the record in the table that will be updated.
     * @returns A promise that is resolved when the operation is completed successfully.
     *          If the operation fails, the promise is rejected.
     */
    this.update = function (instance) {
        return client.getSyncContext().update(tableName, instance);
    };

    /**
     * Gets an object with the specified ID from the local table
     * @param id ID of the object to get from the local table
     * @returns A promise that is resolved with the looked up object when the operation is completed successfully.
     *          If the operation fails, the promise is rejected.
     */
    this.lookup = function (id) {
        return client.getSyncContext().lookup(tableName, id);
    };

    /**
     * Reads records from the local table
     * 
     * @param {query} A QueryJS object representing the query to use while reading the table. If no query is specified, the
     *                entire local table will be read.
     * @returns A promise that is resolved with the read results when the operation is completed successfully or rejected with
     *          the error if it fails.
     */
    this.read = function (query) {
        if (_.isNull(query)) {
            query = new Query(tableName);
        }
        
        return client.getSyncContext().read(query);
    };

    /**
     * Deletes an object / record from the local table
     * @param instance The object / record to delete from the local table
     * @returns A promise that is resolved when the operation is completed successfully.
     *          If the operation fails, the promise is rejected
     */
    this.del = function (instance) {
        return client.getSyncContext().del(tableName, instance);
    };
}

// Define query operators
tableHelper.defineQueryOperators(MobileServiceSyncTable);

exports.MobileServiceSyncTable = MobileServiceSyncTable;
