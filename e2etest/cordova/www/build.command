# Cordova E2E Test Build Script
# Installs the required plugins and builds supported platforms when using OSX

# clean up previous builds

rm -rf ../platforms
rm -rf ../plugins

# copy the js files from TestFramework over to TestFramework

rm -rf TestFramework 
rsync -rlK ../../TestFramework .

cordova plugin add cordova-plugin-ms-azure-mobile-apps
#cordova plugin add https://github.com/azure/azure-mobile-services-cordova.git

# Plugins required for push notifications
cordova plugin add cordova-plugin-device
cordova plugin add https://github.com/phonegap-build/PushPlugin.git

# For debugging
cordova plugin add cordova-plugin-console

# Now build platforms supported on OSX

cordova platform add android
cordova build android

cordova platform add ios
cordova build ios
