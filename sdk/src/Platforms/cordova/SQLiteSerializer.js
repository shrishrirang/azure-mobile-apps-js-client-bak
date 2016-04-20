// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

var Platform = require('Platforms/Platform'),
    Validate = require('../../Utilities/Validate'),
    _ = require('../../Utilities/Extensions'),
    ColumnType = require('./SQLiteTypes').ColumnType,
    ColumnAffinity = require('./SQLiteTypes').ColumnAffinity;

exports.getColumnAffinity = function(columnType) {
    /// <summary>
    /// Gets the appopriate column affinity for storing values of the specified type in a SQLite table column
    /// </summary>
    /// <param name="columnType">The type of values that will be stored in the SQLite table column</param>
    /// <returns>The appropriate column affinity</returns>

    var columnAffinity;

    switch (columnType) {
        case ColumnType.Object:
        case ColumnType.Array:
        case ColumnType.String:
        case ColumnType.Text:
            columnAffinity = "TEXT";
            break;
        case ColumnType.Integer:
        case ColumnType.Int:
        case ColumnType.Boolean:
        case ColumnType.Bool:
            columnAffinity = "INTEGER";
            break;
        case ColumnType.Real:
        case ColumnType.Float:
            columnAffinity = "REAL";
            break;
        case ColumnType.Date:
            columnAffinity = "NUMERIC";
            break;
        default:
            throw new Error(_.format(Platform.getResourceString("SQLiteSerializer_UnsupportedColumnType"), columnType));
    }

    return columnAffinity;
};

exports.serialize = function (value, columnDefinitions) {
    /// <summary>
    /// Serializes an object for writing to SQLite.
    /// Appopriate column affinities for creating the table to hold the serialized value can be obtained using the getColumnAffinity() function.
    /// </summary>
    /// <param name="value">The value to serialize.</param>
    /// <returns>Serialized value</returns>

    if (_.isNull(value)) {
        return null;
    }

    Validate.notNull(columnDefinitions, 'columnDefinitions');
    Validate.isObject(columnDefinitions);
    Validate.isObject(value);

    var serializedValue = {};

    for (var property in value) {
        var columnType = columnDefinitions[property];
        Validate.notNull(columnType);

        serializedValue[property] = serializeMember(value[property], columnType);
    }

    return serializedValue;
};

exports.deserialize = function (value, columnDefinitions) {
    /// <summary>
    /// Deserializes a value read from SQLite.
    /// </summary>
    /// <param name="value">The value to deserialize.</param>
    /// <param name="columnDefinitions">Property/column definitions of the object being deserialized.</param>
    /// <returns>Deserialized value</returns>

    if (_.isNull(value)) {
        return null;
    }

    Validate.notNull(columnDefinitions, 'columnDefinitions');
    Validate.isObject(columnDefinitions);
    Validate.isObject(value);

    var deserializedValue = {};

    var columnType;
    for (var property in value) {
        columnType = columnDefinitions[property];

        deserializedValue[property] = deserializeMember(value[property], columnType);
    }

    return deserializedValue;
};

// Serializes a property of an object for writing to SQLite
// Note: The value can be serialized without specifying the column type, but the function needs column type
// to enforce type safety. This way we don't need to wait for the value to be deserialized to know that the value is of an incorrect type.
function serializeMember(value, columnType) {

    if (_.isNull(value)) {
        return null;
    }

    var serializedValue, error;

    try {

        // Check if the value is of a type compatible with the column's type.
        // If it is, convert it to the appropriate type.
        switch (columnType) {
            case ColumnType.Object:
                if (_.isObject(value)) {
                    serializedValue = convertToText(value);
                }
                break;
            case ColumnType.Array:
                if (_.isArray(value)) {
                    serializedValue = convertToText(value);
                }
                break;
            case ColumnType.String:
            case ColumnType.Text:
                // Allow any value to be store in a text column
                serializedValue = convertToText(value);
                break;
            case ColumnType.Boolean:
            case ColumnType.Bool:
            case ColumnType.Integer:
            case ColumnType.Int:
                if (_.isBool(value) || _.isInteger(value)) {
                    serializedValue = convertToInteger(value);
                }
                break;
            case ColumnType.Date:
                if (_.isDate(value)) {
                    serializedValue = value; // should this be numeric? text? or date as is.. 
                }
                break;
            case ColumnType.Real:
            case ColumnType.Float:
                if (_.isNumber(value)) {
                    serializedValue = convertToReal(value);
                }
                break;
            default:
                error = new Error(_.format(Platform.getResourceString("SQLiteSerializer_UnsupportedColumnType"), columnType));
                break;
        }
    } finally {
        // For anything that went wrong, return a meaningful error if we haven't done so already.
        if (!error && serializedValue === undefined) {
            error = new Error(Platform.getResourceString('SQLiteSerializer_UnsupportedTypeConversion'), value, typeof value, columnType);
        }
    }

    if (!_.isNull(error)) {
        throw error;
    }

    return serializedValue;
}

