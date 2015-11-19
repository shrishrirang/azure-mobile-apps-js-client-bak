// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/// <reference path="C:\Program Files (x86)\Microsoft SDKs\Windows\v8.0\ExtensionSDKs\Microsoft.WinJS.1.0\1.0\DesignTime\CommonConfiguration\Neutral\Microsoft.WinJS.1.0\js\base.js" />
/// <reference path="C:\Program Files (x86)\Microsoft SDKs\Windows\v8.0\ExtensionSDKs\Microsoft.WinJS.1.0\1.0\DesignTime\CommonConfiguration\Neutral\Microsoft.WinJS.1.0\js\ui.js" />
/// <reference path="Generated\MobileServices.DevIntellisense.js" />

var Validate = require('./Utilities/Validate');
var Platform = require('Platforms/Platform');
var Query = require('query.js/lib/Query').Query;

function MobileServiceSyncTable(tableName, client) {
    /// <summary>
    /// Creates an instance of the MobileServiceSyncTable class.
    /// </summary>
    /// <param name="tableName" type="String">
    /// Name of the table.
    /// </param>
    /// <param name="client" type="MobileServiceClient">
    /// The MobileServiceClient used to make requests.
    /// </param>

    Validate.isString(tableName, 'tableName');
    Validate.notNullOrEmpty(tableName, 'tableName');

    Validate.notNull(client, 'client');

    this.getTableName = function () {
        /// <summary>
        /// Gets the name of the table.
        /// </summary>
        /// <returns type="String">The name of the table.</returns>

        return tableName;
    };

    this.getClient = function () {
        /// <summary>
        /// Gets the MobileServiceClient associated with this table.
        /// </summary>
        /// <returns type="MobileServiceClient">
        /// The MobileServiceClient associated with this table.
        /// </returns>

        return client;
    };

    this.insert = function (instance) {
        /// <summary>
        /// Insert a new object into the sync table.
        /// </summary>
        /// <param name="instance" type="Object">
        /// The object to insert into the table.
        /// </param>
        /// <returns type="Promise">
        /// A promise that is resolved with the inserted object when the operation is completed successfully.
        /// If the operation fails, the promise is rejected
        /// </returns>

        return client.getSyncContext().insert(tableName, instance);
    };

    this.update = function (instance) {
        /// <summary>
        /// Update an object in the sync table.
        /// </summary>
        /// <param name="instance" type="Object">
        /// The object to update
        /// </param>
        /// <returns type="Promise">
        /// A promise that is resolved when the operation is completed successfully.
        /// If the operation fails, the promise is rejected
        /// </returns>

        return client.getSyncContext().update(tableName, instance);
    };

    this.lookup = function (id) {
        /// <summary>
        /// Gets an object from the sync table.
        /// </summary>
        /// <param name="id" type="string">
        /// The id of the object to get from the table.
        /// </param>
        /// <returns type="Promise">
        /// A promise that is resolved with the looked up object when the operation is completed successfully.
        /// If the operation fails, the promise is rejected
        /// </returns>

        return client.getSyncContext().lookup(tableName, id);
    };

    this.del = function (instance) {
        /// <summary>
        /// Delete an object from the sync table
        /// </summary>
        /// <param name="instance" type="Object">
        /// The instance to delete from the sync table.
        /// </param>
        /// <returns type="Promise">
        /// A promise that is resolved when the operation is completed successfully.
        /// If the operation fails, the promise is rejected
        /// </returns>

        return client.getSyncContext().del(tableName, instance);
    };

    this._read = function (query) {
        return client.getSyncContext().read(query);
    };

    this.read = function (query) {
        /// <summary>
        /// Read the sync table
        /// </summary>
        /// <param name="query" type="Object">
        /// A QueryJS object representing the query to be performed while reading the table.
        /// This parameter is optional and can be skipped to read the entire table.
        /// </param>
        /// <returns type="Promise">
        /// A promise that is resolved with the read results when the operation is completed successfully.
        /// If the operation fails, the promise is rejected
        /// </returns>

        if (query === undefined) {
            query = new Query(tableName);
        }

        return this._read(query);
    };
}

// Copy select Query operators to MobileServiceSyncTable so queries can be created
// compactly.  We'll just add them to the MobileServiceSyncTable prototype and then
// forward on directly to a new Query instance.
var queryOperators =
    ['where', 'select', 'orderBy', 'orderByDescending', 'skip', 'take', 'includeTotalCount'];

var copyOperator = function (operator) {
    MobileServiceSyncTable.prototype[operator] = function () {
        /// <summary>
        /// Creates a new query.
        /// </summary>

        // Create a query associated with this table
        var table = this;
        var query = new Query(table.getTableName());

        // Add a .read() method on the query which will execute the query.
        // This method is defined here per query instance because it's
        // implicitly tied to the table.
        query.read = function () {
            return table._read(query);
        };

        // Invoke the query operator on the newly created query
        return query[operator].apply(query, arguments);
    };
};

var i = 0;
for (; i < queryOperators.length; i++) {
    // Avoid unintended closure capture
    copyOperator(queryOperators[i]);
}

// Export the MobileServiceSyncTable class
exports.MobileServiceSyncTable = MobileServiceSyncTable;
