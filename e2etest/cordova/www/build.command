REM Cordova E2E Test Build Script
REM Installs the required plugins and builds supported platforms when using OSX

# clean up previous builds

#rm -rf ../platforms
#rm -rf ../plugins

# copy the js files from TestFramework over to TestFramework

rm -rf TestFramework 
rsync -rlK ../../TestFramework .

call cordova plugin add com.microsoft.azure-mobile-services
#call cordova plugin add https://github.com/azure/azure-mobile-services-cordova.git

# Plugins required for push notifications
call cordova plugin add cordova-plugin-device
call cordova plugin add https://github.com/phonegap-build/PushPlugin.git

# For debugging
call cordova plugin add cordova-plugin-console

# Now build platforms supported on OSX

cordova platform add android
cordova build android

cordova platform add ios
cordova build ios
