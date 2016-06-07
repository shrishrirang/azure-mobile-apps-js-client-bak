// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

var Query = require('query.js/lib/Query').Query,
    Platform = require('Platforms/Platform');

// Copy select Query operators to the table so queries can be created
// compactly.  We'll just add them to the table prototype and then
// forward on directly to a new Query instance.
var queryOperators = ['where', 'select', 'orderBy', 'orderByDescending', 'skip', 'take', 'includeTotalCount'];

var copyOperator = function (table, operator) {
    table.prototype[operator] = function () {
        /// <summary>
        /// Creates a new query.
        /// </summary>

        // Create a query associated with this table
        var table = this;
        var query = new Query(table.getTableName());

        // Add a .read() method on the query which will execute the query.
        // This method is defined here per query instance because it's
        // implicitly tied to the table.
        query.read = function (parameters) {
            return table.read(query, parameters);
        };

        // Invoke the query operator on the newly created query
        return query[operator].apply(query, arguments);
    };
};

function defineQueryOperators(table) {
    var i = 0;
    for (; i < queryOperators.length; i++) {
        // Avoid unintended closure capture
        copyOperator(table, queryOperators[i]);
    }
}

exports.defineQueryOperators = defineQueryOperators;
