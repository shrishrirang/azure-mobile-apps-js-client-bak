function definePushTestsNamespace() {
    var tests = [],
        channelUri,
        notification = {
            type: 'toast',
            notificationType: Windows.Networking.PushNotifications.PushNotificationType.toast,
            payload: '<?xml version="1.0"?><toast><visual><binding template="ToastText01"><text id="1">hello world2</text></binding></visual></toast>'
        },
        receivedNotification = {},
        pushNotification,
        pushNotificationQueue = [],
        channel;

    tests.push(new zumo.Test('Push registration', function (test, done) {

        pushNotification = PushNotification.init({
            android: {
                senderID: "467840898434"
            },
            ios: {
                alert: "true",
                badge: "true",
                sound: "true"
            },
            windows: {}
        });

        pushNotification.on('registration', function (data) {
            test.addLog('Registration ID: ', data.registrationId);
            channel = {
                uri: data.registrationId
            }
            done(true);
        });

        pushNotification.on('notification', function (data) {
            pushNotificationQueue.push({
                data: data
            });
            receivedNotification.payload = data;
            receivedNotification.notificationType = data.additionalData.pushNotificationReceivedEventArgs.type;
        });

        pushNotification.on('error', function (error) {
            pushNotificationQueue.push({
                error: error
            });
        });

    }));

    tests.push(new zumo.Test('InitialDeleteRegistrations', function (test, done) {
        channelUri = channel.uri;
        return zumo.getClient().invokeApi('deleteRegistrationsForChannel', { method: 'DELETE', parameters: { channelUri: channelUri } })
            .done(function () {
                done(true);
            }, function () {
                done(false);
            });
    }));

    tests.push(new zumo.Test('Register', function (test, done) {
        channelUri = channel.uri;

        zumo.getClient().push.register('wns', channelUri)
            .then(function () {
                return zumo.getClient().invokeApi('verifyRegisterInstallationResult', { method: 'GET', parameters: { channelUri: channelUri } });
            })
            .then(function () {
                return zumo.getClient().push.unregister(channelUri);
            })
            .done(function () {
                done(true);
            }, function (error) {
                done(false);
            });
    }));

    tests.push(new zumo.Test('Unregister', function (test, done) {
        channelUri = channel.uri;
        return zumo.getClient().push.unregister(channelUri)
    .then(function () {
        return zumo.getClient().invokeApi('verifyUnregisterInstallationResult', { method: 'GET' });
    })
    .done(function () {
        done(true);
    }, function () {
        done(false);
    });
    }));

    tests.push(new zumo.Test('RegisterWithTemplates', function (test, done) {

        channelUri = channel.uri;
        return zumo.getClient().push.register('wns', channelUri, createTemplates(['foo']))
    .then(function () {
        return zumo.getClient().invokeApi('verifyRegisterInstallationResult', { method: 'GET', parameters: { channelUri: channelUri, templates: createTemplates() } });
    })
    .then(function () {
        return zumo.getClient().push.unregister(channelUri);
    })
    .done(function () {
        done(true);
    }, function () {
        done(false);
    });
    }));

    tests.push(new zumo.Test('RegisterWithTemplatesAndSecondaryTiles', function (test, done) {

        channelUri = channel.uri;
        return zumo.getClient().push.register('wns', channelUri, createTemplates(['bar']), createSecondaryTiles(channelUri, ['foo']))
    .then(function () {
        return zumo.getClient().invokeApi('verifyRegisterInstallationResult', { method: 'GET', parameters: { channelUri: channelUri, templates: createTemplates(), secondaryTiles: createSecondaryTiles(channelUri, undefined, true) } });
    })
    .then(function () {
        return zumo.getClient().push.unregister(channelUri);
    })
    .done(function () {
        done(true);
    }, function () {
        done(false);
    });
    }));

    tests.push(new zumo.Test('RegisterMultiple', function (test, done) {

        channelUri = channel.uri;
        return zumo.getClient().push.register('wns', channelUri)
    .then(function () {
        return zumo.getClient().push.register('wns', channelUri, createTemplates(['foo']));
    })
    .then(function () {
        return zumo.getClient().push.register('wns', channelUri);
    })
    .then(function () {
        return zumo.getClient().invokeApi('verifyRegisterInstallationResult', { method: 'GET', parameters: { channelUri: channelUri } });
    })
    .then(function () {
        return zumo.getClient().push.unregister(channelUri);
    })
    .done(function () {
        done(true);
    }, function () {
        done(false);
    });
    }));

    tests.push(new zumo.Test('ToastPush', function (test, done) {
        channelUri = channel.uri;
        receivedNotification = undefined;

        zumo.getClient().push.register('wns', channelUri)
            .then(function () {
                return zumo.getClient().invokeApi('push',
                {
                    body: {
                        method: 'send',
                        type: 'wns',
                        payload: notification.payload,
                        token: 'dummy',
                        wnsType: notification.type
                    }
                });
            });


        setTimeout(function () {

            return zumo.getClient().push.unregister(channelUri)
                .done(function () {

                    if (receivedNotification === undefined) {
                        throw 'No push notification received within allotted timeout';
                    } else if (receivedNotification.notificationType !== notification.notificationType) {
                        throw 'Incorrect push notification type\nexpected ' + notification.notificationType + '\nactual ' + receivedNotification.notificationType;
                    } else if (receivedNotification.toastNotification.content.getXml() !== notification.payload) {
                        throw 'Incorrect push notification content\nexpected ' + notification.payload + '\nactual ' + receivedNotification.toastNotification.content.getXml();
                    }

                    done(true);
                }, function (error) {
                    done(false);
                });

        }, 55000);
    }));

    return {
        name: 'Push',
        tests: tests
    };
}

