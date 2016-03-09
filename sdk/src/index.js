// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ----------------------------------------------------------------------------

// These exports serve as the JS bundle exports
module.exports = {
    MobileServiceClient: require('./MobileServiceClient').exports,
    MobileServiceLogin: require('./MobileServiceLogin').exports,
    MobileServiceTable: require('./MobileServiceTable').exports
};
