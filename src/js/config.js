const CLIENT_ID = localStorage.getItem('youtube_oauth_client_id') || '';
const API_KEY = '';
const SCOPES = 'https://www.googleapis.com/auth/youtube.readonly';

const CACHE_KEYS = {
    SUBSCRIPTIONS: 'youtube_subscriptions_cache',
    VIDEOS: 'youtube_videos_cache',
    CHANNEL_VIDEOS: 'youtube_channel_videos_cache',
    LAST_UPDATED: 'youtube_cache_last_updated'
};

const CACHE_DURATION = 24 * 60 * 60 * 1000;

function updateClientIdSummary() {
    const storedClientId = localStorage.getItem('youtube_oauth_client_id');
    const summaryEl = document.getElementById('clientIdSummary');
    if (storedClientId && storedClientId.length > 15) {
        summaryEl.textContent = 'OAuth 2.0 Client ID: ' + storedClientId.substring(0, 15) + '...';
    } else if (storedClientId) {
        summaryEl.textContent = 'OAuth 2.0 Client ID: ' + storedClientId;
    } else {
        summaryEl.textContent = 'OAuth 2.0 Client ID: (click to expand)';
    }
}

function checkQuotaReset() {
    const lastCheck = localStorage.getItem('quota_last_check');
    const now = new Date().toISOString().split('T')[0];

    if (lastCheck !== now) {
        localStorage.setItem('quota_last_check', now);
        localStorage.setItem('youtube_quota_exceeded', 'false');
    }
}

checkQuotaReset();

if (CLIENT_ID) {
    document.getElementById('clientId').value = CLIENT_ID;
    updateClientIdSummary();
}
