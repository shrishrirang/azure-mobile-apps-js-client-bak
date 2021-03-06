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
                'sdk/src/index.js',
            ],
            // List of Web entry points
            web: [
                '<%= files.core %>',
            ],
            // List of Cordova entry points
            cordova: [
                'sdk/src/Platforms/cordova/MobileServiceSqliteStore.js',
                '<%= files.core %>',
            ],
            // Entry points common to tests for all platforms
            testcore: [
                'sdk/test/misc/**/*.js',
                'sdk/test/tests/shared/**/*.js'
            ],
            // List of all javascript files that we want to validate and watch
            // i.e. all javascript files except those that are installed, generated during build, third party files, etc
            all: [
                'Gruntfile.js',
                'sdk/src/**/*.js',
                'sdk/test/**/*.js',
                '!**/[Gg]enerated/**',
                '!**/[Ee]xternal/**',
                '!sdk/test/app/cordova/platforms/**',
                '!sdk/test/app/cordova/merges/**',
                '!sdk/test/**/bin/**',
                '!sdk/test/**/plugins/**'
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
                dest: 'sdk/src/generated/Constants.js'
            },
        },
        uglify: {
            options: {
                banner: '//! Copyright (c) Microsoft Corporation. All rights reserved. <%= pkg.name %> v<%= pkg.version %>\n',
                mangle: false
            },
            web: {
                src: 'sdk/src/generated/MobileServices.Web.js',
                dest: 'sdk/src/generated/MobileServices.Web.min.js'
            },
            cordova: {
                src: 'sdk/src/generated/MobileServices.Cordova.js',
                dest: 'sdk/src/generated/MobileServices.Cordova.min.js'
            }
        },
        browserify: {
            options: {
                browserifyOptions: {
                    standalone: 'WindowsAzure'
                },
                plugin: [
                    [ 'browserify-derequire' ]
                ],
                banner: header
            },
            web: {
                src: '<%= files.web %>',
                dest: './sdk/src/generated/MobileServices.Web.js',
                options: {
                    preBundleCB: definePlatformMappings( [ { src: '**/*.js', cwd: __dirname + '/sdk/src/Platforms/web', expose: 'Platforms' } ] )
                }
            },
            cordova: {
                src: '<%= files.cordova %>',
                dest: './sdk/src/generated/MobileServices.Cordova.js',
                options: {
                    preBundleCB: definePlatformMappings( [ { src: '**/*.js', cwd: __dirname + '/sdk/src/Platforms/cordova', expose: 'Platforms' } ] )
                }
            },
            webTest: {
                src: [
                    '<%= files.web %>',
                    '<%= files.testcore %>'
                ],
                dest: './sdk/test/app/browser/generated/tests.js',
                options: {
                    preBundleCB: definePlatformMappings( [ { src: '**/*.js', cwd: __dirname + '/sdk/src/Platforms/web', expose: 'Platforms' } ] )
                }
            },
            cordovaTest: {
                src: [
                    '<%= files.testcore %>',
                    '<%= files.cordova %>',
                    './sdk/test/tests/target/cordova/**/*.js'
                ],
                dest: './sdk/test/app/cordova/www/scripts/generated/tests.js',
                options: {
                    preBundleCB: definePlatformMappings( [ { src: '**/*.js', cwd: __dirname + '/sdk/src/Platforms/cordova', expose: 'Platforms' } ] )
                }
            },
        },
        copy: {
            web: {
                src: 'MobileServices.Web.*js',
                dest: 'dist/',
                expand: true,
                cwd: 'sdk/src/generated/'
            },
            cordova: {
                src: 'MobileServices.Cordova.*js',
                dest: 'dist/',
                expand: true,
                cwd: 'sdk/src/generated/'
            },
            webTest: {
                src: '*',
                dest: 'sdk/test/app/browser/external/qunit/',
                expand: true,
                cwd: 'node_modules/qunitjs/qunit'
            },
            cordovaTest: {
                // Copy qunit css and js files to the Cordova unit test app directory
                src: ['*'],
                dest: 'sdk/test/app/cordova/www/external/qunit/',
                expand: true,
                cwd: 'node_modules/qunitjs/qunit'
            },
            hostCordovaTest: {
                // Copy the test bundle to the Cordova unit test app's android directory.
                // This is needed to host the Cordova bits so that the Cordova app can refresh on the fly.
                src: ['tests.js'],
                dest: __dirname + '/sdk/test/app/cordova/platforms/android/assets/www/scripts/generated',
                expand: true,
                cwd: __dirname + '/sdk/test/app/cordova/www/scripts/generated'
            }
        },
        watch: {
            all: {
                files: '<%= files.all %>',
                tasks: ['concat', 'browserify', 'copy']
            },
            web: {
                files: '<%= files.all %>',
                tasks: ['concat', 'browserify:webTest', 'copy:webTest']
            },
            cordova: {
                files: '<%= files.all %>',
                tasks: ['concat', 'browserify:cordovaTest', 'copy:cordovaTest', 'copy:hostCordovaTest']
            }
        }
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-copy');
        
    // Default task(s).
    grunt.registerTask('build', ['buildbrowser', 'buildcordova', 'jshint']);
    grunt.registerTask('buildbrowser', ['concat', 'browserify:web', 'browserify:webTest', 'copy:web', 'copy:webTest']);
    grunt.registerTask('buildcordova', ['concat', 'browserify:cordova', 'browserify:cordovaTest', 'copy:cordova', 'copy:cordovaTest']);

    grunt.registerTask('default', ['build']);
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
