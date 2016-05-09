// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/**
 * @file Defines functions for serializing a JS object into an object that can be used for storing in a SQLite table and
 *       for deserializing a row / object read from a SQLite table into a JS object. The target type of a serialization or
 *       a deserialization operation is determined by the specified column definition.
 */

var Platform = require('Platforms/Platform'),
    Validate = require('../../Utilities/Validate'),
    _ = require('../../Utilities/Extensions'),
    ColumnType = require('../../sync/ColumnType'),
    verror = require('verror'),
    typeConverter = require('./typeConverter');

/**
 * Gets the SQLite type that matches the specified ColumnType.
 * @param columnType - The type of values that will be stored in the SQLite table
 * @throw Will throw an error if columnType is not supported 
 */
function getSqliteType (columnType) {
    var sqliteType;

    switch (columnType) {
        case ColumnType.Object:
        case ColumnType.Array:
        case ColumnType.String:
        case ColumnType.Text:
            sqliteType = "TEXT";
            break;
        case ColumnType.Integer:
        case ColumnType.Int:
        case ColumnType.Boolean:
        case ColumnType.Bool:
        case ColumnType.Date:
            sqliteType = "INTEGER";
            break;
        case ColumnType.Real:
        case ColumnType.Float:
            sqliteType = "REAL";
            break;
        default:
            throw new Error(_.format(Platform.getResourceString("sqliteSerializer_UnsupportedColumnType"), columnType));
    }

    return sqliteType;
}

/**
 * Checks if the value can be stored in a table column of the specified type.
 * Example: Float values can be stored in column of type ColumnType.Float but not ColumnType.Integer. 
 */
function isJSValueCompatibleWithColumnType(value, columnType) {
    
    // Allow NULL values to be stored in columns of any type
    if (_.isNull(value)) {
        return true;
    }
    
    switch (columnType) {
        case ColumnType.Object:
            return _.isObject(value);
        case ColumnType.Array:
            return _.isArray(value);
        case ColumnType.String:
        case ColumnType.Text:
            return true; // Allow any value to be stored in a string column
        case ColumnType.Boolean:
        case ColumnType.Bool:
        case ColumnType.Integer:
        case ColumnType.Int:
            return _.isBool(value) || _.isInteger(value);
        case ColumnType.Date:
            return _.isDate(value);
        case ColumnType.Real:
        case ColumnType.Float:
            return _.isNumber(value);
        default:
            return false;
    }
}

/**
 * Checks if the SQLite value matches the specified ColumnType.
 * A value read from a SQLite table can be incompatible with the specified column type, if it was stored
 * in the table using a column type different from columnType.
 * Example: If a non-integer numeric value is stored in a column of type ColumnType.Float and 
 * then deserialized into a column of type ColumnType.Integer, that will be an error. 
 */
function isSqliteValueCompatibleWithColumnType(value, columnType) {
    
    // Null is a valid value for any column type
    if (_.isNull(value)) {
        return true;
    }
    
    switch (columnType) {
        case ColumnType.Object:
            return _.isString(value);
        case ColumnType.Array:
            return _.isString(value);
        case ColumnType.String:
        case ColumnType.Text:
            return _.isString(value);
        case ColumnType.Boolean:
        case ColumnType.Bool:
            return _.isInteger(value);
        case ColumnType.Integer:
        case ColumnType.Int:
            return _.isInteger(value);
        case ColumnType.Date:
            return _.isInteger(value);
        case ColumnType.Real:
        case ColumnType.Float:
            return _.isNumber(value);
        default:
            return false;
    }
}

/**
 * Checks if type is a supported ColumnType
 */
function isColumnTypeValid(type) {
    for (var key in ColumnType) {
        if (ColumnType[key] === type) {
            return true;
        }
    }
    return false;
}

/**
 * Serializes an object into an object that can be stored in a SQLite table, as defined by columnDefinitions.
 */
function serialize (value, columnDefinitions) {

    var serializedValue = {};

    try {
        Validate.notNull(columnDefinitions, 'columnDefinitions');
        Validate.isObject(columnDefinitions);
        
        Validate.notNull(value);
        Validate.isObject(value);

        for (var property in value) {
            var columnType = columnDefinitions[property];
            Validate.notNull(columnType); // Make sure the column type is defined. 
            serializedValue[property] = serializeMember(value[property], columnType);
        }
        
    } catch (error) {
        throw new verror.VError(error, Platform.getResourceString("sqliteSerializer_SerializationFailed"), JSON.stringify(value), JSON.stringify(columnDefinitions));
    }

    return serializedValue;
}

