// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

var Validate = require('./Utilities/Validate'),
    Platform = require('Platforms/Platform'),
    _ = require('./Utilities/Extensions');

/**
 * Creates an instance of MobileServiceSyncContext
 * @param client The MobileServiceClient to be used to make requests to the backend.
 */
function MobileServiceSyncContext(client) {

    Validate.notNull(client, 'client');

    var _store;

    /**
     * Initializes the sync context with an instance of the store to be used
     */
    this.initialize = function (store) {
        Validate.notNull(store);
        _store = store;
    };

    // TODO(shrirs): Add tracking operations to the operations table for insert/update/delete
    /**
     * Insert a new object into the specified local table.
     * 
     * @param tableName Name of the local table in which the object is to be inserted
     * @param instance The object to be inserted into the table
     * 
     * @returns A promise that is resolved with the inserted object when the operation is completed successfully.
     * If the operation fails, the promise is rejected
     */
    this.insert = function (tableName, instance) {

        Validate.isString(tableName, 'tableName');
        Validate.notNullOrEmpty(tableName, 'tableName');

        Validate.notNull(instance, 'instance');
        Validate.notNull(instance.id, 'instance.id'); //TODO(shrirs): instance.id is a valid scenario, handle it

        Validate.notNull(_store, '_store');

        return _store.lookup(tableName, instance.id).then(function(result) {
            if (result !== null) {
                throw "An object with the same ID already exists in the table";
            }

            _store.upsert(tableName, instance);
        }).then(function() {
            return instance;
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
    this.update = function (tableName, instance) {

        Validate.isString(tableName, 'tableName');
        Validate.notNullOrEmpty(tableName, 'tableName');

        Validate.notNull(instance, 'instance');
        Validate.notNull(instance.id, 'instance.id');

        Validate.notNull(_store, '_store');

        return _store.upsert(tableName, instance);
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

        Validate.isString(tableName, 'tableName');
        Validate.notNullOrEmpty(tableName, 'tableName');

        Validate.notNull(id, 'id');

        Validate.notNull(_store, '_store');

        return _store.lookup(tableName, id);
    };

    /**
     * Delete an object from the specified local table
     * 
     * @param tableName Name of the local table to delete the object from
     * @param The object to delete from the local table.
     */
    this.del = function (tableName, instance) {

        Validate.isString(tableName, 'tableName');
        Validate.notNullOrEmpty(tableName, 'tableName');

        Validate.notNull(instance);
        Validate.notNull(instance.id);

        return _store.del(tableName, instance);
    };
}

exports.MobileServiceSyncContext = MobileServiceSyncContext;