function createTemplates(tags) {
    return {
        testTemplate: {
            body: '<toast><visual><binding template="ToastText01"><text id="1">$(message)</text></binding></visual></toast>',
            headers: { 'X-WNS-Type': 'wns/toast' },
            tags: tags
        }
    }
}

function createSecondaryTiles(channelUri, tags, expectedTiles) {
    // the ordering of this is significant as the comparison performed on the server is done by serialising to JSON. 
    // If it's flaky, a more robust object comparison should be implemented
    return {
        testSecondaryTiles: {
            pushChannel: channelUri,
            pushChannelExpired: expectedTiles ? false : undefined,
            templates: createTemplates(tags)
        }
    };
}

zumo.tests.push = definePushTestsNamespace();




//// ----------------------------------------------------------------------------
//// Copyright (c) Microsoft Corporation. All rights reserved.
//// ----------------------------------------------------------------------------

//shrirang = function() {
//    var x = 1;
//    x = x;

//}

//function definePushTestsNamespace() {
//    var tests = [],
//        registrationId,
//        pushNotification,
//    	templateName = 'myPushTemplate',
//        pushNotificationQueue = [],
//        onPushNotification,
//        onPushError,
//        waitTime = 30000,
//        GCM_SENDER_ID = '467840898434';

//    // TODO: See if we can check if we are running on a simulator and abort the tests

//    tests.push(new zumo.Test('Push registration', function (test, done) {
//        console.log("Running " + test.name);

//        pushNotification = PushNotification.init({
//            android: {
//                senderID: GCM_SENDER_ID
//            },
//            ios: {
//                alert: "true",
//                badge: "true",
//                sound: "true"
//            }
//        });

//        pushNotification.on('registration', function (data) {
//            test.addLog('Registration ID: ', data.registrationId);

//            // Set the device-specific message template.
//            if (device.platform == 'android' || device.platform == 'Android') {
//                // Template registration.
//                var template = '{ "data" : {"message":"$(message)"}}';
//                // Register for notifications.
//                zumo.getClient().push.register('gcm', data.registrationId)
//                    .then(function() {
//                        return zumo.getClient().invokeApi('verifyRegisterInstallationResult', { method: 'GET', parameters: { channelUri: data.registrationId } });
//                    })
//                    .then(onPushNotification, onPushError);
//            } else if (device.platform === 'iOS') {
//                // Template registration.
//                var template = '{"aps": {"alert": "$(message)"}}';
//                // Register for notifications.            
//                zumo.getClient().push.apns.registerTemplate(data.registrationId,
//                    'myTemplate', template, null)
//                    .done(registrationSuccess, registrationFailure);
//            }
//        });

//        pushNotification.on('notification', function (data) {
//            pushNotificationQueue.push({
//                data: data
//            });
//        });

//        pushNotification.on('error', function (error) {
//            pushNotificationQueue.push({
//                error: error
//            });
//        });

