// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

/**
 * @file MobileServiceSqliteStore.executeBatch(..) unit tests
 */

var Platform = require('Platforms/Platform'),
    Query = require('query.js').Query,
    MobileServiceSqliteStore = require('Platforms/MobileServiceSqliteStore'),
    testTableName = 'sometable';
    testDbFile = 'somedbfile.db';

$testGroup('SQLiteStore - executeBatch tests')

    // Clear the test table before running each test.
    .beforeEachAsync(Platform.async( function(callback) {
        var db = window.sqlitePlugin.openDatabase({ name: testDbFile, location: 'default' });

        // Delete table created by the unit tests
        db.executeSql('DROP TABLE IF EXISTS ' + testTableName, null, function() {
            callback();
        }, function(err) {
            callback(err);
        });
    })).tests(

    $test('basic executeBatch scenario - batch of UPSERTs and DELETEs')
    .checkAsync(function () {
        var store = createStore(),
            row1 = { id: 101, description: 'original' },
            row2 = { id: 102, description: 'original' },
            row3 = { id: 103, description: 'original' },
            row4 = { id: 201, description: 'new' };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                description: MobileServiceSqliteStore.ColumnType.String
            }
        }).then(function () {
            return store.upsert(testTableName, [row1, row2, row3]);
        }).then(function () {
            row1.description = 'new';
            return store.executeBatch([
                {
                    action: 'upsert',
                    tableName: testTableName,
                    data: row1
                },
                {
                    action: 'delete',
                    tableName: testTableName,
                    id: row3.id
                },
                {
                    action: 'upsert',
                    tableName: testTableName,
                    data: row4
                },
            ]);
        }).then(function (result) {
            return store.read(new Query(testTableName).orderBy('id'));
        }).then(function (result) {
            $assert.areEqual(result, [
                row1,
                row2,
                row4
            ]);
        }, function (error) {
            $assert.fail(error);
        });
    }),
    
    $test('An invalid operation.action should rollback the transaction')
    .checkAsync(function () {
        var store = createStore(),
            row1 = { id: 101, description: 'original' },
            row2 = { id: 102, description: 'original' },
            row3 = { id: 103, description: 'original' };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                description: MobileServiceSqliteStore.ColumnType.String
            }
        }).then(function () {
            return store.upsert(testTableName, [row1, row2, row3]);
        }).then(function () {
            
            return store.executeBatch([
                {
                    action: 'upsert',
                    tableName: testTableName,
                    data: {id: row1.id, description: 'new'}
                },
                {
                    action: '__invalid__action__',
                    tableName: testTableName,
                    data: {id: row2.id, description: 'new'}
                },
                {
                    action: 'upsert',
                    tableName: testTableName,
                    data: {id: row3.id, description: 'new'}
                },
            ]);
        }).then(function (result) {
            $assert.fail('executeBatch should have failed');
        }, function (error) {
            store._editStatement = undefined;
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row1, row2, row3]);
        }, function (error) {
            $assert.fail('Something is wrong with the test code. Should never reach here');
        });
    }),

    $test('SQLite error while executing a SQL statement should rollback the transaction')
    .checkAsync(function () {
        var store = createStore(),
            row1 = { id: 101, description: 'original' },
            row2 = { id: 102, description: 'original' },
            row3 = { id: 103, description: 'original' },
            statementCount = 0;

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                description: MobileServiceSqliteStore.ColumnType.String
            }
        }).then(function () {
            return store.upsert(testTableName, [row1, row2, row3]);
        }).then(function () {
            store._editStatement = function (statement) {
                ++statementCount;
                if (statementCount == 3) { // Each upsert will generate 2 SQL statements. Fail the 2nd upsert.
                    statement = 'invalid sql statement'; // inject an invalid SQL statement
                }
                return statement;
            };
            
            return store.executeBatch([
                {
                    action: 'upsert',
                    tableName: testTableName,
                    data: {id: row1.id, description: 'new'}
                },
                {
                    action: 'upsert',
                    tableName: testTableName,
                    data: {id: row2.id, description: 'new'}
                },
                {
                    action: 'upsert',
                    tableName: testTableName,
                    data: {id: row3.id, description: 'new'}
                },
            ]);
        }).then(function (result) {
            $assert.fail('executeBatch should have failed');
        }, function (error) {
            $assert.areEqual(statementCount, 6); // Each of the 3 UPSERTs will generate 2 SQL statements.
            store._editStatement = undefined;
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row1, row2, row3]);
        }, function (error) {
            $assert.fail('Something is wrong with the test code. Should never reach here');
        });
    }),
    
    $test('operations parameter containing null operation')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 101, description: 'original' };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                description: MobileServiceSqliteStore.ColumnType.String
            }
        }).then(function () {
            return store.executeBatch([
                null,
                {
                    action: 'upsert',
                    tableName: testTableName,
                    data: row
                }]);
        }).then(function (result) {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row]);
        }, function (error) {
            $assert.fail(error);
        });
    }),
    
    $test('operations parameter containing undefined operation')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 101, description: 'original' };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                description: MobileServiceSqliteStore.ColumnType.String
            }
        }).then(function () {
            return store.executeBatch([
                undefined,
                {
                    action: 'upsert',
                    tableName: testTableName,
                    data: row
                }]);
        }).then(function (result) {
            return store.read(new Query(testTableName));
        }).then(function (result) {
            $assert.areEqual(result, [row]);
        }, function (error) {
            $assert.fail(error);
        });
    }),
    
    $test('Missing operation.action')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 101, description: 'original' };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                description: MobileServiceSqliteStore.ColumnType.String
            }
        }).then(function () {
            return store.executeBatch([
                {
                    // action is missing
                    tableName: testTableName,
                    data: row
                }
            ]);
        }).then(function (result) {
            $assert.fail('executeBatch should have failed');
        }, function (error) {
            // Failure. As expected.
        });
    }),
    
    $test('UPSERT: null data')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                description: MobileServiceSqliteStore.ColumnType.String
            }
        }).then(function () {
            return store.executeBatch([
                {
                    action: 'upsert',
                    tableName: testTableName,
                    data: null
                }
            ]);
        }).then(function (result) {
            // Succeeded. As expected.
        }, function (error) {
            $assert.fail('executeBatch should have succeeded');
        });
    }),
    
    $test('UPSERT: undefined data')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                description: MobileServiceSqliteStore.ColumnType.String
            }
        }).then(function () {
            return store.executeBatch([
                {
                    action: 'upsert',
                    tableName: testTableName,
                    data: undefined
                }
            ]);
        }).then(function (result) {
            // Succeeded. As expected.
        }, function (error) {
            $assert.fail('executeBatch should have succeeded');
        });
    }),
    
    $test('UPSERT error handling - missing tableName')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 101, description: 'original' };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                description: MobileServiceSqliteStore.ColumnType.String
            }
        }).then(function () {
            return store.executeBatch([
                {
                    action: 'upsert',
                    tableName: testTableName,
                    data: {id: row1.id, description: 'new'}
                }
            ]);
        }).then(function (result) {
            $assert.fail('executeBatch should have failed');
        }, function (error) {
            // Failure. As expected.
        });
    }),
    
    $test('UPSERT error handling - null tableName')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 101, description: 'original' };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                description: MobileServiceSqliteStore.ColumnType.String
            }
        }).then(function () {
            return store.executeBatch([
                {
                    action: 'upsert',
                    tableName: null,
                    data: {id: row1.id, description: 'new'}
                }
            ]);
        }).then(function (result) {
            $assert.fail('executeBatch should have failed');
        }, function (error) {
            // Failure. As expected.
        });
    }),
    
    $test('UPSERT error handling - invalid tableName')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 101, description: 'original' };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                description: MobileServiceSqliteStore.ColumnType.String
            }
        }).then(function () {
            return store.executeBatch([
                {
                    action: 'upsert',
                    tableName: {},
                    data: {id: row1.id, description: 'new'}
                }
            ]);
        }).then(function (result) {
            $assert.fail('executeBatch should have failed');
        }, function (error) {
            // Failure. As expected.
        });
    }),
    
    $test('UPSERT error handling - empty tableName string')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 101, description: 'original' };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                description: MobileServiceSqliteStore.ColumnType.String
            }
        }).then(function () {
            return store.executeBatch([
                {
                    action: 'upsert',
                    tableName: '',
                    data: {id: row1.id, description: 'new'}
                }
            ]);
        }).then(function (result) {
            $assert.fail('executeBatch should have failed');
        }, function (error) {
            // Failure. As expected.
        });
    }),
    
    $test('UPSERT error handling - data is not an object')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 101, description: 'original' };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                description: MobileServiceSqliteStore.ColumnType.String
            }
        }).then(function () {
            return store.executeBatch([
                {
                    action: 'upsert',
                    tableName: testTableName,
                    data: 'invalid data'
                }
            ]);
        }).then(function (result) {
            $assert.fail('executeBatch should have failed');
        }, function (error) {
            // Failure. As expected.
        });
    }),
    
    $test('UPSERT error handling - data is an array')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 101, description: 'original' };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                description: MobileServiceSqliteStore.ColumnType.String
            }
        }).then(function () {
            return store.executeBatch([
                {
                    action: 'upsert',
                    tableName: [],
                    data: null
                }
            ]);
        }).then(function (result) {
            $assert.fail('executeBatch should have failed');
        }, function (error) {
            // Failure. As expected.
        });
    }),
    
    $test('UPSERT error handling - data does not have ID')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 101, description: 'original' };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                description: MobileServiceSqliteStore.ColumnType.String
            }
        }).then(function () {
            return store.executeBatch([
                {
                    action: 'upsert',
                    tableName: {description: 'new'},
                    data: null
                }
            ]);
        }).then(function (result) {
            $assert.fail('executeBatch should have failed');
        }, function (error) {
            // Failure. As expected.
        });
    }),
    
    $test('UPSERT error handling - data has invalid ID')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 101, description: 'original' };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                description: MobileServiceSqliteStore.ColumnType.String
            }
        }).then(function () {
            return store.executeBatch([
                {
                    action: 'upsert',
                    tableName: testTableName,
                    data: {id: {}, description: 'new'}
                }
            ]);
        }).then(function (result) {
            $assert.fail('executeBatch should have failed');
        }, function (error) {
            // Failure. As expected.
        });
    }),
    
    $test('DELETE: null ID')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                description: MobileServiceSqliteStore.ColumnType.String
            }
        }).then(function () {
            return store.executeBatch([
                {
                    action: 'delete',
                    tableName: testTableName,
                    id: null
                }
            ]);
        }).then(function (result) {
            // Succeeded. As expected.
        }, function (error) {
            $assert.fail('executeBatch should have succeeded');
        });
    }),
    
    $test('DELETE: undefined ID')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                description: MobileServiceSqliteStore.ColumnType.String
            }
        }).then(function () {
            return store.executeBatch([
                {
                    action: 'delete',
                    tableName: testTableName,
                    id: undefined
                }
            ]);
        }).then(function (result) {
            // Succeeded. As expected.
        }, function (error) {
            $assert.fail('executeBatch should have succeeded');
        });
    }),
    
    $test('DELETE error handling - missing tableName')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                description: MobileServiceSqliteStore.ColumnType.String
            }
        }).then(function () {
            return store.executeBatch([
                {
                    action: 'delete',
                    // tableName missing
                    id: 101
                }
            ]);
        }).then(function (result) {
            $assert.fail('executeBatch should have failed');
        }, function (error) {
            // Failure. As expected.
        });
    }),
    
    $test('DELETE error handling - null tableName')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                description: MobileServiceSqliteStore.ColumnType.String
            }
        }).then(function () {
            return store.executeBatch([
                {
                    action: 'delete',
                    // tableName missing
                    id: 101
                }
            ]);
        }).then(function (result) {
            $assert.fail('executeBatch should have failed');
        }, function (error) {
            // Failure. As expected.
        });
    }),
    
    $test('DELETE error handling - invalid tableName')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                description: MobileServiceSqliteStore.ColumnType.String
            }
        }).then(function () {
            return store.executeBatch([
                {
                    action: 'delete',
                    tableName: {},
                    id: 101
                }
            ]);
        }).then(function (result) {
            $assert.fail('executeBatch should have failed');
        }, function (error) {
            // Failure. As expected.
        });
    }),
    
    $test('DELETE error handling - empty tableName string')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                description: MobileServiceSqliteStore.ColumnType.String
            }
        }).then(function () {
            return store.executeBatch([
                {
                    action: 'delete',
                    tableName: '',
                    id: 101
                }
            ]);
        }).then(function (result) {
            $assert.fail('executeBatch should have failed');
        }, function (error) {
            // Failure. As expected.
        });
    }),
    
    $test('DELETE error handling - invalid ID')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                description: MobileServiceSqliteStore.ColumnType.String
            }
        }).then(function () {
            return store.executeBatch([
                {
                    action: 'delete',
                    tableName: testTableName,
                    id: {}
                }
            ]);
        }).then(function (result) {
            $assert.fail('executeBatch should have failed');
        }, function (error) {
            // Failure. As expected.
        });
    }),
    
    $test('DELETE error handling - ID is an array')
    .checkAsync(function () {
        var store = createStore();

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                description: MobileServiceSqliteStore.ColumnType.String
            }
        }).then(function () {
            return store.executeBatch([
                {
                    action: 'delete',
                    tableName: testTableName,
                    id: [101]
                }
            ]);
        }).then(function (result) {
            $assert.fail('executeBatch should have failed');
        }, function (error) {
            // Failure. As expected.
        });
    }),
    
    $test('UPSERT error handling - data has null ID')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 101, description: 'original' };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                description: MobileServiceSqliteStore.ColumnType.String
            }
        }).then(function () {
            return store.executeBatch([
                {
                    action: 'upsert',
                    tableName: testTableName,
                    data: {id: null, description: 'new'}
                }
            ]);
        }).then(function (result) {
            $assert.fail('executeBatch should have failed');
        }, function (error) {
            // Failure. As expected.
        });
    }),
    
    $test('UPSERT error handling - data has undefined ID')
    .checkAsync(function () {
        var store = createStore(),
            row = { id: 101, description: 'original' };

        return store.defineTable({
            name: testTableName,
            columnDefinitions: {
                id: MobileServiceSqliteStore.ColumnType.Integer,
                description: MobileServiceSqliteStore.ColumnType.String
            }
        }).then(function () {
            return store.executeBatch([
                {
                    action: 'upsert',
                    tableName: testTableName,
                    data: {id: undefined, description: 'new'}
                }
            ]);
        }).then(function (result) {
            $assert.fail('executeBatch should have failed');
        }, function (error) {
            // Failure. As expected.
        });
    })
);

function createStore() {
    return new MobileServiceSqliteStore(testDbFile);
}
