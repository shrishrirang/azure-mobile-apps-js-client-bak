# Microsoft Azure Mobile Apps: Javascript Client SDK

With Microsoft Azure Mobile Apps you can add a scalable backend to your connected client applications in minutes. To learn more, visit our [Developer Center](http://azure.microsoft.com/en-us/develop/mobile).

## Getting Started

If you are new to Azure Mobile Apps, you can get started by following the [Mobile Apps documentation](https://azure.microsoft.com/en-us/documentation/learning-paths/appservice-mobileapps/)

The JavaScript SDK makes it easy to use Microsoft Azure Mobile Apps. To connect to an Azure App Service from a Cordova application, refer [How to Use Apache Cordova Client Library for Azure Mobile Apps](https://azure.microsoft.com/en-us/documentation/articles/app-service-mobile-cordova-how-to-use-client-library/)

The SDK can be used from a web app that runs in a browser or from a Cordova app. The SDK code in this repository is packed into a standalone bundle and is available as a Cordova plugin at https://github.com/Azure/azure-mobile-apps-cordova-client. Refer https://github.com/Azure/azure-mobile-apps-cordova-client for more details about how to use the Cordova plugin.

### Usage

Run the following command to get the Javascript client for Azure Mobile Apps:

    npm install azure-mobile-apps-client
    
The SDK files are present in the package's _/dist_ directory.

### Offline data sync

Offline data sync is a feature of Azure Mobile Apps that makes it easy for developers to create apps that are functional without a network connection. Offline data sync is now available in the Cordova SDK.

https://azure.microsoft.com/en-us/documentation/articles/app-service-mobile-offline-data-sync/ explains the basic concepts of offline data sync. The following sections explain how to perform various operations involved in offline data sync.

#### Initializing the store

You can create a store in the following manner:
```
var client = new WindowsAzure.MobileServiceClient('https://mobile-apps-url');
var store = new WindowsAzure.MobileServiceSqliteStore('store.db');
```

Next step is defining the tables in the store that will be participating in offline data sync. This can be performed using the `defineTable` method:
```
store.defineTable({
    name: 'todoitem',
    columnDefinitions: {
        id: 'string',
        text: 'string',
        deleted: 'boolean',
        complete: 'boolean'
    }
});
```
The `defineTable` method returns a promise that is fulfilled when the table creation is complete. If a table with the same name already exists, `defineTable` will only add columns that are missing, existing columns (type and the data in them) will not be affected.

The `columnDefinitions` property specifies the types of columns. Valid column types are `object`, `array`, `date`, `integer` or `int`, `float` or `real`, `string` or `text`, `boolean` or `bool`. Some of these types like `integer` or `float` do not have a corresponding Javascript type, but are needed to specify the type of the column in the store. As the table data will eventually be pushed to the server tables, these types help us proactively enforce type safety which otherwise would only manifest as an error while pushing the data to the server.

The column type is used to verify that the inserted data matches the column type. It is also useful in reading the data back from the table in the correct form. If the type of an existing column is changed by a future `defineTable` call, reading from the table will attempt to convert the data into the new column type.

#### Initializing the sync context

Sync context initialization needs an initialized store:
```
var syncContext = client.getSyncContext();
syncContext.initialize(store);
```
`initialize` returns a promise that is fulfilled when the sync context is initialized.

It is possible to plug in your own custom implementation of the `store`. `MobileServiceSqliteStore`, which is available out of the box, is a SQLite store.

#### Obtaining reference to a local table

Once the sync context is initialized, reference to a local table can be obtained as shown below:
```
var table = client.getSyncTable('todoitem');
```

Note that, `getSyncTable` does not actually create the table in the store. It only obtains a reference to it. The actual table has to be created using `defineTable` as explained above.

#### CRUD operations on the local table

You can perform CRUD operations on the local table in the same way as you would on online tables using `insert`, `update`, `del`, `read` and `lookup`. You can find more details at https://azure.microsoft.com/en-us/documentation/articles/app-service-mobile-html-how-to-use-client-library/

#### Pulling data into the local table

You can pull data from the online tables into the local table using the `pull` method:
```
syncContext.pull(new WindowsAzure.Query('todoitem'));
```

`pull` returns a promise that is resolved when the pull operation is complete. `WindowsAzure.Query` is a QueryJS object. You can read more about it at https://msdn.microsoft.com/library/azure/jj613353 and https://github.com/Azure/azure-query-js.

#### Pushing data to the tables on the server

You can push the changes you made to the local tables using the sync context's `push` method.
```
syncContext.push();
```

The `push` method returns a promise that is fulfilled when the push operation is completed successfully.

##### Conflict and error handling

Changes are pushed to the server, one change at a time. Pushing a change can result in a conflict or an error, which can be handled using the `pushHandler`.

Here is how you register a push handler:
```
syncContext.pushHandler = {
    onConflict: function (serverRecord, clientRecord, pushError) {
        // Handle the conflict
    },
    onError: function (pushError) {
        // Handle the error
    }
};
```

The `onConflict` callback passes the values of the server and client records at the time of push. Note that `serverRecord` is provided only for convenience, and _may not be always available_ based on the kind of conflict. `serverRecord` will not be available when the server inserts or deletes a record and the client inserts a record with the same ID, which should be rare. The `pushError` object contains details of the error and some helper methods for resolving the conflict.

Informational methods:

`pushError` provides the following informational methods:

* `getError()`  - Get the detailed underlying error that caused the push to fail

* `getTableName()` - Get the name of the table for which the push was attempted

* `getAction()` - Gets the operation that was being pushed. Valid actions are 'insert', 'update' and 'delete'.

Conflict handling methods:

`pushError` provides the following methods for resolving conflicts. All are asynchronous methods that return a promise.

* `cancelAndUpdate(newValue)` - Cancels the push operation for the current change and updates the record in the local table. `newValue` is the new value of the record that will be updated inthe local table.

* `cancelAndDiscard` - Cancels the push operation for the current change and discards the corresponding record from the local table.

* `cancel` - Cancels the push operation for the current operation and leaves the corresponding record in the local table untouched.

* `update(newValue)` - Updates the client data record associated with the current operation. `newValue` specifies the new value of the record.

* `changeAction(newAction, newClientRecord)` - Changes the type of operation that was being pushed to the server. This is useful for handling conflicts where you might need to change the type of operation to be able to push the changes to the server. Example: You might need to change `'insert'` to `'update'` to be able to push a record that was already inserted on the server. Note that changing the action to `'delete'` will implicitly remove the associated record from the corresponding local table. Valid values for `newAction` are `'insert'`, `'update'` and `'delete'`. `newClientRecord` specifies the new value of the client record when `newAction` is `'insert'` or `'update'`.

    Using any one of these conflict handling methods will mark the pushError as handled, i.e. `pushError.isHandled = true` so that the push operation can attempt to push the chage again, unless it was cancelled using one of the conflict handling methods. If, however, you wish to skip pushing the change despite using one of the conflict handling methods, you can set `pushError.isHandled = false` after the conflict handling methods you used are complete.

* `isHandled` - Using one of the above conflict handling methods automatically sets this property to `true`. Set this property to `false` if you have handled the error using one of the above conflict handling methods, yet want to skip pushing the change. If you resolved the conflict without using any of the above conflict handling methods, you need to set `isHandled = true;` explicitly.

All unhandled conflicts are noted and passed to the user as an array when the pull operation is complete.

The `onError (pushError)` method is called when the push fails due to an error. If you handle the error, you can set `isHandled = true` so that push can resume. An unhandled error will abort the push operation, unlike an unhandled conflict. The `pushError` methods explained in the conflict handling section are available for use for error handling too.

#### Future work

This is a first preview of the offline data sync feature and have several features missing. Also, only limited testing of the offline sync features has been performed at this point of time. 

Some of the missing features are:
- purge
- cancellability of push and pull
- automatically triggering a push when a pull is performed
- custom page size when performing a pull
- closing a database without having to close the app
- callback to allow changing how records are sent to the server during a push
- configurable ID column. Currently ID column has to be named 'id'.

All these will be added over a series of updates in the next few days. Stay tuned!

### Build
    
To build the SDK yourself, run:

    git clone https://github.com/Azure/azure-mobile-apps-js-client.git
    cd azure-mobile-apps-js-client
    npm install
    npm run build

The built files will be copied to the _/dist_ directory.

### Running Unit Tests

To run the WinJS Windows Store test app:

1. Open the ```sdk\Microsoft.WindowsAzure.Mobile.JS.sln``` file in Visual Studio.
2. In the Solution Explorer, right-click on the ```Microsoft.WindowsAzure.Mobile.WinJS.Test``` project in the Solution Explorer and select ```Set as StartUp Project```.
3. Press F5 to run the application in debug mode.
4. A Windows Store application will appear with a prompt for a Runtime Uri and Tags. You can safely ignore this prompt and just click the Start button.
5. The test suite will run and display the results.

To run the HTML tests:

1. Open the ```sdk\Microsoft.WindowsAzure.Mobile.JS.sln``` file in Visual Studio.
2. In the Solution Explorer, select the Microsoft.WindowsAzure.Mobile.WinJS.Test project and right-click to select 'View in Browser'.
3. The default browser will launch and run the test HTML application. Some tests may fail because due to an 'Unexpected connection failure'. This is because the test is configured to connect to a Mobile Service that does not exist. These failures can be ignored.

## Change log
- [JavaScript SDK](CHANGELOG.md)

## Useful Resources

* [Getting Started with Azure Mobile Apps](https://azure.microsoft.com/en-us/documentation/learning-paths/appservice-mobileapps/)
* [Quickstart](https://azure.microsoft.com/en-us/documentation/articles/app-service-mobile-cordova-get-started/)
* Tutorials and product overview are available at [Microsoft Azure Mobile Apps Developer Center](http://azure.microsoft.com/en-us/develop/mobile).
* Our product team actively monitors the [Mobile Services Developer Forum](http://social.msdn.microsoft.com/Forums/en-US/azuremobile/) to assist you with any troubles.

## Contribute Code or Provide Feedback

If you would like to become an active contributor to this project please follow the instructions provided in [Microsoft Azure Projects Contribution Guidelines](http://azure.github.com/guidelines.html).

If you encounter any bugs with the library please file an issue in the [Issues](https://github.com/Azure/azure-mobile-apps-js-client/issues) section of the project.
