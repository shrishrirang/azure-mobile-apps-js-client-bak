# Microsoft Azure Mobile Apps: Javascript Client SDK

With Microsoft Azure Mobile Apps you can add a scalable backend to your connected client applications in minutes. To learn more, visit our [Developer Center](http://azure.microsoft.com/en-us/develop/mobile).

## Getting Started

If you are new to Mobile Services, you can get started by following our tutorials for connecting your Mobile
Services cloud backend to [Windows Store apps](http://azure.microsoft.com/en-us/documentation/articles/mobile-services-windows-store-get-started/),
[Windows Phone 8 apps](http://azure.microsoft.com/en-us/documentation/articles/mobile-services-windows-phone-get-started/),
[iOS apps](http://azure.microsoft.com/en-us/documentation/articles/mobile-services-ios-get-started/),
and [Android apps](http://azure.microsoft.com/en-us/documentation/articles/mobile-services-android-get-started/).

## Download Source Code

To get the source code of our SDKs and samples via **git** just type:

    git clone https://github.com/Azure/azure-mobile-apps-js-client.git
    cd ./azure-mobile-apps-js-client/

## Reference Documentation

## Change log
- [JavaScript SDK](CHANGELOG.md)

## JavaScript SDK

Our JavaScript SDK makes it easy to use our Microsoft Azure Mobile Apps in a Windows 8 application or an HTML client. The [Microsoft Azure Mobile Apps for WinJS SDK](http://nuget.org/packages/WindowsAzure.MobileServices.WinJS/) is available as a Nuget package or you can download the source for both WinJS and HTML using the instructions above. 

### Prerequisites

The Microsoft Azure Mobile Apps for WinJS SDK requires Windows 8.1 and Visual Studio 2013 Update 3. 

### Building and Referencing the SDK

1. Install Node.js and grunt-cli (globally) for building in Visual Studio
2. Install the Task Runner Explorer(https://visualstudiogallery.msdn.microsoft.com/8e1b4368-4afb-467a-bc13-9650572db708) add on for VS 2013 
3. Open the ```sdk\Microsoft.WindowsAzure.Mobile.JS.sln``` file in Visual Studio.
4. Right click on the gruntfile.js in the solution, and select Task Runner Explorer
5. Run the default build option

Alternatively, you can use Grunt from the command line to build the project as well.

For WinJS Windows Store apps, copy the ```Generated/MobileServices[.min].js```, ```Generated/MobileServices.DevIntellisense.js``` and ```Generated/MobileService.pri``` files into your WinJS project. For HTML applications, copy the ```Generated/MobileServices.Web[.min].js``` and the ```Generated/MobileServices.DevIntellisense.js``` files into your HTML\JavaScript project.

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

## Useful Resources

* [Quickstarts](https://github.com/Azure/azure-mobile-services-quickstarts)
* [Samples](https://github.com/Azure/mobile-services-samples)
* Tutorials and product overview are available at [Microsoft Azure Mobile Apps Developer Center](http://azure.microsoft.com/en-us/develop/mobile).
* Our product team actively monitors the [Mobile Services Developer Forum](http://social.msdn.microsoft.com/Forums/en-US/azuremobile/) to assist you with any troubles.

## Contribute Code or Provide Feedback

If you would like to become an active contributor to this project please follow the instructions provided in [Microsoft Azure Projects Contribution Guidelines](http://azure.github.com/guidelines.html).

If you encounter any bugs with the library please file an issue in the [Issues](https://github.com/Azure/azure-mobile-apps-js-client/issues) section of the project.