// Deserializes a property of an object read from SQLite
function deserializeMember(value, targetType) {
    var deserializedValue, error;

    try {
        switch (targetType) {
            case ColumnType.Object:
                deserializedValue = convertToObject(value);
                break;
            case ColumnType.Array:
                deserializedValue = convertToArray(value);
                break;
            case ColumnType.String:
            case ColumnType.Text:
                deserializedValue = convertToText(value);
                break;
            case ColumnType.Integer:
            case ColumnType.Int:
                deserializedValue = convertToInteger(value);
                break;
            case ColumnType.Boolean:
            case ColumnType.Bool:
                deserializedValue = convertToBoolean(value);
                break;
            case ColumnType.Date:
                deserializedValue = convertToDate(value); // what happens if we serialize, then change machine timezone and then deserialize?
                break;
            case ColumnType.Real:
            case ColumnType.Float:
                deserializedValue = convertToReal(value);
                break;
            case undefined: // We want to be able to deserialize objects with missing columns in table definition
                deserializedValue = value;
                break;
            default:
                error = new Error(_.format(Platform.getResourceString("SQLiteSerializer_UnsupportedColumnType"), targetType));
                break;
        }
    } catch (ex) {
        error = new Error(_.format(Platform.getResourceString('SQLiteSerializer_UnsupportedTypeConversion'), value, typeof value, targetType));
    }

    if (!_.isNull(error)) {
        throw error;
    }

    return deserializedValue;
}

function convertToText(value) {
    
    if (_.isNull(value)) // undefined/null value should be converted to null
        return null;

    if (_.isString(value)) {
        return value;
    }

    return JSON.stringify(value);
}

function convertToInteger(value) {

    if (_.isNull(value)) // undefined/null value should be converted to null
        return null;

    if (_.isInteger(value)) {
        return value;
    }

    if (_.isBool(value)) {
        return value ? 1 : 0;
    }

    throw new Error(_.format(Platform.getResourceString('SQLiteSerializer_UnsupportedTypeConversion'), value, typeof value, 'integer'));
}

function convertToBoolean(value) {

    if (_.isNull(value)) // undefined/null value should be converted to null
        return null;

    if (_.isBool(value)) {
        return value;
    }

    if (_.isInteger(value)) {
        return value === 0 ? false : true;
    }
        
    throw new Error(_.format(Platform.getResourceString('SQLiteSerializer_UnsupportedTypeConversion'), value, typeof value, 'Boolean'));
}

function convertToDate(value) {

    if (_.isNull(value)) // undefined/null value should be converted to null
        return null;

    if (_.isDate(value)) {
        return value;
    }

    if (_.isString(value)) {
        var milliseconds = Date.parse(value);

        if (_.isInteger(milliseconds)) {
            return new Date(milliseconds);
        }
    }

    throw new Error(_.format(Platform.getResourceString('SQLiteSerializer_UnsupportedTypeConversion'), value, typeof value, 'Date'));
}

function convertToReal(value) {

    if (_.isNull(value)) // undefined/null value should be converted to null
        return null;

    if (_.isNumber(value)) {
        return value;
    }

    throw new Error(_.format(Platform.getResourceString('SQLiteSerializer_UnsupportedTypeConversion'), value, typeof value, 'Real'));
}

function convertToObject(value) {

    if (_.isNull(value)) // undefined/null value should be converted to null
        return null;

    if (_.isObject(value)) {
        return value;
    }

    Validate.isString(value);
    var result = JSON.parse(value);

    // Make sure the deserialized value is indeed an object
    Validate.isObject(result);

    return result;
}

function convertToArray(value) {

    if (_.isNull(value)) // undefined/null value should be converted to null
        return null;

    if (_.isArray(value)) {
        return value;
    }

    var result;
    try {
        result = JSON.parse(value);

        // Make sure the deserialized value is indeed an array
        Validate.isArray(result);
    } catch (ex) {
        // throw a meaningful exception
        throw new Error(_.format(Platform.getResourceString('SQLiteSerializer_UnsupportedTypeConversion'), value, typeof value, 'Array'));
    }

    return result;
}