//        waitForNotification(waitTime, function (event) {
//            done(false);
//        });

//    }, ['nhPushEnabled']));

//    tests.push(new zumo.Test('Send push notification', function (test, done) {
//        console.log("Running " + test.name);

//        done(true);

//    }, ['nhPushEnabled']));

//    // Simple alert test
//    tests.push(new zumo.Test('Alert', function (test, done) {
//        console.log("Running " + test.name);
//        if (!runTest('iOS')) {
//            done(true);
//            return;
//        }

//        waitForNotification(waitTime, function (event) {
//            if (event && event.alert && event.alert == 'push received') {
//                test.addLog('Success: ', event);
//                done(true);
//            } else {
//                test.addLog('Push failed or timed out: ', event);
//                done(false);
//            }
//        });

//        NativeRegistration(deviceToken).then(function () {
//            return SendNotification(deviceToken, { 'aps': {'alert': 'push received'} });
//        }).then(function () {
//            waitForNotification(waitTime, function(event) {
//                if (event && event.alert && event.alert == 'push received') {
//                    test.addLog('Success: ', event);
//                    done(true);
//                } else {
//                    test.addLog('Push failed or timed out: ', event);
//                    done(false);
//                }
//            });
//        }, function (error) {
//            test.addLog('Error: ', error);
//            done(false);            
//        });
//    }, ['nhPushEnabled']));

//    // Simple badge test
//    tests.push(new zumo.Test('Badge', function (test, done) {
//        console.log("Running " + test.name);
//        if (!runTest('iOS')) {
//            done(true);
//            return;
//        }

//        NativeRegistration(deviceToken).then(function () {
//            return SendNotification(deviceToken, { 'aps': {'badge': 9} });
//        }).then(function () {
//            waitForNotification(waitTime, function(event) {
//                if (event && event.badge && event.badge == 9) {
//                    test.addLog('Success: ', event);
//                    done(true);
//                } else {
//                    test.addLog('Push failed or timed out:', event);
//                    done(false);
//                }
//            });
//        }, function (error) {
//            test.addLog('Error: ', error);
//            done(false);            
//        });
//    }, ['nhPushEnabled']));

//    tests.push(new zumo.Test('Alert and Sound', function (test, done) {
//        console.log("Running " + test.name);
//        if (!runTest('iOS')) {
//            done(true);
//            return;
//        }

//        NativeRegistration(deviceToken).then(function () {
//            return SendNotification(deviceToken, { 'aps': {'alert':'push received', 'sound': 'default'} });
//        }).then(function () {
//            waitForNotification(waitTime, function(event) {
//                if (event && event.alert && event.alert == 'push received' &&
//                     event.sound && event.sound == 'default') {
//                    test.addLog('Success: ', event);
//                    done(true);
//                } else {
//                    test.addLog('Push failed or timed out:', event);
//                    done(false);
//                }
//            });
//        }, function (error) {
//            test.addLog('Error: ', error);
//            done(false);            
//        });
//    }, ['nhPushEnabled']));

//    /* 

//    // This test is NOT supported current with the pushPlugin 
//    // Should be addressed with: https://github.com/phonegap-build/PushPlugin/pull/290

//    tests.push(new zumo.Test('Loc info and parameters', function (test, done) {
//        NativeRegistration(deviceToken).then(function () {
//            return SendNotification(deviceToken, {'alert':{'loc-key':'LOC_STRING','loc-args':['first', 'second']}});
//        }).then(function () {
//            waitForNotification(waitTime, function(event) {
//                if (event && event.alert && event.alert['loc-key'] == 'LOC_STRING' && event.alert['loc-args'] == '(first, second)') {
//                    test.addLog('Success: ', event);
//                    done(true);
//                } else {
//                    test.addLog('Push failed or timed out:', event);
//                    done(false);
//                }
//            });
//        }, function (error) {
//            test.addLog('Error: ', error);
//            done(false);            
//        });
//    }, ['apns']));

//    */

//    tests.push(new zumo.Test('Push with only custom info', function (test, done) {
//        console.log("Running " + test.name);
//        if (!runTest('iOS')) {
//            done(true);
//            return;
//        }

