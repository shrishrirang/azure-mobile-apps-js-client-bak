/// <binding BeforeBuild='default' />
/// <vs BeforeBuild='default' />
var remapify = require('remapify');

function definePlatformMappings(mappings) {
    return function(b) {
        b.plugin(remapify, mappings);
    };
}

module.exports = function(grunt) {
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        files: {
            // Entry points common to all platforms
            core: [
                'sdk/src/MobileServiceClient.js',
            ],
            // List of Web entry points
            web: [
                '<%= files.core %>',
            ],
            // List of Cordova entry points
            cordova: [
                '<%= files.core %>',
            ],
            // List of WinJS entry points
            winjs: [
                '<%= files.core %>',
            ],
            // List of entry points for WinjS with intellisense support
            intellisense: [
                '<%= files.winjs %>',
                'sdk/src/Internals/DevIntellisense.js',
            ],
            // Entry points common to tests for all platforms
            testcore: [
                'sdk/test/winJS/tests/utilities/*.js',
                'sdk/test/winJS/tests/unit/*.js',
                'sdk/test/winJS/tests/functional/*.js'
            ],
            // List of all javascript files that we want to validate and watch
            // i.e. all javascript files except those that are installed, generated during build, third party files, etc
            all: [
                'Gruntfile.js',
                'sdk/src/**/*.js',
                'sdk/test/**/*.js',
                '!**/[gG]enerated/*.js',
                '!sdk/test/cordova/platforms/**',
                '!sdk/test/**/bin/**',
                '!sdk/test/**/plugins/**',
                '!**/node_modules/**',
                '!**/MobileServices.*js'
            ]
        },        
        jshint: {
            all: '<%= files.all %>'
        },
        concat: {
            constants: {
                options: {
                    banner: header + 
                        '\nexports.FileVersion = \'<%= pkg.version %>\';\n' +
                        '\nexports.Resources = {};\n',
                    process: wrapResourceFile,
                },
                src: ['sdk/src/Strings/**/Resources.resjson'],
                dest: 'sdk/src/Generated/Constants.js'
            },
        },
        uglify: {
            options: {
                banner: '//! Copyright (c) Microsoft Corporation. All rights reserved. <%= pkg.name %> v<%= pkg.version %>\n',
                mangle: false
            },
            web: {
                src: 'sdk/src/Generated/MobileServices.Web.js',
                dest: 'sdk/src/Generated/MobileServices.Web.min.js'
            },
            cordova: {
                src: 'sdk/src/Generated/MobileServices.Cordova.js',
                dest: 'sdk/src/Generated/MobileServices.Cordova.min.js'
            },
            winjs: {
                src: 'sdk/src/Generated/MobileServices.js',
                dest: 'sdk/src/Generated/MobileServices.min.js'
            }
        },
        browserify: {
            options: {
                banner: header
            },
            web: {
                src: '<%= files.web %>',
                dest: './sdk/src/Generated/MobileServices.Web.js',
                options: {
                    preBundleCB: definePlatformMappings( [ { src: '**/*.js', cwd: __dirname + '/sdk/src/Platforms/web', expose: 'Platforms' } ] )
                }
            },
            cordova: {
                src: '<%= files.cordova %>',
                dest: './sdk/src/Generated/MobileServices.Cordova.js',
                options: {
                    preBundleCB: definePlatformMappings( [ { src: '**/*.js', cwd: __dirname + '/sdk/src/Platforms/web', expose: 'Platforms' } ] )
                }
            },
            winjs: {
                src: '<%= files.winjs %>',
                dest: './sdk/src/Generated/MobileServices.js',
                options: {
                        preBundleCB: definePlatformMappings( [ { src: '**/*.js', cwd: __dirname + '/sdk/src/Platforms/winjs', expose: 'Platforms' } ] )
                }
            },
            intellisense: {
                src: [
                    '<%= files.intellisense %>'
                ],
                dest: './sdk/src/Generated/MobileServices.DevIntellisense.js',
                options: {
                    preBundleCB: definePlatformMappings( [ { src: '**/*.js', cwd: __dirname + '/sdk/src/Platforms/winjs', expose: 'Platforms' } ] )
                }
            },
            webTest: {
                src: [
                    '<%= files.web %>',
                    './sdk/test/web/js/TestFrameworkAdapter.js',
                    './sdk/test/web/js/TestClientHelper.js',
                    '<%= files.testcore %>'
                ],
                dest: './sdk/test/web/Generated/Tests.js',
                options: {
                    preBundleCB: definePlatformMappings( [ { src: '**/*.js', cwd: __dirname + '/sdk/src/Platforms/web', expose: 'Platforms' } ] )
                }
            },
// Uncomment this when Cordova UTs are added
//            cordovaTest: {
//                src: [
//                    '<%= files.cordova %>',
//                    './sdk/test/web/js/TestFrameworkAdapter.js',
//                    './sdk/test/web/js/TestClientHelper.js',
//                    '<%= files.testcore %>'
//                ],
//                dest: './sdk/test/cordova/www/js/Generated/Tests.js',
//                options: {
//                    preBundleCB: definePlatformMappings( [ { src: '**/*.js', cwd: __dirname + '/sdk/src/Platforms/web', expose: 'Platforms' } ] )
//                }
//            },
            winjsTest: {
                src: [
                    '<%= files.winjs %>',
                    'sdk/test/winJS/tests/TestFramework.js',
                    'sdk/test/winJS/tests/TestInterface.js',
                    '<%= files.testcore %>'
                ],
                dest: './sdk/test/winJS/Generated/Tests.js',
                options: {
                    preBundleCB: definePlatformMappings( [ { src: '**/*.js', cwd: __dirname + '/sdk/src/Platforms/winjs', expose: 'Platforms' } ] )
                }
            }
        },
        watch: {
            files: '<%= files.all %>',
            tasks: ['concat', 'browserify', 'uglify']
        }
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-watch');
        
    // Default task(s).
    grunt.registerTask('default', ['concat', 'browserify', 'uglify', 'jshint']);
};

var header = '// ----------------------------------------------------------------------------\n' +
             '// Copyright (c) Microsoft Corporation. All rights reserved\n' +
             '// <%= pkg.name %> - v<%= pkg.version %>\n' +
             '// ----------------------------------------------------------------------------\n';

function wrapResourceFile(src, filepath) {
    /// <summary>
    /// Takes a resjson file and places it into a module level resources array
    /// with the index corresponding to the language identifier in the file path
    /// </summary>
    /// <param name="src">
    /// Source code of a module file
    /// </param>
    /// <param name="filepath">
    /// File path of the resjson (i.e. src/Strings/en-US/Resources.resjson)
    /// The file name must be in format of <directories>/<locale>/Resources.resjson
    /// </param>

    var language = filepath.replace('sdk/src/Strings/', '').replace('/Resources.resjson', '');

    return '\nexports.Resources[\'' + language + '\'] = ' + src + ';';
}
