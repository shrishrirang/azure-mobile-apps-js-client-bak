// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/**
 * @file SQLite implementation of the local store.
 * This uses the https://www.npmjs.com/package/cordova-sqlite-storage Cordova plugin.
 */

var Platform = require('Platforms/Platform'),
    Validate = require('../../Utilities/Validate'),
    _ = require('../../Utilities/Extensions'),
    queryHelper = require('azure-mobile-apps/src/query'),
    ColumnType = require('./ColumnType'),
    sqliteSerializer = require('./sqliteSerializer'),
    Query = require('query.js').Query,
    formatSql = require('azure-odata-sql').format;
    idPropertyName = "id"; // TODO: Add support for case insensitive ID

/**
 * Initializes a new instance of MobileServiceSqliteStore
 */
var MobileServiceSqliteStore = function (dbName) {

    // Guard against initialization without the new operator
    "use strict";
    if ( !(this instanceof MobileServiceSqliteStore) ) {
        return new MobileServiceSqliteStore(dbName);
    }

    this._db = window.sqlitePlugin.openDatabase({ name: dbName, location: 'default' });
    this._tableDefinitions = {};

    /**
     * Defines the schema of the SQLite table
     * @param tableDefinition An object that defines the table, i.e. the table name and columns
     * 
     * Example of a valid tableDefinition object:
     * name: "todoItemTable",
     * columnDefinitions : {
     *      id : "string",
     *      metadata : MobileServiceSqliteStore.ColumnType.Object,
     *      description : "string",
     *      purchaseDate : "date",
     *      price : MobileServiceSqliteStore.ColumnType.Real
     * }
     *
     * If a table with the same name already exists, the newly defined columns in the table definition will be added to the table.
     * If no table with the same name exists, a table with the specified schema will be created.  
     *
     * @returns A promise that is resolved when the operation is completed successfully OR rejected with the error if it fails.
     */
    this.defineTable = Platform.async(function (tableDefinition) {

        // Extract the callback argument added by Platform.async and redefine the function arguments
        var callback = Array.prototype.pop.apply(arguments);
        tableDefinition = arguments[0];

        // Validate the function arguments
        Validate.isFunction(callback, 'callback');
        Validate.notNull(tableDefinition, 'tableDefinition');
        Validate.isObject(tableDefinition, 'tableDefinition');
        
        // Do basic table name validation and leave the rest to SQLite
        Validate.isString(tableDefinition.name, 'tableDefinition.name');
        Validate.notNullOrEmpty(tableDefinition.name, 'tableDefinition.name');

        // Validate the specified column types
        var columnDefinitions = tableDefinition.columnDefinitions;
        for (var columnName in columnDefinitions) {
            Validate.isString(columnDefinitions[columnName], 'columnType');
            Validate.notNullOrEmpty(columnDefinitions[columnName], 'columnType');
        }
        
        Validate.notNull(columnDefinitions[idPropertyName]);

        this._db.transaction(function(transaction) {

            // Get the table information
            var pragmaStatement = _.format("PRAGMA table_info({0});", tableDefinition.name);
            transaction.executeSql(pragmaStatement, [], function (transaction, result) {

                // Check if a table with the specified name exists 
                if (result.rows.length > 0) { // table already exists, add missing columns.

                    // Get a list of columns present in the SQLite table
                    var existingColumns = {};
                    for (var i = 0; i < result.rows.length; i++) {
                        var column = result.rows.item(i);
                        existingColumns[column.name] = true;
                    }

                    addMissingColumns(transaction, tableDefinition, existingColumns);
                    
                } else { // table does not exist, create it.
                    createTable(transaction, tableDefinition);
                }
            });

        }, function (error) {
            callback(error);
        }, function(result) {
            // Table definition is successful, update the in-memory list of table definitions. 
            this._tableDefinitions[tableDefinition.name] = tableDefinition;
            callback();
        }.bind(this));
    });

    /**
     * Updates or inserts one or more objects in the local table
     * 
     * @param tableName Name of the local table in which data is to be upserted.
     * @param data A single object OR an array of objects to be inserted/updated in the table
     * 
     * @returns A promise that is resolved when the operation is completed successfully OR rejected with the error if it fails.
     */
    this.upsert = Platform.async(function (tableName, data) {
        // Extract the callback argument added by Platform.async and redefine the function arguments
        var callback = Array.prototype.pop.apply(arguments);
        tableName = arguments[0];
        data = arguments[1];

        // Validate the arguments
        Validate.isFunction(callback);
        
        this._db.transaction(function(transaction) {
            this._upsert(transaction, tableName, data);
        }.bind(this), function (error) {
            callback(error);
        }, function () {
            callback();
        })
    });
    
    // Performs the upsert operation.
    // This method validates all arguments, callers can skip validation. 
    this._upsert = function (transaction, tableName, data) {

        Validate.isObject(transaction);
        Validate.notNull(transaction);
        Validate.isString(tableName, 'tableName');
        Validate.notNullOrEmpty(tableName, 'tableName');

        var tableDefinition = this._tableDefinitions[tableName];
        Validate.notNull(tableDefinition, 'tableDefinition');
        Validate.isObject(tableDefinition, 'tableDefinition');

        var columnDefinitions = tableDefinition.columnDefinitions;
        Validate.notNull(columnDefinitions, 'columnDefinitions');
        Validate.isObject(columnDefinitions, 'columnDefinitions');

        // If no data is provided, there is nothing more to be done.
        if (_.isNull(data)) {
            return;
        }

        Validate.isObject(data);

        // Compute the array of records to be upserted.
        var records;
        if (!_.isArray(data)) {
            records = [data];
        } else {
            records = data;
        }

        // Serialize the records to a format that can be stored in SQLite.
        for (var i = 0; i < records.length; i++) {
            // Skip null or undefined record objects
            if (!_.isNull(records[i])) {
                Validate.isValidId(records[i][idPropertyName], 'records[' + i + '].' + idPropertyName);
                records[i] = sqliteSerializer.serialize(records[i], columnDefinitions);
            }
        }

        // Note: The default maximum number of parameters allowed by sqlite is 999
        // Refer http://www.sqlite.org/limits.html#max_variable_number
        // TODO: Add support for tables with more than 999 columns
        if (columnDefinitions.length > 999) {
            throw new Error("Number of table columns cannot be more than 999");
        }

        // Insert and update SQL statements and their parameters corresponding to each record we want to upsert in the table.
        var statements = [],
            parameters = [],
            columnNames, columnParams, updateExpression, insertValues, updateValues, record;
        for (i = 0; i < records.length; i++) {

            if (_.isNull(records[i])) {
                continue;
            }
            
            // Reset the variables dirtied in the previous iteration of the loop.
            columnNames = '';
            columnParams = '';
            updateExpression = '';
            insertValues = [];
            updateValues = [];
            record = records[i];

            // Compute columnNames, columnParams and updateExpression that will be used later in the INSERT and UPDATE statements.
            for (var property in record) {
                
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
                    updateValues.push(record[property]);
                }

                insertValues.push(record[property]);
            }
            
            // Insert the instance. If one with the same id already exists, ignore it.
            statements.push(_.format("INSERT OR IGNORE INTO {0} ({1}) VALUES ({2})", tableName, columnNames, columnParams));
            parameters.push(insertValues);

            // If there is any property other than id that needs to be upserted, update the record.
            if (updateValues.length > 0) {
                statements.push(_.format("UPDATE {0} SET {1} WHERE {2} = ?", tableName, updateExpression, idPropertyName));
                updateValues.push(record[idPropertyName]);
                parameters.push(updateValues);
            }
        }

        // Execute the INSERT and UPDATE statements.
        for (var i = 0; i < statements.length; i++) {
            transaction.executeSql(statements[i], parameters[i]);
        }
    };

    /**
     * Perform a record lookup in the local table
     * 
     * @param tableName Name of the local table in which lookup is to be performed
     * @param id ID of the object to be looked up
     * 
     * @returns Promise that will be resolved with the looked up object when the operation completes successfully OR 
     * rejected with the error if it fials. 
     */
    this.lookup = Platform.async(function (tableName, id) {

        // Extract the callback argument added by Platform.async and redefine the function arguments
        var callback = Array.prototype.pop.apply(arguments);
        tableName = arguments[0];
        id = arguments[1];

        // Validate the arguments
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
                var record;
                if (result.rows.length !== 0) {
                    record = result.rows.item(0);
                }

                // Deserialize the record read from the SQLite store into its original form.
                if (record) {
                    record = sqliteSerializer.deserialize(record, columnDefinitions);
                }
                callback(null, record);
            } catch (err) {
                callback(err);
            }
        }, function (err) {
            callback(err);
        });
    });

    /**
     * Deletes one or more records from the local table
     * 
     * @param tableNameOrQuery Either the name of the local table in which delete is to be performed,
     *                         Or a QueryJS object defining records to be deleted.
     * @param ids A single ID or an array of IDs of records to be deleted
     *            This argument is expected only if the first argument is table name and not a QueryJS object.
     * 
     * @returns Promise that is resolved when the operation completes successfully or rejected with the error if it fails.
     */
    this.del = Platform.async(function (tableNameOrQuery, ids) {

        // Extract the callback argument added by Platform.async and redefine the function arguments
        var callback = Array.prototype.pop.apply(arguments);
        tableNameOrQuery = arguments[0];
        ids = arguments[1];

        // Validate parameters
        Validate.isFunction(callback);
        Validate.notNull(tableNameOrQuery);

        if (_.isString(tableNameOrQuery)) {
            Validate.notNullOrEmpty(tableNameOrQuery, 'tableNameOrQuery');

            // If a single id is specified, convert it to an array and proceed.
            // Detailed validation of individual IDs in the array will be taken care of later.
            if (!_.isArray(ids)) {
                ids = [ids];
            }
            
            this._deleteIds(tableNameOrQuery /* table name */, ids, callback);
        } else if (_.isObject(tableNameOrQuery)) {
            this._deleteUsingQuery(tableNameOrQuery /* query */, callback);
        } else {
            throw _.format(Platform.getResourceString("TypeCheckError"), 'tableNameOrQuery', 'Object or String', typeof tableNameOrQuery);
        }
    });
    
    // Deletes the records selected by the specified query and notifies the callback.
    this._deleteUsingQuery = function (query, callback) {
        
            // The query can have a 'select' clause that queries only specific columns. However, we need to know values of all the columns
            // to avoid deleting wrong records. So we explicitly remove selection from the query, if any.
            var components = query.getComponents();
            if (components.selections && components.selections.length > 0) {
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

                    this._deleteRecords(tableName, result, callback);
                } catch (error) {
                    callback(error);
                }
            }.bind(this), function (error) {
                callback(error);
            });
    };

    // Delete the specified records from the table.
    // If multiple rows match any of the specified records, all will be deleted.
    this._deleteRecords = function (tableName, records, callback) {

        // Compute the SQL DELETE statements and parameters corresponding to each record we want to delete from the table.
        var deleteStatements = [],
            deleteParams = [];
        for (var i = 0; i < records.length; i++) {

            var record = records[i],
                whereClauses = [],
                whereParams = [];
            for (var propertyName in record) {
                whereClauses.push(_.format('{0} = ?', propertyName));
                whereParams.push(record[propertyName]);
            }

            deleteStatements.push(_.format('DELETE FROM {0} WHERE {1}', tableName, whereClauses.join(' AND ')));
            deleteParams.push(whereParams);
        }

        // Execute the DELETE statements
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

    /**
     * Read a local table
     * 
     * @param query A QueryJS object representing the query to use while reading the table
     * @returns A promise that is resolved with the read results when the operation is completed successfully or rejected with
     *          the error if it fails.
     */
    this.read = Platform.async(function (query) {

        // Extract the callback argument added by Platform.async and redefine the function arguments
        var callback = Array.prototype.pop.apply(arguments);
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
            statements = getSqlStatementsFromQuery(query);

        this._db.transaction(function (transaction) {

            // If the query requests the result count we expect 2 SQLite statements. Else, we expect a single statement.
            if (statements.length < 1 || statements.length > 2) {
                throw Platform.getResourceString("MobileServiceSqliteStore_UnexptedNumberOfStatements");
            }

            // The first statement gets the query results. Execute it.
            // TODO: Figure out a better way to determine what the statements in the array correspond to.    
            transaction.executeSql(statements[0].sql, getStatementParameters(statements[0]), function (transaction, res) {
                var record;
                for (var j = 0; j < res.rows.length; j++) {
                    // Deserialize the record read from the SQLite store into its original form.
                    record = sqliteSerializer.deserialize(res.rows.item(j), columnDefinitions);
                    result.push(record);
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
            // If we fetched the record count, combine the records and the count into an object.
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

// Converts the QueryJS object into equivalent SQLite statements
function getSqlStatementsFromQuery(query) {
    
    // Convert QueryJS object to an OData query string
    var odataQuery = queryHelper.toOData(query);
    
    // Convert the OData query string into equivalent SQLite statements
    var statements = formatSql(odataQuery, { flavor: 'sqlite' });
    
    return statements;
}

// Gets the parameters from a statement defined by azure-odata-sql
function getStatementParameters(statement) {
    var params = [];

    if (statement.parameters) {
        statement.parameters.forEach(function (param) {
            params.push(param.value);
        });
    }

    return params;
}

// Creates a table as per the specified definition and as part of the specified SQL transaction. 
function createTable(transaction, tableDefinition) {

    var columnDefinitions = tableDefinition.columnDefinitions;
    var columnDefinitionClauses = [];

    for (var columnName in columnDefinitions) {
        var columnType = columnDefinitions[columnName];

        var columnDefinitionClause = _.format("[{0}] {1}", columnName, sqliteSerializer.getSqliteType(columnType));

        if (columnName === idPropertyName) {
            columnDefinitionClause += " PRIMARY KEY";
        }

        columnDefinitionClauses.push(columnDefinitionClause);
    }
    
    var createTableStatement = _.format("CREATE TABLE [{0}] ({1})", tableDefinition.name, columnDefinitionClauses.join());

    transaction.executeSql(createTableStatement);
}

// Alters the table to add the missing columns
function addMissingColumns(transaction, tableDefinition, existingColumns) {

    // Add necessary columns to the table
    var columnDefinitions = tableDefinition.columnDefinitions;
    for (var columnName in columnDefinitions) {

        // If this column does not already exist, we need to create it.
        // SQLite does not support adding multiple columns using a single statement. Add one column at a time.
        if (!existingColumns[columnName]) {
            var alterStatement = _.format("ALTER TABLE {0} ADD COLUMN {1} {2}", tableDefinition.name, columnName, columnDefinitions[columnName]);
            transaction.executeSql(alterStatement);
        }
    }
}

// Valid Column types
MobileServiceSqliteStore.ColumnType = ColumnType;

// Define the module exports
module.exports = MobileServiceSqliteStore;
