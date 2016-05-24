﻿// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

var Validate = require('../Utilities/Validate'),
    Platform = require('Platforms/Platform'),
    createOperationTableManager = require('./operations').createOperationTableManager,
    taskRunner = require('../Utilities/taskRunner'),
    uuid = require('node-uuid'),
    _ = require('../Utilities/Extensions');

// NOTE: The store can be a custom store provided by the user code.
// So we do parameter validation ourselves without delegating it to the
// store, even where it is possible.  

/**
 * Creates an instance of MobileServiceSyncContext
 * @param client The MobileServiceClient to be used to make requests to the backend.
 */
function MobileServiceSyncContext(client) {

    Validate.notNull(client, 'client');

    var store,
        operationTableManager,
        storeTaskRunner = taskRunner(); // Used to run insert / update / delete tasks on the store

    /**
     * Initializes MobileServiceSyncContext
     * @param localStore The store to associate MobileServiceSyncContext with
     * @returns A promise that is resolved when the operation is completed successfully.
     *          If the operation fails, the promise is rejected
     */
    this.initialize = function (localStore) {
        
        return Platform.async(function(callback) {
            Validate.isObject(localStore);
            Validate.notNull(localStore);
            
            callback(null, createOperationTableManager(localStore));
        })().then(function(opManager) {
            operationTableManager = opManager;
            return operationTableManager.initialize(localStore);
        }).then(function() {
            store = localStore; // Assigning to store after all initialization steps are complete
        });
        
    };

    /**
     * Insert a new object into the specified local table.
     * 
     * @param tableName Name of the local table in which the object is to be inserted
     * @param instance The object to be inserted into the table
     * 
     * @returns A promise that is resolved with the inserted object when the operation is completed successfully.
     * If the operation fails, the promise is rejected
     */
    this.insert = function (tableName, instance) { //TODO: add an insert method to the store
        return storeTaskRunner.run(function() {
            // Generate an ID if it is not set already 
            if (_.isNull(instance.id)) {
                instance.id = uuid.v4();
            }

            // Delegate parameter validation to upsert
            return upsert(tableName, instance, 'insert', function(existingRecord) { // precondition validator
                if (!_.isNull(existingRecord)) {
                    throw new Error('Cannot perform insert as a record with ID ' + existingRecord.id + ' already exists in the table ' + tableName);
                }
            });
        });
    };

    /**
     * Update an object in the specified local table.
     * 
     * @param tableName Name of the local table in which the object is to be updated
     * @param instance The object to be updated
     * 
     * @returns A promise that is resolved when the operation is completed successfully. 
     * If the operation fails, the promise is rejected.
     */
    this.update = function (tableName, instance) { //TODO: add an update method to the store
        return storeTaskRunner.run(function() {
            // Delegate parameter validation to upsert
            return upsert(tableName, instance, 'update', function(existingRecord) { // precondition validator
                if (_.isNull(existingRecord)) {
                    throw new Error('Cannot update record with ID ' + existingRecord.id + ' as it does not exist the table ' + tableName);
                }
            });
        });
    };

    /**
     * Gets an object from the specified local table.
     * 
     * @param tableName Name of the local table to be used for performing the object lookup
     * @param id ID of the object to get from the table.
     * 
     * @returns A promise that is resolved with the looked up object when the operation is completed successfully.
     * If the operation fails, the promise is rejected.
     */
    this.lookup = function (tableName, id) {
        
        return Platform.async(function() {
            Validate.isString(tableName, 'tableName');
            Validate.notNullOrEmpty(tableName, 'tableName');

            Validate.isValidId(id, 'id');

            if (!store) {
                throw new Error('MobileServiceSyncContext not initialized');
            }
        })().then(function() {
            return store.lookup(tableName, id);
        });
    };

    /**
     * Delete an object from the specified local table
     * 
     * @param tableName Name of the local table to delete the object from
     * @param The object to delete from the local table.
     */
    this.del = function (tableName, instance) {
        
        return storeTaskRunner.run(function() {
            Validate.isString(tableName, 'tableName');
            Validate.notNullOrEmpty(tableName, 'tableName');

            Validate.notNull(instance);
            Validate.isValidId(instance.id);

            if (!store) {
                throw new Error('MobileServiceSyncContext not initialized');
            }

            return operationTableManager.getLoggingOperation(tableName, 'delete', instance.id).then(function(loggingOperation) {
                return store.executeBatch([
                    {
                        action: 'delete',
                        tableName: tableName,
                        id: instance.id
                    },
                    loggingOperation
                ]);
            });
        });
    };
    
    // Unit test purposes only
    this._getOperationTableManager = function () {
        return operationTableManager;
    };
    
    // Validates parameters. Callers can skip validation
    function upsert(tableName, instance, action, preconditionValidator) {
        Validate.isString(tableName, 'tableName');
        Validate.notNullOrEmpty(tableName, 'tableName');

        Validate.notNull(instance, 'instance');
        Validate.isValidId(instance.id, 'instance.id');
        
        if (!store) {
            throw new Error('MobileServiceSyncContext not initialized');
        }
        
        return store.lookup(tableName, instance.id).then(function(existingRecord) {
            return preconditionValidator(existingRecord);
        }).then(function() {
            return operationTableManager.getLoggingOperation(tableName, action, instance.id);
        }).then(function(loggingOperation) {
            return store.executeBatch([
                {
                    action: 'upsert',
                    tableName: tableName,
                    data: instance
                },
                loggingOperation
            ]);
        }).then(function() {
            return instance;
        });
    }
}

module.exports = MobileServiceSyncContext;