/**
 * Deserializes a row read from a SQLite table into a Javascript object, as defined by columnDefinitions.
 */
function deserialize (value, columnDefinitions) {

    var deserializedValue = {};
    
    try {
        Validate.notNull(columnDefinitions, 'columnDefinitions');
        Validate.isObject(columnDefinitions);

        Validate.notNull(value);
        Validate.isObject(value);

        for (var property in value) {
            deserializedValue[property] = deserializeMember(value[property], columnDefinitions[property]);
        }
        
    } catch (error) {
        throw new verror.VError(error, Platform.getResourceString("sqliteSerializer_DeserializationFailed"), JSON.stringify(value), JSON.stringify(columnDefinitions));
    }

    return deserializedValue;
}

/**
 * Serializes a property of an object into a value which can be stored in a SQLite column of type columnType. 
 */
function serializeMember(value, columnType) {
    
    // Start by checking if the specified column type is valid
    if (!isColumnTypeValid(columnType)) {
        throw new Error(_.format(Platform.getResourceString("sqliteSerializer_UnsupportedColumnType"), columnType));
    }

    // Now check if the specified value can be stored in a column of type columnType
    if (!isJSValueCompatibleWithColumnType(value, columnType)) {
        throw new Error(_.format(Platform.getResourceString('sqliteSerializer_UnsupportedTypeConversion'), JSON.stringify(value), typeof value, columnType));
    }

    // If we are here, it means we are good to proceed with serialization
    
    var sqliteType = getSqliteType(columnType),
        serializedValue;
    
    switch (sqliteType) {
        case "TEXT":
            serializedValue = typeConverter.convertToText(value);
            break;
        case "INTEGER":
            serializedValue = typeConverter.convertToInteger(value);
            break;
        case "REAL":
            serializedValue = typeConverter.convertToReal(value);
            break;
        default:
            throw new Error(_.format(Platform.getResourceString("sqliteSerializer_UnsupportedColumnType"), columnType));
    }
    
    return serializedValue;
}

// Deserializes a property of an object read from SQLite into a value of type columnType
function deserializeMember(value, columnType) {
    
    // Handle this special case first.
    // Simply return 'value' if a corresponding columnType is not defined.   
    if (!columnType) {
        return value;
    }

    // Start by checking if the specified column type is valid.
    if (!isColumnTypeValid(columnType)) {
        throw new Error(_.format(Platform.getResourceString("sqliteSerializer_UnsupportedColumnType"), columnType));
    }

    // Now check if the specified value can be stored in a column of type columnType.
    if (!isSqliteValueCompatibleWithColumnType(value, columnType)) {
        throw new Error(_.format(Platform.getResourceString('sqliteSerializer_UnsupportedTypeConversion'), JSON.stringify(value), typeof value, columnType));
    }

    // If we are here, it means we are good to proceed with deserialization
    
    var deserializedValue, error;

    switch (columnType) {
        case ColumnType.Object:
            deserializedValue = typeConverter.convertToObject(value);
            break;
        case ColumnType.Array:
            deserializedValue = typeConverter.convertToArray(value);
            break;
        case ColumnType.String:
        case ColumnType.Text:
            deserializedValue = typeConverter.convertToText(value);
            break;
        case ColumnType.Integer:
        case ColumnType.Int:
            deserializedValue = typeConverter.convertToInteger(value);
            break;
        case ColumnType.Boolean:
        case ColumnType.Bool:
            deserializedValue = typeConverter.convertToBoolean(value);
            break;
        case ColumnType.Date:
            deserializedValue = typeConverter.convertToDate(value);
            break;
        case ColumnType.Real:
        case ColumnType.Float:
            deserializedValue = typeConverter.convertToReal(value);
            break;
        default:
            throw new Error(_.format(Platform.getResourceString("sqliteSerializer_UnsupportedColumnType"), columnType));
    }

    return deserializedValue;
}

exports.serialize = serialize;
exports.deserialize = deserialize;
exports.getSqliteType = getSqliteType;
