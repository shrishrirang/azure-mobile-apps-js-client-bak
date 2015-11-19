// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

var Platform = require('Platforms/Platform'),
    Validate = require('../../Utilities/Validate'),
    _ = require('../../Utilities/Extensions'),
    queryHelper = require('azure-mobile-apps/src/query'),
    SQLiteTypes = require('./SQLiteTypes'),
    SQLiteSerializer = require('./SQLiteSerializer'),
    Query = require('query.js').Query,
    formatSql = require('azure-mobile-apps/src/data/sql/query/format');

var idPropertyName = "id";

var MobileServiceSQLiteStore = function (dbName) {
    /// <summary>
    /// Initializes a new instance of the MobileServiceSQLiteStore class.
    /// </summary>

    this._db = window.sqlitePlugin.openDatabase({ name: dbName });
    this._tableDefinitions = {};

    this.defineTable = Platform.async(function (tableDefinition) {
        /// <summary>Defines the local table in the sqlite store</summary>
        /// <param name="tableDefinition">Table definition object defining the table name and columns
        /// Example of a valid tableDefinition object:
        /// tableDefinition : {
        ///     name: "todoItemTable",
        ///     columnDefinitions : {
        ///         id : "string",
        ///         metadata : MobileServiceSQLiteStore.ColumnType.Object,
        ///         description : "string",
        ///         purchaseDate : "date",
        ///         price : MobileServiceSQLiteStore.ColumnType.Real
        ///     }
        /// }
        /// </param>
        /// <returns type="Promise">
        /// A promise that is resolved when the operation is completed successfully.
        /// If the operation fails, the promise is rejected
        /// </returns>

        // Extract the callback argument added by Platform.async.
        var callback = Array.prototype.pop.apply(arguments);

        // Redefine function argument to account for the popped callback
        tableDefinition = arguments[0];

        Validate.isFunction(callback, 'callback');
        Validate.notNull(tableDefinition, 'tableDefinition');
        Validate.isString(tableDefinition.name, 'tableDefinition.name');
        Validate.notNullOrEmpty(tableDefinition.name, 'tableDefinition.name');

        var columnDefinitions = tableDefinition.columnDefinitions;

        // Validate the specified column types
        for (var columnName in columnDefinitions) {
            var columnType = columnDefinitions[columnName];

            Validate.isString(columnType, 'columnType');
            Validate.notNullOrEmpty(columnType, 'columnType');
        }

        var self = this;
        this._db.transaction(function(transaction) {

            var pragmaStatement = _.format("PRAGMA table_info({0});", tableDefinition.name);

            transaction.executeSql(pragmaStatement, [], function (transaction, result) {

                // If table already exists, add missing columns, if any.
                // Else, create the table
                if (result.rows.length > 0) {

                    // Columns that are present in the table already
                    var existingColumns = {};

                    // Remove columns that are already present in the table from the columnDefinitions array
                    for (var i = 0; i < result.rows.length; i++) {
                        var column = result.rows.item(i);
                        existingColumns[column.name] = true;
                    }

                    addMissingColumns(transaction, tableDefinition, existingColumns);

                } else {
                    createTable(transaction, tableDefinition);
                }
            });

        }, function (error) {
            callback(error);
        }, function(result) {
            self._tableDefinitions[tableDefinition.name] = tableDefinition;
            callback();
        });
    });

    this.upsert = Platform.async(function (tableName, data) {
        /// <summary>Updates or inserts one or more objects in the local table</summary>
        /// <param name="tableName">Name of the local table in which the object(s) are to be upserted</param>
        /// <param name="data">A single object OR an array of objects to be inserted/updated in the table</param>
        /// <returns type="Promise">
        /// A promise that is resolved when the operation is completed successfully.
        /// If the operation fails, the promise is rejected
        /// </returns>

        // Extract the callback argument added by Platform.async.
        var callback = Array.prototype.pop.apply(arguments);

        // Redefine function arguments to account for the popped callback
        tableName = arguments[0];
        data = arguments[1];

        Validate.isFunction(callback);
        Validate.isString(tableName, 'tableName');
        Validate.notNullOrEmpty(tableName, 'tableName');

        var tableDefinition = this._tableDefinitions[tableName];
        Validate.notNull(tableDefinition, 'tableDefinition');
        Validate.isObject(tableDefinition, 'tableDefinition');

        var columnDefinitions = tableDefinition.columnDefinitions;
        Validate.notNull(columnDefinitions, 'columnDefinitions');
        Validate.isObject(columnDefinitions, 'columnDefinitions');

        if (_.isNull(data)) {
            callback();
            return;
        }

        Validate.isObject(data);

        var instances;
        if (!_.isArray(data)) {
            instances = [data];
        } else {
            instances = data;
        }

        for (var i = 0; i < instances.length; i++) {

            if (!_.isNull(instances[i])) {
                Validate.isValidId(instances[i][idPropertyName], 'instances[' + i + '].' + idPropertyName);
                instances[i] = SQLiteSerializer.serialize(instances[i], columnDefinitions);
            }
        }

        // Note: The default maximum number of parameters allowed by sqlite is 999
        // See: http://www.sqlite.org/limits.html#max_variable_number
        // TODO(shrirs): Add support for tables with more than 999 columns

        // Insert and update SQL statements and their parameters corresponding to each record we want to insert/update in the table.
        var statements = [],
            parameters = [];

        var columnNames, columnParams, updateExpression, insertValues, updateValues, property, instance;
        for (i = 0; i < instances.length; i++) {

            if (_.isNull(instances[i])) {
                continue;
            }
                
            columnNames = '';
            columnParams = '';
            updateExpression = '';
            insertValues = [];
            updateValues = [];
            instance = instances[i];

            for (property in instance) {
                // Add comma, if this is not the first column
                if (columnNames !== '') {
                    columnNames += ', ';
                    columnParams += ', ';
                }

                // Add comma, if this is not the first update expression
                if (updateExpression !== '') {
                    updateExpression += ', ';
                }

                columnNames += property;
                columnParams += '?';

                // We don't want to update the id column
                if (property !== idPropertyName) {
                    updateExpression += property + ' = ?';
                    updateValues.push(instance[property]);
                }

                insertValues.push(instance[property]);
            }

            // Insert the instance. If one with the same id already exists, ignore it.
            statements.push(_.format("INSERT OR IGNORE INTO {0} ({1}) VALUES ({2})", tableName, columnNames, columnParams));
            parameters.push(insertValues);

            // If there is any property other than id that needs to be upserted, update the record.
            if (updateValues.length > 0) {
                statements.push(_.format("UPDATE {0} SET {1} WHERE {2} = ?", tableName, updateExpression, idPropertyName));
                updateValues.push(instance[idPropertyName]);
                parameters.push(updateValues);
            }
        }

        this._db.transaction(function (transaction) {

            for (var i = 0; i < statements.length; i++) {
                transaction.executeSql(statements[i], parameters[i]);
            }
        }, function (error) {
            callback(error);
        }, function () {
            callback();
        });
    });

    this.lookup = Platform.async(function (tableName, id) {
        /// <summary>Perform a lookup against a local table</summary>
        /// <param name="tableName">Name of the local table in which look up is to be performed</param>
        /// <param name="id">ID of the object to be looked up</param>
        /// <returns type="Promise">
        /// A promise that is resolved with the looked up object when the operation is completed successfully.
        /// If the operation fails, the promise is rejected
        /// </returns>

        // Extract the callback argument added by Platform.async.
        var callback = Array.prototype.pop.apply(arguments);

        // Redefine function arguments to account for the popped callback
        tableName = arguments[0];
        id = arguments[1];

        Validate.isFunction(callback, 'callback');
        Validate.isString(tableName, 'tableName');
        Validate.notNullOrEmpty(tableName, 'tableName');

        Validate.isValidId(id, 'id');
        
        var tableDefinition = this._tableDefinitions[tableName];
        Validate.notNull(tableDefinition, 'tableDefinition');
        Validate.isObject(tableDefinition, 'tableDefinition');

        var columnDefinitions = tableDefinition.columnDefinitions;
        Validate.notNull(columnDefinitions, 'columnDefinitions');
        Validate.isObject(columnDefinitions, 'columnDefinitions');

        var lookupStatement = _.format("SELECT * FROM [{0}] WHERE {1} = ? COLLATE NOCASE", tableName, idPropertyName);

        this._db.executeSql(lookupStatement, [id], function (result) {

            try {
                var instance = null;
                if (result.rows.length !== 0) {
                    instance = result.rows.item(0);
                }

                instance = SQLiteSerializer.deserialize(instance, columnDefinitions);
                callback(null, instance);
            } catch (err) {
                callback(err);
            }
        }, function (err) {
            callback(err);
        });
    });

    this.del = Platform.async(function (tableNameOrQuery, ids) {
        /// <summary>Deletes records from the local table</summary>
        /// <param name="tableNameOrQuery">Name of the local table in which delete is to be performed OR a queryjs object defining records to be deleted</param>
        /// <param name="ids">A single ID or and array of IDs of records to be deleted. This argument is expected only if the first argument is table name</param>
        /// <returns type="Promise">
        /// A promise that is resolved when the operation is completed successfully.
        /// If the operation fails, the promise is rejected
        /// </returns>

        var callback = Array.prototype.pop.apply(arguments); // Extract the callback argument added by Platform.async.

        // Redefine function arguments to account for the popped callback
        tableNameOrQuery = arguments[0];
        ids = arguments[1];

        Validate.isFunction(callback);
        Validate.notNull(tableNameOrQuery);

        var tableName, query;
        if (_.isString(tableNameOrQuery)) {
            Validate.notNullOrEmpty(tableNameOrQuery, 'tableNameOrQuery');
            tableName = tableNameOrQuery;

            if (_.isNull(ids)) {
                callback(); // there's nothing to be deleted
                return;
            } else if (!_.isArray(ids)) { // If a single id is specified, convert it to an array and proceed
                ids = [ids];
            }
        } else if (_.isObject(tableNameOrQuery)) {
            query = tableNameOrQuery;
        } else {
            throw _.format(Platform.getResourceString("TypeCheckError"), 'tableNameOrQuery', 'Object or String', typeof tableNameOrQuery);
        }

        if (query) {
            var self = this;

            // The query can select specific columns. However, we need to know values of all the columns
            // to avoid deleting wrong records. 
            // Explicitly remove selection from the query, if any.
            var components = query.getComponents();
            if (components.selections && components.selections.length) {
                components.selections = [];
                query.setComponents(components);
            }

            // Run the query and get the list of records to be deleted
            this.read(query).then(function (result) {
                try {
                    if (!_.isArray(result)) {
                        result = result.result;
                        Validate.isArray(result);
                    }

                    var tableName = query.getComponents().table;
                    Validate.isString(tableName);
                    Validate.notNullOrEmpty(tableName);

                    self._deleteRecords(tableName, result, callback);
                } catch (error) {
                    callback(error);
                }
            }, function (error) {
                callback(error);
            });
        } else {
            this._deleteIds(tableName, ids, callback);
        }
    });

    // Delete the specified records from the table.
    // If multiple rows match any of the specified records, all will be deleted.
    this._deleteRecords = function(tableName, records, callback) {

        // SQL DELETE statements and parameters corresponding to each record we want to delete from the table.
        var deleteStatements = [],
            deleteParams = [];

        for (i = 0; i < records.length; i++) {

            var row = records[i];

            var whereClauses = [],
                whereParams = [];
            for (var propertyName in row) {
                whereClauses.push(_.format('{0} = ?', propertyName));
                whereParams.push(row[propertyName]);
            }

            deleteStatements.push(_.format('DELETE FROM {0} WHERE {1}', tableName, whereClauses.join(' AND ')));
            deleteParams.push(whereParams);
        }

        this._db.transaction(function (transaction) {
            for (var i = 0; i < deleteStatements.length; i++) {
                transaction.executeSql(deleteStatements[i], deleteParams[i]);
            }
        }, function (error) {
            callback(error);
        }, function () {
            callback();
        });
    };

    // Delete records from the table that match the specified IDs.
    this._deleteIds = function (tableName, ids, callback) {

        var deleteExpressions = [],
            deleteParams = [];
        for (var i = 0; i < ids.length; i++) {
            if (!_.isNull(ids[i])) {
                Validate.isValidId(ids[i]);
                deleteExpressions.push('?');
                deleteParams.push(ids[i]);
            }
        }

        var deleteStatement = _.format("DELETE FROM {0} WHERE {1} in ({2})", tableName, idPropertyName, deleteExpressions.join());

        this._db.executeSql(deleteStatement, deleteParams, function () {
            callback();
        }, function (error) {
            callback(error);
        });
    };

    this.read = Platform.async(function (query) {
        /// <summary>
        /// Read a table
        /// </summary>
        /// <param name="query" type="Object">
        /// A QueryJS object representing the query to be performed while reading the table.
        /// </param>
        /// <returns type="Promise">
        /// A promise that is resolved with the read results when the operation is completed successfully.
        /// If the operation fails, the promise is rejected
        /// </returns>

        // Extract the callback argument added by Platform.async.
        var callback = Array.prototype.pop.apply(arguments);

        // Redefine function argument to account for the popped callback
        query = arguments[0];

        Validate.isFunction(callback, 'callback');
        Validate.notNull(query, 'query');
        Validate.isObject(query, 'query');

        var tableDefinition = this._tableDefinitions[query.getComponents().table];
        Validate.notNull(tableDefinition, 'tableDefinition');
        Validate.isObject(tableDefinition, 'tableDefinition');

        var columnDefinitions = tableDefinition.columnDefinitions;
        Validate.notNull(columnDefinitions, 'columnDefinitions');
        Validate.isObject(columnDefinitions, 'columnDefinitions');

        var count,
            result = [],
            odataQuery = queryHelper.toOData(query),
            statements = formatSql(odataQuery, { flavor: 'sqlite' });

        this._db.transaction(function (transaction) {

            if (statements.length < 1 || statements.length > 2) {
                throw Platform.getResourceString("MobileServiceSQLiteStore_UnexptedNumberOfStatements");
            }

            transaction.executeSql(statements[0].sql, getStatementParameters(statements[0]), function (transaction, res) {

                var row;
                for (var j = 0; j < res.rows.length; j++) {

                    row = SQLiteSerializer.deserialize(res.rows.item(j), columnDefinitions);
                    result.push(row);
                }
            });

            // Check if there are multiple statements. If yes, the second is for the result count.
            if (statements.length === 2) {
                transaction.executeSql(statements[1].sql, getStatementParameters(statements[1]), function (transaction, res) {
                    count = res.rows.item(0).count;
                });
            }
        }, function (error) {
            callback(error);
        }, function () {
            if (count !== undefined) {
                result = {
                    result: result,
                    count: count
                };
            }
            callback(null, result);
        });
    });
};

