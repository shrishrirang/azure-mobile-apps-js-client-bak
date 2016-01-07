REM Cordova E2E Test Build Script
REM Installs the required plugins and builds supported platforms when using Windows

REM clean up previous builds

call rmdir /s /q ..\platforms
call rmdir /s /q ..\plugins

REM copy the js files from TestFramework over to TestFramework

call rmdir /s /q TestFramework
call robocopy /MIR ..\..\TestFramework TestFramework

REM call cordova plugin add cordova-plugin-ms-azure-mobile-apps
call cordova plugin add https://github.com/shrishrirang/azure-mobile-services-cordova.git#beta2

REM Plugins required for push notifications
call cordova plugin add cordova-plugin-device
call cordova plugin add https://github.com/phonegap/phonegap-plugin-push.git

REM For debugging
call cordova plugin add cordova-plugin-console

REM Now build platforms supported on Windows

REM call cordova platform add android
REM call cordova build android

REM call cordova platform add wp8
REM call cordova build wp8

call cordova platform add windows
call cordova build windows