//        NativeRegistration(deviceToken).then(function () {
//            return SendNotification(deviceToken, {'aps':{},'foo':'bar'});
//        }).then(function () {
//            waitForNotification(waitTime, function(event) {
//                if (event && event.foo && event.foo == 'bar') {
//                    test.addLog('Success: ', event);
//                    done(true);
//                } else {
//                    test.addLog('Push failed or timed out:', event);
//                    done(false);
//                }
//            });
//        }, function (error) {
//            test.addLog('Error: ', error);
//            done(false);            
//        });
//    }, ['nhPushEnabled']));

//    tests.push(new zumo.Test('Push with alert, badge and sound', function (test, done) {
//        console.log("Running " + test.name);
//        if (!runTest('iOS')) {
//            done(true);
//            return;
//        }

//        NativeRegistration(deviceToken).then(function () {
//            return SendNotification(deviceToken, { 'aps': {'alert':'simple alert', 'badge': 37, 'sound': 'default', 'custom': 'value'} });
//        }).then(function () {
//            waitForNotification(waitTime, function(event) {
//                if (event && event.alert && event.alert == 'simple alert' &&
//                     event.sound && event.sound == 'default' &&
//                     event.badge && event.badge == 37 &&
//                     event.custom && event.custom == 'value') {
//                    test.addLog('Success: ', event);
//                    done(true);
//                } else {
//                    test.addLog('Push failed or timed out:', event);
//                    done(false);
//                }
//            });
//        }, function (error) {
//            test.addLog('Error: ', error);
//            done(false);            
//        });
//    }, ['nhPushEnabled']));

//    tests.push(new zumo.Test('Push with alert with non-ASCII characters', function (test, done) {
//        console.log("Running " + test.name);
//        if (!runTest('iOS')) {
//            done(true);
//            return;
//        }

//        NativeRegistration(deviceToken).then(function () {
//            return SendNotification(deviceToken, { 'aps': {'alert':'Latin-ãéìôü ÇñÑ, arabic-لكتاب على الطاولة, chinese-这本书在桌子上'} });
//        }).then(function () {
//            waitForNotification(waitTime, function(event) {
//                if (event && event.alert && event.alert == 'Latin-ãéìôü ÇñÑ, arabic-لكتاب على الطاولة, chinese-这本书在桌子上') {
//                    test.addLog('Success: ', event);
//                    done(true);
//                } else {
//                    test.addLog('Push failed or timed out:', event);
//                    done(false);
//                }
//            });
//        }, function (error) {
//            test.addLog('Error: ', error);
//            done(false);            
//        });
//    }, ['nhPushEnabled']));

//    // GCM Tests

//    tests.push(new zumo.Test('GCM Push: name and age', function (test, done) {
//        console.log("Running " + test.name);
//        if (!runTest('android')) {
//            done(true);
//            return;
//        }

//        NativeRegistration(deviceToken).then(function () {
//            return SendNotification(deviceToken, { 'data' : {'name':'John Doe','age':'33'} }, 'gcm');
//        }).then(function () {
//            waitForNotification(waitTime, function(event) {
//                console.log('event: ' + JSON.stringify(event));                
//                if (event && event.payload && event.payload.name && event.payload.name == 'John Doe' && 
//                    event.payload.age && event.payload.age == '33') {
//                    test.addLog('Success: ', event);
//                    done(true);
//                } else {
//                    test.addLog('Push failed or timed out:', event);
//                    done(false);
//                }
//            });
//        }, function (error) {
//            test.addLog('Error: ', error);
//            done(false);            
//        });
//    }, ['nhPushEnabled']));

//    tests.push(new zumo.Test('GCM Push: message', function (test, done) {
//        console.log("Running " + test.name);
//        if (!runTest('android')) {
//            done(true);
//            return;
//        }

//        NativeRegistration(deviceToken).then(function () {
//            return SendNotification(deviceToken, { 'data': {'message' : 'MSFT'} }, 'gcm');
//        }).then(function () {
//            waitForNotification(waitTime, function(event) {
//                if (event && event.message && event.message == 'MSFT') {
//                    test.addLog('Success: ', event);
//                    done(true);
//                } else {
//                    test.addLog('Push failed or timed out:', event);
//                    done(false);
//                }
//            });
//        }, function (error) {
//            test.addLog('Error: ', error);
//            done(false);            
//        });
//    }, ['nhPushEnabled']));

//    tests.push(new zumo.Test('GCM Push: non-ASCII characters', function (test, done) {
//        console.log("Running " + test.name);
//        if (!runTest('android')) {
//            done(true);
//            return;
//        }

