﻿// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

var Validate = require('../../../../src/Utilities/Validate'),
    Platform = require('Platforms/Platform'),
    SQLiteSerializer = require('../../../../src/Platforms/cordova/SQLiteSerializer'),
        ColumnType = require('../../../../src/Platforms/cordova/SQLiteTypes').ColumnType;

$testGroup('SQLiteSerializer tests').tests(
    $test('Ensure unit tests are up to date')
    .check(function () {

        // If this test fails, it means the column type enum has changed.
        // Add / update UTs to handle the changes and only then fix this test.
        $assert.areEqual(ColumnType, {
            Object: "object",
            Array: "array",
            Integer: "integer",
            Int: "int",
            Float: "float",
            Real: "real",
            String: "string",
            Text: "text",
            Boolean: "boolean",
            Bool: "bool",
            Date: "date"
        });
    }),

    $test('Verify column affinity computation')
    .check(function () {
        $assert.areEqual(SQLiteSerializer.getSqliteType(ColumnType.Object), 'TEXT');
        $assert.areEqual(SQLiteSerializer.getSqliteType(ColumnType.Array), 'TEXT');
        $assert.areEqual(SQLiteSerializer.getSqliteType(ColumnType.String), 'TEXT');
        $assert.areEqual(SQLiteSerializer.getSqliteType(ColumnType.Text), 'TEXT');

        $assert.areEqual(SQLiteSerializer.getSqliteType(ColumnType.Integer), 'INTEGER');
        $assert.areEqual(SQLiteSerializer.getSqliteType(ColumnType.Int), 'INTEGER');
        $assert.areEqual(SQLiteSerializer.getSqliteType(ColumnType.Boolean), 'INTEGER');
        $assert.areEqual(SQLiteSerializer.getSqliteType(ColumnType.Bool), 'INTEGER');

        $assert.areEqual(SQLiteSerializer.getSqliteType(ColumnType.Real), 'REAL');
        $assert.areEqual(SQLiteSerializer.getSqliteType(ColumnType.Float), 'REAL');

        $assert.areEqual(SQLiteSerializer.getSqliteType(ColumnType.Date), 'INTEGER');

        $assertThrows(function () { SQLiteSerializer.getSqliteType('notsupported'); });
        $assertThrows(function () { SQLiteSerializer.getSqliteType(5); });
        $assertThrows(function () { SQLiteSerializer.getSqliteType([]); });
        $assertThrows(function () { SQLiteSerializer.getSqliteType(null); });
        $assertThrows(function () { SQLiteSerializer.getSqliteType(undefined); });
    }),

    $test('roundtripping: single property')
    .check(function () {
        var value = { a: 1 };
        var columnDefinitions = { a: ColumnType.Integer };
        var serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
        $assert.areEqual(serializedValue, value);
        $assert.areEqual(SQLiteSerializer.deserialize(serializedValue, columnDefinitions), value);
    }),

    $test('roundtripping: empty object')
    .check(function () {
        var value = {};
        var columnDefinitions = {};
        var serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
        $assert.areEqual(serializedValue, value);
        $assert.areEqual(SQLiteSerializer.deserialize(serializedValue, columnDefinitions), value);
    }),

    $test('roundtripping: undefined')
    .check(function () {
        var serializedValue = SQLiteSerializer.serialize(undefined, null);
        $assert.areEqual(serializedValue, null);
        $assert.areEqual(SQLiteSerializer.deserialize(serializedValue, null), null);
    }),

    $test('roundtripping: null')
    .check(function () {
        var serializedValue = SQLiteSerializer.serialize(null, undefined);
        $assert.areEqual(serializedValue, null);
        $assert.areEqual(SQLiteSerializer.deserialize(serializedValue, null), null);
    }),

    $test('roundtripping: id property')
    .check(function () {
        var value = { id: 1, val: '2' };
        var columnDefinitions = { id: ColumnType.Integer, val: ColumnType.String };
        var serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
        $assert.areEqual(serializedValue, value);
        $assert.areEqual(SQLiteSerializer.deserialize(serializedValue, columnDefinitions), value);
    }),

    $test('serialization: missing column in definition')
    .check(function () {
        $assertThrows(function () {
            SQLiteSerializer.serialize({
                a: 1,
                nodefinition: false
            }, {
                a: ColumnType.Integer
            });
        });
    }),

    $test('deserialization: missing column in definition')
    .check(function () {
        var value = {
            object: { a: 1, b: 'str', c: [1, 2] },
            array: [1, 2, { a: 1 }],
            string: 'somestring',
            text: 'sometext',
            integer: 5,
            int: 6,
            bool: true,
            boolean: false,
            real: 1.5,
            float: 2.2,
            date: new Date(2001, 1, 1)
        };
        var deserializedValue = SQLiteSerializer.deserialize(value, { /* all columns missing from definition */ });
        $assert.areEqual(deserializedValue, value);
    }),

    $test('serialization: null column definition')
    .check(function () {
        $assertThrows(function () {
            SQLiteSerializer.serialize({ a: 1 }, null);
        });
    }),

    $test('deserialization: undefined column definition')
    .check(function () {
        $assertThrows(function () {
            SQLiteSerializer.serialize({ a: 1 });
        });
    }),

    $test('deserialization: null column definition')
    .check(function () {
        $assertThrows(function () {
            SQLiteSerializer.deserialize({ a: 1 }, null);
        });
    }),

    $test('deserialization: undefined column definition')
    .check(function () {
        $assertThrows(function () {
            SQLiteSerializer.deserialize({ a: 1 });
        });
    }),

    $test('property of type object, different column types')
    .check(function () {
        var value = { val: {} },
            columnDefinitions = {},
            serialize = function() {
            SQLiteSerializer.serialize(value, columnDefinitions);
        };

        for (var c in ColumnType) {

            columnDefinitions.val = ColumnType[c];

            switch (ColumnType[c]) {
                // Serialization should work only for these column types
                case ColumnType.Object:
                case ColumnType.String:
                case ColumnType.Text:
                    var serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
                    $assert.areEqual(serializedValue, { val: JSON.stringify(value.val) });
                    break;
                // Serializing as any other type should fail
                default:
                    $assertThrows(serialize);
                    break;
            }
        }
    }),

    $test('property of type array, different column types')
    .check(function () {
        var value = { val: [1, 2] },
            columnDefinitions = {},
            serialize = function () {
                SQLiteSerializer.serialize(value, columnDefinitions);
            };

        for (var c in ColumnType) {

            columnDefinitions.val = ColumnType[c];

            switch (ColumnType[c]) {
                // Serialization should work only for these column types
                case ColumnType.Object:
                case ColumnType.Array:
                case ColumnType.String:
                case ColumnType.Text:
                    var serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
                    $assert.areEqual(serializedValue, { val: JSON.stringify(value.val) });
                    break;
                // Serializing as any other type should fail
                default:
                    $assertThrows(serialize);
                    break;
            }
        }
    }),

    $test('property of type string, different column types')
    .check(function () {
        var value = { val: 'somestring' },
            columnDefinitions = {},
            serialize = function () {
                SQLiteSerializer.serialize(value, columnDefinitions);
            };

        for (var c in ColumnType) {

            columnDefinitions.val = ColumnType[c];

            switch (ColumnType[c]) {
                // Serialization should work only for these column types
                case ColumnType.String:
                case ColumnType.Text:
                    var serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
                    $assert.areEqual(serializedValue, value);
                    break;
                // Serializing as any other type should fail
                default:
                    $assertThrows(serialize);
                    break;
            }
        }
    }),

    $test('property of type string and integer value, different column types')
    .check(function () {
        var value = { val: '5' },
            columnDefinitions = {},
            serialize = function () {
                SQLiteSerializer.serialize(value, columnDefinitions);
            };

        for (var c in ColumnType) {

            columnDefinitions.val = ColumnType[c];

            switch (ColumnType[c]) {
                // Serialization should work only for these column types
                case ColumnType.String:
                case ColumnType.Text:
                    var serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
                    $assert.areEqual(serializedValue, value);
                    break;
                    // Serializing as any other type should fail
                default:
                    $assertThrows(serialize);
                    break;
            }
        }
    }),

    $test('property with integer value, different column types')
    .check(function () {
        var value = { val: 51 },
            columnDefinitions = {},
            serialize = function () {
                SQLiteSerializer.serialize(value, columnDefinitions);
            };

        for (var c in ColumnType) {

            columnDefinitions.val = ColumnType[c];

            var serializedValue;
            switch (ColumnType[c]) {
                case ColumnType.Integer:
                case ColumnType.Int:
                case ColumnType.Float:
                case ColumnType.Real:
                case ColumnType.Boolean:
                case ColumnType.Bool:
                    serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
                    $assert.areEqual(serializedValue, value);
                    break;
                case ColumnType.String:
                case ColumnType.Text:
                    serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
                    $assert.areEqual(serializedValue, { val: '51' });
                    break;
                // Serializing as any other type should fail
                default:
                    $assertThrows(serialize);
                    break;
            }
        }
    }),

    $test('property with a boolean true value, different column types')
    .check(function () {
        var value = { val: true },
            columnDefinitions = {},
            serialize = function () {
                SQLiteSerializer.serialize(value, columnDefinitions);
            };

        for (var c in ColumnType) {

            columnDefinitions.val = ColumnType[c];

            var serializedValue;
            switch (ColumnType[c]) {
                case ColumnType.Integer:
                case ColumnType.Int:
                    serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
                    $assert.areEqual(serializedValue, { val: 1 });
                    break;
                case ColumnType.String:
                case ColumnType.Text:
                    serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
                    $assert.areEqual(serializedValue, { val: 'true' });
                    break;
                case ColumnType.Boolean:
                case ColumnType.Bool:
                    serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
                    $assert.areEqual(serializedValue, { val: 1 });
                    break;
                    // Serializing as any other type should fail
                default:
                    $assertThrows(serialize);
                    break;
            }
        }
    }),

    $test('property with a boolean false value, different column types')
    .check(function () {
        var value = { val: false },
            columnDefinitions = {},
            serialize = function () {
                SQLiteSerializer.serialize(value, columnDefinitions);
            };

        for (var c in ColumnType) {

            columnDefinitions.val = ColumnType[c];

            var serializedValue;
            switch (ColumnType[c]) {
                case ColumnType.Integer:
                case ColumnType.Int:
                    serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
                    $assert.areEqual(serializedValue, { val: 0 });
                    break;
                case ColumnType.String:
                case ColumnType.Text:
                    serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
                    $assert.areEqual(serializedValue, { val: 'false' });
                    break;
                case ColumnType.Boolean:
                case ColumnType.Bool:
                    serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
                    $assert.areEqual(serializedValue, { val: 0 });
                    break;
                // Serializing as any other type should fail
                default:
                    $assertThrows(serialize);
                    break;
            }
        }
    }),

    $test('property with a float value, different column types')
    .check(function () {
        var value = { val: -5.55 },
            columnDefinitions = {},
            serialize = function () {
                SQLiteSerializer.serialize(value, columnDefinitions);
            };

        for (var c in ColumnType) {

            columnDefinitions.val = ColumnType[c];

            var serializedValue;
            switch (ColumnType[c]) {
                case ColumnType.Float:
                case ColumnType.Real:
                    serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
                    $assert.areEqual(serializedValue, { val: -5.55 });
                    break;
                case ColumnType.String:
                case ColumnType.Text:
                    serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
                    $assert.areEqual(serializedValue, { val: '-5.55' });
                    break;
                // Serializing as any other type should fail
                default:
                    $assertThrows(serialize);
                    break;
            }
        }
    }),

    $test('property with a date value, different column types')
    .check(function () {
        var value = { val: new Date(2011, 10, 11, 12, 13, 14) },
            columnDefinitions = {},
            serialize = function () {
                SQLiteSerializer.serialize(value, columnDefinitions);
            };

        for (var c in ColumnType) {

            columnDefinitions.val = ColumnType[c];

            var serializedValue;
            switch (ColumnType[c]) {
                case ColumnType.Date:
                    serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
                    $assert.areEqual(serializedValue, serializedValue);
                    break;
                case ColumnType.String:
                case ColumnType.Text:
                    serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
                    $assert.areEqual(serializedValue, { val: '\"2011-11-11T20:13:14.000Z\"' });
                    break;
                // Serializing as any other type should fail
                default:
                    $assertThrows(serialize);
                    break;
            }
        }
    }),

    $test('property with null value, different column types')
    .check(function () {
        var value = { val: null },
            columnDefinitions = {};

        for (var c in ColumnType) {

            columnDefinitions.val = ColumnType[c];

            var serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
            $assert.areEqual(serializedValue, value);
        }
    }),

    $test('property with undefined value, different column types')
    .check(function () {
        var value = { val: null },
            columnDefinitions = {};

        for (var c in ColumnType) {

            columnDefinitions.val = ColumnType[c];

            var serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
            $assert.areEqual(serializedValue, { val: null });
        }
    }),

    $test('Attempting to serialize to an unsupported column should fail')
    .check(function () {
        var value = {},
            columnDefinitions = {val: 'someunsupportedtype'},
            serialize = function () {
                SQLiteSerializer.serialize(value, columnDefinitions);
            };

        // object
        value.val = { a: 1 };
        $assertThrows(serialize);

        // array
        value.val = [1, 2];
        $assertThrows(serialize);

        // integer
        value.val = 5;
        $assertThrows(serialize);

        // float
        value.val = -5.5;
        $assertThrows(serialize);

        // string
        value.val = 'somestring';
        $assertThrows(serialize);

        // bool
        value.val = true;
        $assertThrows(serialize);
    }),

    $test('deserialize: property of type object, different column types')
    .check(function () {
        var value = { val: { a: 1 } },
            columnDefinitions = {},
            deserialize = function () {
                SQLiteSerializer.deserialize(value, columnDefinitions);
            };

        var deserializedValue;
        for (var c in ColumnType) {

            columnDefinitions.val = ColumnType[c];

            // Deserializing to any type should fail            
            $assertThrows(deserialize);
        }
    }),

    $test('deserialize: property of type array, different column types')
    .check(function () {
        var value = { val: [1, 2] },
            columnDefinitions = {},
            deserialize = function () {
                SQLiteSerializer.deserialize(value, columnDefinitions);
            };

        var deserializedValue;
        for (var c in ColumnType) {

            columnDefinitions.val = ColumnType[c];

            // Deserializing to any type should fail            
            $assertThrows(deserialize);
        }
    }),

    $test('deserialize: property of type string, different column types')
    .check(function () {
        var value = { val: 'somestring' },
            columnDefinitions = {},
            deserialize = function () {
                SQLiteSerializer.deserialize(value, columnDefinitions);
            };

        var deserializedValue;
        for (var c in ColumnType) {

            columnDefinitions.val = ColumnType[c];

            switch (ColumnType[c]) {
                case ColumnType.String:
                case ColumnType.Text:
                    deserializedValue = SQLiteSerializer.deserialize(value, columnDefinitions);
                    $assert.areEqual(deserializedValue, value);
                    break;
                    // Deserializing to any other type should fail
                default:
                    $assertThrows(deserialize);
                    break;
            }
        }
    }),

    $test('deserialize: property of type string and integer value, different column types')
    .check(function () {
        var value = { val: '51' },
            columnDefinitions = {},
            deserialize = function () {
                SQLiteSerializer.deserialize(value, columnDefinitions);
            };

        var deserializedValue;
        for (var c in ColumnType) {

            columnDefinitions.val = ColumnType[c];

            switch (ColumnType[c]) {
                case ColumnType.String:
                case ColumnType.Text:
                    deserializedValue = SQLiteSerializer.deserialize(value, columnDefinitions);
                    $assert.areEqual(deserializedValue, value);
                    break;
                // Deserializing to any other type should fail
                default:
                    $assertThrows(deserialize);
                    break;
            }
        }
    }),

    $test('deserialize: property of type integer with a non-zero value, different column types')
    .check(function () {
        var value = { val: 51 },
            columnDefinitions = {},
            deserialize = function () {
                SQLiteSerializer.deserialize(value, columnDefinitions);
            };

        var deserializedValue;
        for (var c in ColumnType) {

            columnDefinitions.val = ColumnType[c];

            switch (ColumnType[c]) {
                case ColumnType.Integer:
                case ColumnType.Int:
                case ColumnType.Float:
                case ColumnType.Real:
                    deserializedValue = SQLiteSerializer.deserialize(value, columnDefinitions);
                    $assert.areEqual(deserializedValue, value);
                    break;
                case ColumnType.Boolean:
                case ColumnType.Bool:
                    deserializedValue = SQLiteSerializer.deserialize(value, columnDefinitions);
                    $assert.areEqual(deserializedValue, { val: true });
                    break;
                case ColumnType.Date:
                    deserializedValue = SQLiteSerializer.deserialize(value, columnDefinitions);
                    $assert.isNotNull(deserializedValue);
                    $assert.isNotNull(deserializedValue.val);
                    Validate.isDate(deserializedValue.val);
                    var v = deserializedValue.val.toISOString();
                    $assert.areEqual(v, "1970-01-01T00:00:00.051Z");
                    break;
                // Deserializing to any other type should fail
                default:
                    $assertThrows(deserialize);
                    break;
            }
        }
    }),

    $test('deserialize: property of type integer with value zero, different column types')
    .check(function () {
        var value = { val: 0 },
            columnDefinitions = {},
            deserialize = function () {
                SQLiteSerializer.deserialize(value, columnDefinitions);
            };

        var deserializedValue;
        for (var c in ColumnType) {

            columnDefinitions.val = ColumnType[c];

            switch (ColumnType[c]) {
                case ColumnType.Integer:
                case ColumnType.Int:
                case ColumnType.Float:
                case ColumnType.Real:
                    deserializedValue = SQLiteSerializer.deserialize(value, columnDefinitions);
                    $assert.areEqual(deserializedValue, value);
                    break;
                case ColumnType.Boolean:
                case ColumnType.Bool:
                    deserializedValue = SQLiteSerializer.deserialize(value, columnDefinitions);
                    $assert.areEqual(deserializedValue, { val: false });
                    break;
                case ColumnType.Date:
                    deserializedValue = SQLiteSerializer.deserialize(value, columnDefinitions);
                    $assert.isNotNull(deserializedValue);
                    $assert.isNotNull(deserializedValue.val);
                    Validate.isDate(deserializedValue.val);
                    var v = deserializedValue.val.toISOString();
                    $assert.areEqual(v, "1970-01-01T00:00:00.000Z");
                    break;
                // Deserializing to any other type should fail
                default:
                    $assertThrows(deserialize);
                    break;
            }
        }
    }),

    $test('deserialize: property with a boolean true value, different column types')
    .check(function () {
        var value = { val: true },
            columnDefinitions = {},
            deserialize = function () {
                SQLiteSerializer.deserialize(value, columnDefinitions);
            };

        var deserializedValue;
        for (var c in ColumnType) {

            columnDefinitions.val = ColumnType[c];

            // Deserializing to any type should fail
            $assertThrows(deserialize);
        }
    }),

    $test('deserialize: property with a boolean false value, different column types')
    .check(function () {
        var value = { val: false },
            columnDefinitions = {},
            deserialize = function () {
                SQLiteSerializer.deserialize(value, columnDefinitions);
            };

        var deserializedValue;
        for (var c in ColumnType) {

            columnDefinitions.val = ColumnType[c];

            // Deserializing to any type should fail
            $assertThrows(deserialize);
        }
    }),

    $test('deserialize: property of type float, different column types')
    .check(function () {
        var value = { val: -1.5 },
            columnDefinitions = {},
            deserialize = function () {
                SQLiteSerializer.deserialize(value, columnDefinitions);
            };

        var deserializedValue;
        for (var c in ColumnType) {

            columnDefinitions.val = ColumnType[c];

            switch (ColumnType[c]) {
                case ColumnType.Float:
                case ColumnType.Real:
                    deserializedValue = SQLiteSerializer.deserialize(value, columnDefinitions);
                    $assert.areEqual(deserializedValue, value);
                    break;
                // Deserializing to any other type should fail
                default:
                    $assertThrows(deserialize);
                    break;
            }
        }
    }),

    $test('deserialize: property of type date, different column types')
    .check(function () {
        var value = { val: new Date(2011, 10, 11, 12, 13, 14) },
            columnDefinitions = {},
            deserialize = function () {
                SQLiteSerializer.deserialize(value, columnDefinitions);
            };

        var deserializedValue;
        for (var c in ColumnType) {

            columnDefinitions.val = ColumnType[c];

            // Deserializing to any type should fail
            $assertThrows(deserialize);
        }
    }),

    $test('deserialize: property with null value, different column types')
    .check(function () {
        var value = { val: null },
            columnDefinitions = {};

        for (var c in ColumnType) {

            columnDefinitions.val = ColumnType[c];

            $assert.areEqual(SQLiteSerializer.deserialize(value, columnDefinitions), value);
        }
    }),

    $test('deserialize: property with undefined value, different column types')
    .check(function () {
        var value = { val: undefined },
            columnDefinitions = {};

        for (var c in ColumnType) {

            columnDefinitions.val = ColumnType[c];

            $assert.areEqual(SQLiteSerializer.deserialize(value, columnDefinitions), {val: null});
        }
    }),

    $test('deserialize: Attempting to deserialize to an unsupported column should fail')
    .check(function () {
        var value = {},
            columnDefinitions = { val: 'someunsupportedtype' },
            deserialize = function () {
                SQLiteSerializer.deserialize(value, columnDefinitions);
            };

        // object
        value.val = { a: 1 };
        $assertThrows(deserialize);

        // array
        value.val = [1, 2];
        $assertThrows(deserialize);

        // integer
        value.val = 5;
        $assertThrows(deserialize);

        // float
        value.val = -5.5;
        $assertThrows(deserialize);

        // string
        value.val = 'somestring';
        $assertThrows(deserialize);

        // bool
        value.val = true;
        $assertThrows(deserialize);
    }),


    $test('roundtripping: all types')
    .check(function () {
        var value = {
            object: { a: 1, b: 'str', c: [1, 2] },
            array: [1, 2, { a: 1 }],
            string: 'somestring',
            text: 'sometext',
            integer: 5,
            int: 6,
            bool: true,
            boolean: false,
            real: 1.5,
            float: 2.2,
            date: new Date(2001, 11, 12, 13, 14, 59)
        };
        var columnDefinitions = {
            object: ColumnType.Object,
            array: ColumnType.Array,
            string: ColumnType.String,
            text: ColumnType.Text,
            integer: ColumnType.Integer,
            int: ColumnType.Int,
            boolean: ColumnType.Boolean,
            bool: ColumnType.Bool,
            real: ColumnType.Real,
            float: ColumnType.Float,
            date: ColumnType.Date
        };
        var serializedValue = SQLiteSerializer.serialize(value, columnDefinitions);
        $assert.areEqual(serializedValue, {
            "object": "{\"a\":1,\"b\":\"str\",\"c\":[1,2]}",
            "array": "[1,2,{\"a\":1}]",
            "string": value.string,
            "text": value.text,
            "integer": value.integer,
            "int": value.int,
            "boolean": 0,
            "bool": 1,
            "real": value.real,
            "float": value.float,
            "date": 1008191699000
        });
        $assert.areEqual(SQLiteSerializer.deserialize(serializedValue, columnDefinitions), value);
    })
);