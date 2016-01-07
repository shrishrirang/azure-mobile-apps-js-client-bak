var name = 'apns';

try {
    
    
function definePushTestsNamespace() {
    var tests = [],
        channelUri,
        notification = {
            type: 'toast',
            payloadWindows: '<?xml version="1.0"?><toast><visual><binding template="ToastText01"><text id="1">hello world2</text></binding></visual></toast>',
        payload: '{"aps":{"alert":"Notification testing"}}'
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
                            window.alert('receiveed : ' + JSON.stringify(data));

                            pushNotificationQueue.push({
                data: data
            });
            receivedNotification.payload = data;
            receivedNotification.notificationType = data.additionalData.
                            pushNotificationReceivedEventArgs.type;

        });

        pushNotification.on('error', function (error) {
            pushNotificationQueue.push({
                error: error
            });
        });
                             

    }));
    
    tests.push(new zumo.Test('ToastPush', function (test, done) {
                             
                             window.alert('test real ' + channel.uri)
                             channelUri = channel.uri;
                             receivedNotification = undefined;
                             
                             zumo.getClient().push.register(name, channelUri)
                             .then(function () {
                                   
                                   window.alert('invoking send api');
                                   return zumo.getClient().invokeApi('push',
                                                                     {
                                                                     body: {
                                                                     method: 'send',
                                                                     type: name,
                                                                     payload: notification.payload,
                                                                     token: 'dummy',
                                                                     wnsType: notification.type
                                                                     }
                                                                     });
                                   
                                   
                                   })
                             .then(function() {
                                   window.alert('invoked');
                                   }, function(error) {
                                   window.alert('error while invoking ' + JSON.stringify(error));
                                   });
                             
                             
                             setTimeout(function () {
                                        
                                        window.alert('unregistering');
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

        zumo.getClient().push.register(name, channelUri)
            .then(function () {
                  window.alert('channelUri : ' + channelUri);
                return zumo.getClient().invokeApi('verifyRegisterInstallationResult', { method: 'GET', parameters: { channelUri: channelUri } });
            })
            .then(function () {
                  window.alert('step1 done');
                return zumo.getClient().push.unregister(channelUri);
            })
            .done(function () {
                done(true);
            }, function (error) {
                  window.alert('error ' + JSON.stringify(error));
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
        return zumo.getClient().push.register(name, channelUri, createTemplates(['foo']))
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

    /*
    tests.push(new zumo.Test('RegisterWithTemplatesAndSecondaryTiles', function (test, done) {

        channelUri = channel.uri;
        return zumo.getClient().push.register(name, channelUri, createTemplates(['bar']), createSecondaryTiles(channelUri, ['foo']))
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
        return zumo.getClient().push.register(name), channelUri)
    .then(function () {
        return zumo.getClient().push.register(name, channelUri, createTemplates(['foo']));
    })
    .then(function () {
        return zumo.getClient().push.register(name, channelUri);
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
*/
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

}
catch(ex) {
    window.alert(JSON.stringify(ex));
}