function getStatementParameters(statement) {
    var params = [];

    if (statement.parameters) {
        statement.parameters.forEach(function (param) {
            params.push(param.value);
        });
    }

    return params;
}

function createTable(transaction, tableDefinition) {
    var columnDefinitions = tableDefinition.columnDefinitions;
    var columnDefinitionClauses = [];

    for (var columnName in columnDefinitions) {
        var columnType = columnDefinitions[columnName];

        var columnDefinitionClause = _.format("[{0}] {1}", columnName, SQLiteSerializer.getColumnAffinity(columnType));

        // TODO(shrirs): Handle cases where id property may be missing
        if (columnName === idPropertyName) {
            columnDefinitionClause += " PRIMARY KEY";
        }

        columnDefinitionClauses.push(columnDefinitionClause);
    }

    var createTableStatement = _.format("CREATE TABLE [{0}] ({1})", tableDefinition.name, columnDefinitionClauses.join());

    transaction.executeSql(createTableStatement);
}

// Add missing columns to the table
function addMissingColumns(transaction, tableDefinition, existingColumns) {

    // SQLite does not support adding multiple columns using a single statement; Add one column at a time
    var columnDefinitions = tableDefinition.columnDefinitions;
    for (var columnName in columnDefinitions) {

        // If this column does not already exist, we need to create it
        if (!existingColumns[columnName]) {
            var alterStatement = _.format("ALTER TABLE {0} ADD COLUMN {1} {2}", tableDefinition.name, columnName, columnDefinitions[columnName]);
            transaction.executeSql(alterStatement);
        }
    }
}

// Valid SQL types
MobileServiceSQLiteStore.ColumnType = SQLiteTypes.ColumnType;

// Export
Platform.addToMobileServicesClientNamespace({ MobileServiceSQLiteStore: MobileServiceSQLiteStore });
Platform.addToMobileServicesClientNamespace({ Query: Query });

exports.MobileServiceSQLiteStore = MobileServiceSQLiteStore;
