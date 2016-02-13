var fs = require('fs'),
    rimraf = require('rimraf'),
    execSync = require('child_process').execSync;

function run(command) {
    var result = execSync(command, {
        encoding: 'utf8'
    });
    
    console.log(result);
}

function setupCordova() {

    process.chdir(__dirname);

    // Clean up previous builds
    rimraf.sync('./cordova/www/TestFramework');
    rimraf.sync('./cordova/platforms');
    rimraf.sync('./cordova/plugins');

    fs.symlinkSync('./TestFramework', './cordova/www/TestFramework');

    // Install Azure Mobile Apps Cordova plugin from GitHub. Needed only during development
    run('cd cordova && cordova plugin add https://github.com/azure/azure-mobile-apps-cordova-client.git');

    // Install Azure Mobile Apps Cordova plugin from npm registry
    //run('cd cordova && cordova plugin add cordova-plugin-ms-azure-mobile-apps');

    run('cd cordova && cordova plugin add cordova-plugin-device');
    run('cd cordova && cordova plugin add https://github.com/phonegap/phonegap-plugin-push.git');

    run('cd cordova && cordova plugin add cordova-plugin-console');

    console.log('Preparing for android');
    run('cd cordova && cordova platform add android');
    run('cd cordova && cordova build android');

    if (process.platform === 'windows') {

        console.log('Preparing for wp8');
        run('cd cordova && cordova platform add wp8');
        run('cd cordova && cordova build wp8');

        console.log('Preparing for windows');
        run('cd cordova && cordova platform add windows');
        run('cd cordova && cordova build windows');

    } else if (process.platform === 'darwin') {

        console.log('Preparing for iOS');
        run('cd cordova && cordova platform add ios');
        run('cd cordova && cordova build ios');

    } else {
        console.log('Unsupported platform ' + process.platform);
    }
    
}

setupCordova();
