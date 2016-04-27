// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/**
 * @file MobileServiceSQLiteStore.del(..) unit tests
 */

var Platform = require('Platforms/Platform'),
    Query = require('query.js').Query,
    MobileServiceSQLiteStore = require('Platforms/MobileServiceSQLiteStore');
    testTableName = 'sometable';
    testDbFile = 'somedbfile.db';

$testGroup('SQLiteStore - delete tests')

    // Clear the test table before running each test.
    .beforeEachAsync(Platform.async( function(callback) {
        var db = window.sqlitePlugin.openDatabase({ name: testDbFile });

        // Delete table created by the unit tests
        db.executeSql('DROP TABLE IF EXISTS ' + testTableName, null, function() {
            callback();
        }, function(err) {
            callback(err);
        });
    })).tests(
    
    $test('table is not defined')
    .checkAsync(function () {
        return createStore().del(testTableName, 'one').then(function (result) {
            $assert.fail('failure expected');
        }, function (err) {
        });
    }),

    $test('id of type string')
    .checkAsync(function () {
        var store = createStore(),
            row1 = { id: 'id1', prop1: 100, prop2: 200 },
            row2 = { id: 'id2', prop1: 100, prop2: 200 },
            row3 = { id: 'id3', prop1: 100, prop2: 200 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.String,
                prop1: MobileServiceSQLiteStore.ColumnType.Real,
                prop2: MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, [row1, row2, row3]);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row1, row2, row3]);
        }).then(function () {
            // Specify a single id to delete
            return store.del(testTableName, row1.id);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row2, row3]);
            // Specify an array of ids to delete
            return store.del(testTableName, [row2.id, row3.id]);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, []);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('id of type int')
    .checkAsync(function () {
        var store = createStore(),
            row1 = { id: 101, prop1: 100, prop2: 200 },
            row2 = { id: 102, prop1: 100, prop2: 200 },
            row3 = { id: 103, prop1: 100, prop2: 200 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.Integer,
                prop1: MobileServiceSQLiteStore.ColumnType.Real,
                prop2: MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, [row1, row2, row3]);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row1, row2, row3]);
        }).then(function () {
            // Specify a single id to delete
            return store.del(testTableName, row1.id);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row2, row3]);
            // Specify an array of ids to delete
            return store.del(testTableName, [row2.id, row3.id]);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, []);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('id of type real')
    .checkAsync(function () {
        var store = createStore(),
            row1 = { id: 1.5, prop1: 100, prop2: 200 },
            row2 = { id: 2.5, prop1: 100, prop2: 200 },
            row3 = { id: 3.5, prop1: 100, prop2: 200 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.Real,
                prop1: MobileServiceSQLiteStore.ColumnType.Real,
                prop2: MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, [row1, row2, row3]);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row1, row2, row3]);
        }).then(function () {
            // Specify a single id to delete
            return store.del(testTableName, row1.id);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row2, row3]);
            // Specify an array of ids to delete
            return store.del(testTableName, [row2.id, row3.id]);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, []);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('verify id case sensitivity')
    .checkAsync(function () {
        var store = createStore(),
            row1 = { id: 'abc', description: 'something' },
            row2 = { id: 'DEF', description: 'something' };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.Text,
                description: MobileServiceSQLiteStore.ColumnType.String
            }
        }).then(function () {
            return store.upsert(testTableName, [row1, row2]);
        }).then(function () {
            // Specify a single id to delete
            return store.del(testTableName, 'ABC');
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row1, row2]);
            // Specify an array of ids to delete
            return store.del(testTableName, ['ABC', 'def']);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row1, row2]);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('record not found')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 'id1', description: 'something' };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.Text,
                description: MobileServiceSQLiteStore.ColumnType.String
            }
        }).then(function () {
            return store.upsert(testTableName, [row]);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row]);
            // Specify a single id to delete
            return store.del(testTableName, 'notfound1');
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row]);
            // Specify an array of ids to delete
            return store.del(testTableName, ['notfound2', 'notfound3']);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row]);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('list of records - few exist, few do not')
    .checkAsync(function () {
        var store = createStore(),
            row1 = { id: 'abc', description: 'something' },
            row2 = { id: 'def', description: 'something' };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.Text,
                description: MobileServiceSQLiteStore.ColumnType.String
            }
        }).then(function () {
            return store.upsert(testTableName, [row1, row2]);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row1, row2]);
            // Specify a list of IDs to delete
            return store.del(testTableName, ['notfound1', 'abc', 'notfound2', 'def']);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, []);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('empty array')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.Text,
                description: MobileServiceSQLiteStore.ColumnType.String
            }
        }).then(function () {
            return store.del(testTableName, []);
        }).then(function () {
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('null id')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 'id1', description: 'something' };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.Text,
                description: MobileServiceSQLiteStore.ColumnType.String
            }
        }).then(function () {
            return store.upsert(testTableName, [row]);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row]);
            // Specify a single id to delete
            return store.del(testTableName, null);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row]);
            // Specify an array of ids to delete
            return store.del(testTableName, [null, row.id]);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, []);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('id specified as undefined')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 'id1', description: 'something' };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.Text,
                description: MobileServiceSQLiteStore.ColumnType.String
            }
        }).then(function () {
            return store.upsert(testTableName, [row]);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row]);
            // Specify a single id to delete
            return store.del(testTableName, undefined);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row]);
            // Specify an array of ids to delete
            return store.del(testTableName, [undefined, row.id]);
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, []);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('id not specified')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.String,
                prop1: MobileServiceSQLiteStore.ColumnType.Real,
                prop2: MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, { id: 'someid', prop1: 100, prop2: 200 });
        }).then(function () {
            return store.del(testTableName);
        }).then(function () {
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('a single invalid id')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 'someid', prop1: 100, prop2: 200 },
            testError;

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.String,
                prop1: MobileServiceSQLiteStore.ColumnType.Real,
                prop2: MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, row);
        }).then(function (result) {
            // Specify a single id to delete
            return store.del(testTableName, { id: 'this object is an invalid id' });
        }).then(function () {
            testError = 'delete should have failed';
        }, function (error) {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.isNull(testError);
            $assert.areEqual(result, [row]);
        }, function (error) {
            $assert.isNull(testError);
            $assert.fail(error);
        });
    }),

    $test('array of ids containing an invalid id')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 'validid', prop1: 100, prop2: 200 },
            testError;

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.String,
                prop1: MobileServiceSQLiteStore.ColumnType.Real,
                prop2: MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, row);
        }).then(function (result) {
            // Specify an array of ids to delete
            return store.del(testTableName, [{ id: 'this object is an invalid id' }, 'validid']);
        }).then(function () {
            testError = 'delete should have failed';
        }, function (error) {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.isNull(testError);
            $assert.areEqual(result, [row]);
        }, function (error) {
            $assert.isNull(testError);
            $assert.fail(error);
        });
    }),

    $test('null table name')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 'validid', prop1: 100, prop2: 200 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.String,
                prop1: MobileServiceSQLiteStore.ColumnType.Real,
                prop2: MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, row);
        }).then(function () {
            return store.del(null, 'validid');
        }).then(function () {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('undefined table name')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 'validid', prop1: 100, prop2: 200 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.String,
                prop1: MobileServiceSQLiteStore.ColumnType.Real,
                prop2: MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, row);
        }).then(function () {
            return store.del(undefined, 'validid');
        }).then(function () {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('empty table name')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 'validid', prop1: 100, prop2: 200 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.String,
                prop1: MobileServiceSQLiteStore.ColumnType.Real,
                prop2: MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, row);
        }).then(function () {
            return store.del('', 'validid');
        }).then(function () {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('invalid table name')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 'validid', prop1: 100, prop2: 200 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.String,
                prop1: MobileServiceSQLiteStore.ColumnType.Real,
                prop2: MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert('*', row);
        }).then(function () {
            return store.del(undefined, 'validid');
        }).then(function () {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('invoked without any argument')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.Text,
                description: MobileServiceSQLiteStore.ColumnType.String
            }
        }).then(function () {
            return store.del();
        }).then(function () {
            $assert.fail('failure expected');
        }, function (error) {
        });
    }),

    $test('invoked with extra arguments')
    .description('Check that promise returned by upsert is either resolved or rejected even when invoked with extra parameters')
    .checkAsync(function () {
        var store = createStore(),
            row1 = { id: 'someid1', prop1: 100, prop2: 200 },
            row2 = { id: 'someid2', prop1: 100, prop2: 200 },
            row3 = { id: 'someid3', prop1: 100, prop2: 200 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.String,
                prop1: MobileServiceSQLiteStore.ColumnType.Real,
                prop2: MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, [row1, row2, row3]);
        }).then(function () {
            // Specify a single id to delete
            return store.del(testTableName, row1.id, 'extra param');
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row2, row3]);
        }).then(function () {
            // Specify an array of ids to delete
            return store.del(testTableName, [row2.id, row3.id], 'extra param');
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, []);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('argument is a basic query')
    .checkAsync(function () {
        var store = createStore(),
            row1 = { id: 'someid1', prop1: 'abc', prop2: 200 },
            row2 = { id: 'someid2', prop1: 'abc', prop2: 100 },
            row3 = { id: 'someid3', prop1: 'def', prop2: 200 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.String,
                prop1: MobileServiceSQLiteStore.ColumnType.String,
                prop2: MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, [row1, row2, row3]);
        }).then(function () {
            return store.del(new Query(testTableName));
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, []);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('argument is a query whose result contains id column')
    .checkAsync(function () {
        var store = createStore(),
            row1 = { id: 'someid1', prop1: 'abc', prop2: 200 },
            row2 = { id: 'someid2', prop1: 'abc', prop2: 100 },
            row3 = { id: 'someid3', prop1: 'def', prop2: 200 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.String,
                prop1: MobileServiceSQLiteStore.ColumnType.String,
                prop2: MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, [row1, row2, row3]);
        }).then(function () {
            var query = new Query(testTableName);
            return store.del(query.where(function () {
                return this.prop1 === 'abc';
            }));
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row3]);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('argument is a query whose result does not contain id column')
    .checkAsync(function () {
        var store = createStore(),
            row1 = { id: 'someid1', prop1: 'abc', prop2: 200 },
            row2 = { id: 'someid2', prop1: 'ghi', prop2: 100 },
            row3 = { id: 'someid3', prop1: 'ghi', prop2: 200 },
            row4 = { id: 'someid4', prop1: 'ghi', prop2: 100 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.String,
                prop1: MobileServiceSQLiteStore.ColumnType.String,
                prop2: MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, [row1, row2, row3, row4]);
        }).then(function () {
            var query = new Query(testTableName);
            return store.del(query.where(function () {
                return this.id === 'someid4';
            }).select('prop1'));
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row1, row2, row3]);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('argument is a complex MobileServiceQuery')
    .checkAsync(function () {
        var store = createStore(),
            row1 = { id: 'someid1', prop1: 'a', prop2: 100 },
            row2 = { id: 'someid2', prop1: 'b', prop2: 100 },
            row3 = { id: 'someid3', prop1: 'c', prop2: 100 },
            row4 = { id: 'someid4', prop1: 'd', prop2: 100 },
            row5 = { id: 'someid5', prop1: 'e', prop2: 200 },
            row6 = { id: 'someid6', prop1: 'str', prop2: 100 },
            row7 = { id: 'someid7', prop1: 'str', prop2: 100 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.String,
                prop1: MobileServiceSQLiteStore.ColumnType.String,
                prop2: MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, [row1, row2, row3, row4, row5, row6, row7]);
        }).then(function () {
            var query = new Query(testTableName);
            return store.del(query.where(function (limit) {
                return this.prop1 !== 'str' && this.prop2 < limit;
            }, 150).select('id', 'prop1').skip(2).take(1).orderByDescending('prop1').includeTotalCount());
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row1, row3, row4, row5, row6, row7]);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('argument is a query matching no records')
    .checkAsync(function () {
        var store = createStore(),
            row1 = { id: 'someid1', prop1: 'a', prop2: 100 },
            row2 = { id: 'someid2', prop1: 'b', prop2: 100 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.String,
                prop1: MobileServiceSQLiteStore.ColumnType.String,
                prop2: MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, [row1, row2]);
        }).then(function () {
            var query = new Query(testTableName);
            return store.del(query.where(function () {
                return false;
            }));
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row1, row2]);
        }, function (error) {
            $assert.fail(error);
        });
    }),

    $test('invoked with query and extra parameters')
    .description('Check that promise returned by upsert is either resolved or rejected even when invoked with extra parameters')
    .checkAsync(function () {
        var store = createStore(),
            row1 = { id: 'someid1', prop1: 100, prop2: 200 },
            row2 = { id: 'someid2', prop1: 100, prop2: 200 },
            row3 = { id: 'someid3', prop1: 100, prop2: 200 };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSQLiteStore.ColumnType.String,
                prop1: MobileServiceSQLiteStore.ColumnType.Real,
                prop2: MobileServiceSQLiteStore.ColumnType.Real
            }
        }).then(function () {
            return store.upsert(testTableName, [row1, row2, row3]);
        }).then(function () {
            return store.del(new Query(testTableName), 'extra param');
        }).then(function () {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, []);
        }, function (error) {
            $assert.fail(error);
        });
    })
);

function createStore() {
    return new MobileServiceSQLiteStore(testDbFile);
}

