let tokenClient;
let accessToken = null;
let gisInited = false;

function setCookie(name, value, days = 7) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax;Secure`;
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function deleteCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;Secure`;
}

function getCookieObject() {
    const cookie = getCookie('youtube_auth');
    if (cookie) {
        try {
            const authData = JSON.parse(decodeURIComponent(cookie));
            if (Date.now() - authData.timestamp > 7 * 24 * 60 * 60 * 1000) {
                deleteCookie('youtube_auth');
                return null;
            }
            return authData;
        } catch (e) {
            console.error('Error parsing auth cookie:', e);
            return null;
        }
    }
    return null;
}

function initializeGIS() {
    console.log('Initializing GIS with Client ID:', CLIENT_ID);

    if (typeof google === 'undefined') {
        console.error('Google Identity Services library not loaded');
        showError('Google Identity Services library failed to load. Please refresh the page.');
        return;
    }

    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
            console.log('Got token response');
            accessToken = tokenResponse.access_token;
            onAuthSuccess();
        },
    });
    gisInited = true;
    console.log('GIS initialized successfully');
}

function handleAuthClick() {
    console.log('handleAuthClick called');
    const clientId = document.getElementById('clientId').value.trim();
    console.log('Client ID from input:', clientId);

    if (clientId && clientId !== CLIENT_ID) {
        console.log('Client ID changed, saving and reloading');
        localStorage.setItem('youtube_oauth_client_id', clientId);
        updateClientIdSummary();
        location.reload();
        return;
    }

    if (!clientId && !CLIENT_ID) {
        showError('Please enter your OAuth 2.0 Client ID');
        return;
    }

    const authCookie = getCookieObject();
    if (authCookie && authCookie.access_token) {
        accessToken = authCookie.access_token;
        loadSubscriptionVideos();
        return;
    }

    console.log('Triggering authentication');
    authenticate();
}

function authenticate() {
    console.log('authenticate() called');

    if (!CLIENT_ID) {
        showError('Please enter your Client ID first');
        return;
    }

    if (!gisInited) {
        console.log('GIS not initialized, initializing now');
        initializeGIS();
        setTimeout(() => {
            console.log('Requesting access token');
            tokenClient.requestAccessToken({ prompt: 'consent' });
        }, 500);
    } else {
        console.log('Requesting access token');
        tokenClient.requestAccessToken({ prompt: 'consent' });
    }
}

function onAuthSuccess() {
    const authData = {
        access_token: accessToken,
        timestamp: Date.now()
    };
    setCookie('youtube_auth', JSON.stringify(authData), 7);

    document.getElementById('login-view').style.display = 'none';
    document.getElementById('authenticated-view').style.display = 'block';
    document.getElementById('authStatus').style.display = 'block';

    loadUserProfile();
    loadSubscriptions();
    setTimeout(() => loadSubscriptionVideos(), 100);
}

async function validateAccessToken() {
    if (!accessToken) return false;

    if (localStorage.getItem('youtube_quota_exceeded') === 'true') {
        return false;
    }

    try {
        const response = await fetch(
            'https://www.googleapis.com/youtube/v3/channels?part=snippet&fields=items%2Fsnippet%2Ftitle%2Citems%2Fsnippet%2Fthumbnails%2Fdefault&mine=true',
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Token validation failed:', response.status, errorData);

            if (response.status === 403 && errorData.includes('quotaExceeded')) {
                localStorage.setItem('youtube_quota_exceeded', 'true');
                return false;
            }

            return false;
        }

        return true;
    } catch (error) {
        console.error('Token validation failed:', error);
        return false;
    }
}

function signOut() {
    accessToken = null;
    deleteCookie('youtube_auth');
    deleteCookie('youtube_oauth_client_id');
    localStorage.removeItem('youtube_oauth_client_id');
    document.getElementById('clientId').value = '';
    document.getElementById('login-view').style.display = 'block';
    document.getElementById('authenticated-view').style.display = 'none';
    document.getElementById('authStatus').style.display = 'none';
    document.getElementById('videos').innerHTML = '';
    document.getElementById('stats').style.display = 'none';
    hideError();
}
