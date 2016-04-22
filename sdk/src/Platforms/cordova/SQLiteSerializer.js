// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

//FIXME: casing of all new files - camel or pascal?
//FIXME: comment style should be changed from winjs to jsdoc / javascript

var Platform = require('Platforms/Platform'),
    Validate = require('../../Utilities/Validate'),
    _ = require('../../Utilities/Extensions'),
    ColumnType = require('./SQLiteTypes').ColumnType,
    ColumnAffinity = require('./SQLiteTypes').ColumnAffinity,
    verror = require('verror'),
    typeConverter = require('./typeConverter');

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
            serializedValue = typeConverter.convertToText(value);
            break;
        case "INTEGER":
            serializedValue = typeConverter.convertToInteger(value);
            break;
        case "REAL":
            serializedValue = typeConverter.convertToReal(value);
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
                if (!_.isDate(value)) { // FIXME: change this to be like serializer logic
                    deserializedValue = typeConverter.convertToInteger(value);
                } else {
                    throw new Error(_.format(Platform.getResourceString('SQLiteSerializer_UnsupportedTypeConversion'), JSON.stringify(value), typeof value, targetType));
                }
                break;
            case ColumnType.Boolean:
            case ColumnType.Bool:
                deserializedValue = typeConverter.convertToBoolean(value);
                break;
            case ColumnType.Date:
                deserializedValue = typeConverter.convertToDate(value); // what happens if we serialize, then change machine timezone and then deserialize?
                break;
            case ColumnType.Real:
            case ColumnType.Float:
                deserializedValue = typeConverter.convertToReal(value);
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

exports.serialize = serialize;
exports.deserialize = deserialize;
exports.getColumnAffinity = getColumnAffinity;
