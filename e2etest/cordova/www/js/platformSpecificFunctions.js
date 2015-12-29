// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

function createPlatformSpecificFunctions() {

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
    } else {
        alertFunction = function (text, done) {
            window.alert(text);
            if (done) {
                done();
            }
        };
    }

    var saveAppInfo = function (lastAppUrl) {
        /// <param name="lastAppUrl" type="String">The last value used in the application URL text box</param>
        var state = {
            lastAppUrl: lastAppUrl
        };
    };

    return {
        alert: alertFunction,
        saveAppInfo: saveAppInfo,
        IsHTMLApplication: true,
    };
}

var testPlatform = createPlatformSpecificFunctions();