//        NativeRegistration(deviceToken).then(function () {
//            return SendNotification(deviceToken, { 'data': {'non-ASCII':'Latin-ãéìôü ÇñÑ, arabic-لكتاب على الطاولة, chinese-这本书在桌子上'} }, 'gcm');
//        }).then(function () {
//            waitForNotification(waitTime, function(event) {
//                console.log('event: ' + JSON.stringify(event));                
//                if (event && event.payload && event.payload['non-ASCII'] && 
//                    event.payload['non-ASCII'] == 'Latin-ãéìôü ÇñÑ, arabic-لكتاب على الطاولة, chinese-这本书在桌子上') {
//                    test.addLog('Success: ', event);
//                    done(true);
//                } else {
//                    test.addLog('Push failed or timed out:', event);
//                    done(false);
//                }
//            });
//        }, function (error) {
//            test.addLog('Error: ', error);
//            done(false);            
//        });
//    }, ['nhPushEnabled']));

//    // Template

//    tests.push(new zumo.Test('Template alert', function (test, done) {
//        console.log("Running " + test.name);
//        if (!runTest('')) {
//            done(true);
//            return;
//        }

//        TemplateRegistration(deviceToken).then(function () {
//            return SendNotification(deviceToken, {'News_French':'Bonjour', 'News_English':'Hello'}, 'template');
//        }).then(function () {
//            waitForNotification(waitTime, function(event) {
//                if (event && (
//                    (event.alert && event.alert == 'Bonjour') /* iOS */ || 
//                    (event.message && event.message == 'Bonjour')  /* Android */)) {
//                    test.addLog('Success: ', event);
//                    done(true);
//                } else {
//                    test.addLog('Push failed or timed out:', event);
//                    done(false);
//                }
//            });
//        }, function (error) {
//            test.addLog('Error: ', error);
//            done(false);            
//        });
//    }, ['nhPushEnabled']));

//    // unregister tests

//    tests.push(new zumo.Test('Unregister native', function (test, done) {
//        console.log("Running " + test.name);

//        if (!runTest('')) {
//            done(true);
//            return;
//        }

//        NativeUnregister().then(function () {
//            console.log('Success');
//            test.addLog('Success');
//            done(true);
//        }, function (error) {
//            console.log('Error' + error);            
//            test.addLog('Error: ', error);
//            done(false);
//        });
//    }, ['nhPushEnabled']));

//    tests.push(new zumo.Test('Unregister template', function (test, done) {
//        console.log("Running " + test.name);
//        if (!runTest('')) {
//            done(true);
//            return;
//        }

//        TemplateUnregister(templateName).then(function () {
//            test.addLog('Success');
//            done(true);
//        }, function (error) {
//            console.log('Error' + error);
//            done(false);
//        });
//    }, ['nhPushEnabled']));

//    return {
//        name: 'Push',
//        tests: tests
//    };

//    function GetDeviceToken(test, callback) {
//        // If we already have a token return it
//        if (deviceToken) {
//            callback(null, deviceToken);
//            return;
//        }

//        // Ask for a token instead
//        if (device.platform == 'iOS') {
//            var pushNotification = window.plugins.pushNotification;

//            // Register with APNS for iOS apps.         
//            pushNotification.register(
//                function (newDeviceToken) {                    
//                    test.addLog('APNS Result: ', newDeviceToken);
//                    deviceToken = newDeviceToken;
//                    callback(null, newDeviceToken);
//                }, callback, {
//                    "badge":"true",
//                    "sound":"true",
//                    "alert":"true",
//                    "ecb": "onPushNotification"
//                });
//        } else { //if (device.platform.toLowerCase() == 'android') {


//        }
//    }

//    function NativeRegistration(pushHandle) {
//        var push = zumo.getClient().push;

//        console.log('registering ' + pushHandle.substr(0, 100));
//        if (device.platform == 'iOS') {
//            return push.apns.registerNative(pushHandle, [pushHandle.substr(0, 100)]);            
//        } else { //if (device.platform.toLowerCase() == 'android') {
//            return push.gcm.registerNative(pushHandle, [pushHandle.substr(0, 100)]);
//        }
//    }

