window.onload = function() {
    console.log('Page loaded');
    console.log('CLIENT_ID from localStorage:', CLIENT_ID);
    console.log('typeof google:', typeof google);

    const authCookie = getCookieObject();
    if (authCookie && authCookie.access_token) {
        console.log('Found auth cookie, validating token...');
        accessToken = authCookie.access_token;

        validateAccessToken().then(isValid => {
            if (isValid) {
                console.log('Token is valid, proceeding with auto-login');
                onAuthSuccess();
            } else {
                console.log('Token is invalid, clearing cookie');
                deleteCookie('youtube_auth');
                initializeGIS();
            }
        }).catch(error => {
            console.log('Token validation failed:', error);
            deleteCookie('youtube_auth');
            initializeGIS();
        });
    } else {
        console.log('No valid auth cookie found');
        if (CLIENT_ID) {
            console.log('Client ID found, will initialize GIS');
            setTimeout(() => {
                if (typeof google !== 'undefined') {
                    initializeGIS();
                } else {
                    console.error('Google Identity Services not loaded after timeout');
                    showError('Failed to load Google Identity Services. Please refresh the page.');
                }
            }, 1000);
        } else {
            console.log('No client ID found in localStorage');
        }
    }
};
