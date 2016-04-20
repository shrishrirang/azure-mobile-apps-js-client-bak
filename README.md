 # Microsoft Azure Mobile Apps: Javascript Client SDK

With Microsoft Azure Mobile Apps you can add a scalable backend to your connected client applications in minutes. To learn more, visit our [Developer Center](http://azure.microsoft.com/en-us/develop/mobile).

## Getting Started

If you are new to Azure Mobile Apps, you can get started by following the [Mobile Apps documentation](https://azure.microsoft.com/en-us/documentation/learning-paths/appservice-mobileapps/)

The JavaScript SDK makes it easy to use Microsoft Azure Mobile Apps. To connect to an Azure App Service from a Cordova application, refer [How to Use Apache Cordova Client Library for Azure Mobile Apps](https://azure.microsoft.com/en-us/documentation/articles/app-service-mobile-cordova-how-to-use-client-library/)

### Usage

Run the following command to get the Javascript client for Azure Mobile Apps:

    npm install azure-mobile-apps-client
    
The SDK files are present in the package's _/dist_ directory.

### Build
    
To build the SDK yourself, run:

    git clone https://github.com/Azure/azure-mobile-apps-js-client.git
    cd azure-mobile-apps-client
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
