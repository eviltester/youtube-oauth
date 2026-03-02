function getCacheData(key) {
    try {
        const cached = localStorage.getItem(key);
        if (!cached) {
            console.log(`No cache found for key: ${key}`);
            return null;
        }

        const data = JSON.parse(cached);
        const now = Date.now();

        if (data.timestamp && (now - data.timestamp) > CACHE_DURATION) {
            console.log(`Cache expired for key: ${key}. Age: ${now - data.timestamp}ms, Max: ${CACHE_DURATION}ms`);
            return null;
        }

        console.log(`Cache valid for key: ${key}. Age: ${now - data.timestamp}ms`);
        return data.data;
    } catch (error) {
        console.error('Error reading cache:', error);
        return null;
    }
}

function setCacheData(key, data) {
    try {
        const cacheEntry = {
            data: data,
            timestamp: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(cacheEntry));
        console.log(`Cache set for key: ${key}`, data);
    } catch (error) {
        console.error('Error writing cache:', error);
    }
}

function getChannelCacheKey(channelId, channelTitle) {
    const sanitizedTitle = channelTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    return `${CACHE_KEYS.CHANNEL_VIDEOS}:${channelId}:${sanitizedTitle}`;
}

function getChannelVideosCache(channelId, channelTitle) {
    const cacheKey = getChannelCacheKey(channelId, channelTitle);
    return getCacheData(cacheKey);
}

function setChannelVideosCache(channelId, channelTitle, videos) {
    const cacheKey = getChannelCacheKey(channelId, channelTitle);
    setCacheData(cacheKey, videos);
}

function getAllCachedVideos() {
    const allVideos = [];
    const prefix = CACHE_KEYS.CHANNEL_VIDEOS + ':';

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
            const cached = getCacheData(key);
            if (cached && Array.isArray(cached)) {
                allVideos.push(...cached);
            }
        }
    }

    allVideos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    console.log(`Total cached videos from all channels: ${allVideos.length}`);
    return allVideos;
}

function clearChannelCache(channelId, channelTitle) {
    const cacheKey = getChannelCacheKey(channelId, channelTitle);
    localStorage.removeItem(cacheKey);
    console.log(`Cleared cache for channel: ${channelTitle}`);
}

function clearCache() {
    try {
        Object.values(CACHE_KEYS).forEach(key => {
            localStorage.removeItem(key);
            console.log(`Cleared cache for key: ${key}`);
        });

        const prefix = CACHE_KEYS.CHANNEL_VIDEOS + ':';
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
                localStorage.removeItem(key);
                console.log(`Cleared channel cache for key: ${key}`);
            }
        }

        showSuccess('Cache cleared successfully');
    } catch (error) {
        console.error('Error clearing cache:', error);
        showError('Error clearing cache');
    }
}

function clearAllChannelCaches() {
    try {
        const prefix = CACHE_KEYS.CHANNEL_VIDEOS + ':';
        let clearedCount = 0;

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
                localStorage.removeItem(key);
                console.log(`Cleared channel cache for key: ${key}`);
                clearedCount++;
            }
        }

        showSuccess(`Cleared ${clearedCount} channel caches`);
    } catch (error) {
        console.error('Error clearing channel caches:', error);
        showError('Error clearing channel caches');
    }
}

function isCacheValid() {
    const lastUpdated = localStorage.getItem(CACHE_KEYS.LAST_UPDATED);
    if (!lastUpdated) return false;

    const now = Date.now();
    return (now - parseInt(lastUpdated)) < CACHE_DURATION;
}
