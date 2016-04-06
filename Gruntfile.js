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
                '<%= files.core %>',
            ],
            // Entry points common to tests for all platforms
            testcore: [
                'sdk/test/framework/*.js',
                'sdk/test/*.js'
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
            webTest: {
                src: [
                    '<%= files.web %>',
                    '<%= files.testcore %>'
                ],
                dest: './sdk/test/Generated/Tests.js',
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
        },
        copy: {
            web: {
                src: 'MobileServices.Web.*js',
                dest: 'dist/',
                expand: true,
                cwd: 'sdk/src/Generated/'
            }
        },
        watch: {
            files: '<%= files.all %>',
            tasks: ['concat', 'browserify', 'uglify', 'copy']
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
    grunt.registerTask('default', ['concat', 'browserify', 'uglify', 'copy', 'jshint']);
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
