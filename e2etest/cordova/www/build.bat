REM Cordova E2E Test Build Script
REM Installs the required plugins and builds supported platforms when using Windows

REM clean up previous builds

call rmdir /s /q ../platforms
call rmdir /s /q ../plugins

REM copy the js files from TestFramework over to TestFramework

call rmdir /s /q TestFramework
call robocopy /MIR ../../TestFramework TestFramework

call cordova plugin add com.microsoft.azure-mobile-services
REM cordova plugin add https://github.com/azure/azure-mobile-services-cordova.git

REM Plugins required for push notifications
call cordova plugin add cordova-plugin-device
call cordova plugin add https://github.com/phonegap-build/PushPlugin.git

REM For debugging
call cordova plugin add cordova-plugin-console

REM Now build platforms supported on Windows

call cordova platform add android
call cordova build android

call cordova platform add wp8
call cordova build wp8

call cordova platform add windows
call cordova build windows
