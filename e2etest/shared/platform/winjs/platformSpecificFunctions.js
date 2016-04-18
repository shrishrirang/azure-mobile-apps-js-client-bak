// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

function createPlatformSpecificFunctions() {

    function getAppConfig() {
        var def = $.Deferred();
        def.resolve({});
        return def.Promise();
    }

    var alertFunction;
    if (typeof alert === 'undefined') {
        alertFunction = function (text, done) {
            var dialog = new Windows.UI.Popups.MessageDialog(text);
            dialog.showAsync().done(function () {
                if (typeof done === 'function') {
                    done();
                }
            });
        }
    }

    var saveAppInfo = function (lastAppUrl) {
        /// <param name="lastAppUrl" type="String">The last value used in the application URL text box</param>
        var state = {
            lastAppUrl: lastAppUrl
        };

        WinJS.Application.local.writeText('savedAppInfo.txt', JSON.stringify(state));
    }

    function getPushChannel() {
        return Windows.Networking.PushNotifications.PushNotificationChannelManager.createPushNotificationChannelForApplicationAsync();
    }

    return {
        alert: alertFunction,
        saveAppInfo: saveAppInfo,
        IsHTMLApplication: false,
        getAppConfig: getAppConfig,
        getPushChannel: getPushChannel
    };
}

var testPlatform = createPlatformSpecificFunctions();