//    function NativeUnregister(pushHandle) {
//        var push = zumo.getClient().push;
//        if (device.platform == 'iOS') {
//            return push.apns.unregisterNative();            
//        } else { //if (device.platform.toLowerCase() == 'android') {
//            return push.gcm.unregisterNative();
//        }
//    }

//    function TemplateRegistration(pushHandle) {
//        var push = zumo.getClient().push;

//        if (device.platform == 'iOS') {
//            return push.apns.registerTemplate(pushHandle, 'myPushTemplate', { aps: { alert: '$(News_French)' } }, null, ['World']);            
//        } else {
//            return push.gcm.registerTemplate(pushHandle, 'myPushTemplate', '{"data":{"message":"$(News_French)"}}', ['World']);
//        }
//    }

//    function TemplateUnregister(templateName) {
//        var push = zumo.getClient().push;

//        if (device.platform == 'iOS') {
//            return push.apns.unregisterTemplate(templateName);            
//        } else {
//            return push.gcm.unregisterTemplate(templateName);            
//        }
//    }

//    function SendNotification(pushHandle, payload, type) {
//        var item = {
//                method: 'send',
//                payload: payload,
//                token: pushHandle,
//                type: type || 'apns',
//                tag: 'World'
//            };

//        pushNotificationQueue = [];
//        return zumo.getClient().invokeApi('push', { body: item });
//    }

//    function waitForNotification(timeout, timeAfterPush, continuation) {
//        /// <param name="timeout" type="Number">Time to wait for push notification in milliseconds</param>
//        /// <param name="timeAfterPush" type="Number">Time to sleep after a push is received. Used to prevent
//        ///            blasting the push notification service.</param>
//        /// <param name="continuation" type="function(Object)">Function called when the timeout expires.
//        ///            If there was a push notification, it will be passed; otherwise null will be passed
//        ///            to the function.</param>
//        if (typeof timeAfterPush === 'function') {
//            continuation = timeAfterPush;
//            timeAfterPush = 3000; // default to 3 seconds
//        }

//        var start = Date.now(),
//            waitForPush = function () {
//                var now = Date.now();
//                if (pushNotificationQueue.length > 0) {
//                    var notification = pushNotificationQueue.pop();
//                    setTimeout(function () {
//                        continuation(notification);
//                    }, timeAfterPush);
//                } else {
//                    if ((now - start) > timeout) {
//                        continuation(null); // Timed out
//                    } else {
//                        setTimeout(waitForPush, 500); // try it again in 500ms
//                    }
//                }
//            };

//        waitForPush();
//    }

//    function runTest(platform) {
//        // This is a short term hack as the current implementation of tags
//        // does not allow an or expression, nor does it allow for client
//        // level information to be in it without some rework to the framework

//        if (!device || !device.platform) {
//            console.log('no device or platform defined');
//            return false;
//        }

//        if (platform === '') {
//            return true;
//        }

//        if (platform.toLowerCase() == device.platform.toLowerCase()) {
//            // Add in simulator check if iOS?
//            if (device.platform == 'iOS') { 
//                // Check if on simulator
//                // return false;
//            }

//            return true;
//        }

//        console.log('Not a match: ' + platform + ' == ' + device.platform);
//    }

//    function initializePush(forceInitialize) {

//        if (forceInitialize || !pushNotification) {
//            pushNotification = PushNotification.init({
//                android: {
//                    senderID: GCM_SENDER_ID
//                },
//                ios: {
//                    alert: "true",
//                    badge: "true",
//                    sound: "true"
//                },
//                windows: {}
//            });

//            pushNotification.on('registration', function (data) {
//                test.addLog('Registration ID: ', data.registrationId);
//                registrationId = data.registrationId;
//                if (onPushNotification) {
//                    onPushNotification('push initialized');
//                }
//            });

//            pushNotification.on('notification', function (data) {
//                if (onPushNotification) {
//                    onPushNotification(data);
//                }
//            });

//            pushNotification.on('error', function (error) {
//                if (onPushError) {
//                    onPushError(error);
//                }
//            });
//        }

//    }

//    function registrationSuccess () {
//        pushNotificationQueue.push({
//            data: 'registration successful'
//        });
//    }

//    function registrationError (error) {
//        pushNotificationQueue.push({
//            error: 'registration failure'
//        })
//    }

//    return {
//        name: 'Push',
//        tests: tests
//    };
//}

//zumo.tests.push = definePushTestsNamespace();
