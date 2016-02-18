module.exports = {
    cordova: {
        // If this flag is set to true, plugins, platforms are left untouched and
        // only the source files are refreshed. Useful during development.
        refreshOnly: false,
    
        // List of Cordova plugins to install
        plugins: [
            // Azure Mobile Apps plugin. Install either from the npm registry or github.
            'https://github.com/azure/azure-mobile-apps-cordova-client.git',
            // 'cordova-plugin-ms-azure-mobile-apps,
            
            // Dependencies
            'cordova-plugin-device',
            'https://github.com/phonegap/phonegap-plugin-push.git',
            'cordova-plugin-console'
        ],
        
        // Platform to add to the Cordova project and build. The platforms will be built only if the 
        // host machine supports building that platform.
        platforms: {
            windows: true,
            android: false,
            ios: false,
            wp8: false
        }

    }
};
