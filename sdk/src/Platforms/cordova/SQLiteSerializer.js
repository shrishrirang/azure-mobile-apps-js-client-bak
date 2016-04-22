// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

var Platform = require('Platforms/Platform'),
    Validate = require('../../Utilities/Validate'),
    _ = require('../../Utilities/Extensions'),
    ColumnType = require('./SQLiteTypes').ColumnType,
    ColumnAffinity = require('./SQLiteTypes').ColumnAffinity,
    verror = require('verror');

/***
 * Gets the appropriate column affinity for storing values of the specified type in a SQLite table column
 * @param columnType - The type of values that will be stored in the SQLite table columnAffinity
 * @return The appropriate column affinity
 * @throw Will throw an error if columnType is not supported 
 */
function getColumnAffinity (columnType) {

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
        case ColumnType.Date:
            columnAffinity = "INTEGER";
            break;
        case ColumnType.Real:
        case ColumnType.Float:
            columnAffinity = "REAL";
            break;
        default:
            throw new Error(_.format(Platform.getResourceString("SQLiteSerializer_UnsupportedColumnType"), columnType));
    }

    return columnAffinity;
};

/***
 * Checks if the value can be stored in the specified column
 */
function isValueCompatibleWithColumnType(value, columnType) {
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
            return true; //_.isString(value) || _.isObject(value) || _.isString(value) || _.isNumber(value) || _.isBool(value); // FIXME: only string should be allowed
        case ColumnType.Boolean:
        case ColumnType.Bool:
            return _.isBool(value) || _.isInteger(value);
        case ColumnType.Integer:
        case ColumnType.Int:
            return _.isInteger(value) || _.isBool(value);
        case ColumnType.Date:
            return _.isDate(value);
        case ColumnType.Real:
        case ColumnType.Float:
            return _.isNumber(value);
        default:
            return false;
    }
}

/***
 * Checks if type is a supported type of column
 */
function isColumnTypeValid(type) {
    for (var key in ColumnType) {
        if (ColumnType[key] === type) {
            return true;
        }
    }
    return false;
}

/***
 * Serializes an object from writing to a SQLite table
 */
function serialize (value, columnDefinitions) {

    var serializedValue = {};

    try {
    
        if (_.isNull(value)) {
            return null;
        }

        Validate.notNull(columnDefinitions, 'columnDefinitions');
        Validate.isObject(columnDefinitions);
        Validate.isObject(value);

        for (var property in value) {
            var columnType = columnDefinitions[property];
            Validate.notNull(columnType);

            serializedValue[property] = serializeMember(value[property], columnType);
        }
        
    } catch (error) {
        throw new verror.VError(error, _.format(Platform.getResourceString("SQLiteSerializer_SerializationFailed"), JSON.stringify(value)));
    }

    return serializedValue;
};

/***
 * Deserializes a value read from a SQLite table
 */
function deserialize (value, columnDefinitions) {

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

/***
 * Serializes a property of an object for writing to a SQLite table
 */
function serializeMember(value, columnType) {
    
    // Start by checking if the specified column type is valid
    if (!isColumnTypeValid(columnType)) {
        throw new Error(_.format(Platform.getResourceString("SQLiteSerializer_UnsupportedColumnType"), columnType));
    }

    // Now check if the specified value can be stored in a column of type columnType
    if (!isValueCompatibleWithColumnType(value, columnType)) {
        throw new Error(_.format(Platform.getResourceString('SQLiteSerializer_UnsupportedTypeConversion'), JSON.stringify(value), typeof value, columnType));
    }

    // If we are here, it means we are good for proceeding with serialization
    
    var affinity = getColumnAffinity(columnType),
        serializedValue;
    
    switch (affinity) {
        case "TEXT":
            serializedValue = convertToText(value);
            break;
        case "INTEGER":
            serializedValue = convertToInteger(value);
            break;
        case "REAL":
            serializedValue = convertToReal(value);
            break;
        default:
            throw new Error(_.format(Platform.getResourceString("SQLiteSerializer_UnsupportedColumnType"), columnType));
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
                if (!_.isDate(value)) { // FIXME: change this to be like serializer logic
                    deserializedValue = convertToInteger(value);
                } else {
                    throw new Error(_.format(Platform.getResourceString('SQLiteSerializer_UnsupportedTypeConversion'), JSON.stringify(value), typeof value, targetType));
                }
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
        error = new Error(_.format(Platform.getResourceString('SQLiteSerializer_UnsupportedTypeConversion'), JSON.stringify(value), typeof value, targetType));
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
    
    if (_.isDate(value)) {
        return value.getTime();
    }

    throw new Error(_.format(Platform.getResourceString('SQLiteSerializer_UnsupportedTypeConversion'), JSON.stringify(value), typeof value, 'integer'));
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
        
    throw new Error(_.format(Platform.getResourceString('SQLiteSerializer_UnsupportedTypeConversion'), JSON.stringify(value), typeof value, 'Boolean'));
}

function convertToDate(value) {

    if (_.isNull(value)) // undefined/null value should be converted to null
        return null;

    if (_.isDate(value)) {
        return value;
    }

    var a = _.isInteger(value);
    if (_.isInteger(value)) {
        var b = _.isInteger(value);
        return new Date(value);
    } 

    throw new Error(_.format(Platform.getResourceString('SQLiteSerializer_UnsupportedTypeConversion'), JSON.stringify(value), typeof value, 'Date'));
}

function convertToReal(value) {

    if (_.isNull(value)) // undefined/null value should be converted to null
        return null;

    if (_.isNumber(value)) {
        return value;
    }

    throw new Error(_.format(Platform.getResourceString('SQLiteSerializer_UnsupportedTypeConversion'), JSON.stringify(value), typeof value, 'Real'));
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
        throw new Error(_.format(Platform.getResourceString('SQLiteSerializer_UnsupportedTypeConversion'), JSON.stringify(value), typeof value, 'Array'));
    }

    return result;
}

exports.serialize = serialize;
exports.deserialize = deserialize;
exports.getColumnAffinity = getColumnAffinity;