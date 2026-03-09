let subscriptions = [];
let allVideos = [];

async function loadUserProfile() {
    try {
        if (localStorage.getItem('youtube_quota_exceeded') === 'true') {
            showError('YouTube API quota exceeded for today. Please try again tomorrow.');
            return;
        }

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
            console.error('API Error Response:', response.status, errorData);

            if (response.status === 403 && errorData.includes('quotaExceeded')) {
                localStorage.setItem('youtube_quota_exceeded', 'true');
                showError('YouTube API quota exceeded for today. Please try again tomorrow.');
                return;
            }

            throw new Error(`API request failed with status ${response.status}: ${errorData}`);
        }

        const data = await response.json();

        if (data.items && data.items.length > 0) {
            const channel = data.items[0].snippet;
            const userInfoHtml = `
                <img src="${channel.thumbnails.default.url}" alt="Profile">
                <div class="user-details">
                    <h3>${escapeHtml(channel.title)}</h3>
                    <p>Connected to YouTube</p>
                </div>
            `;
            document.getElementById('userInfo').innerHTML = userInfoHtml;
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

async function loadSubscriptions() {
    if (!accessToken) {
        showError('Please sign in first');
        return;
    }

    showLoading(true, 'Loading subscriptions...');

    try {
        let subs = getCacheData(CACHE_KEYS.SUBSCRIPTIONS);

        if (!subs) {
            subs = await getSubscriptions();
            setCacheData(CACHE_KEYS.SUBSCRIPTIONS, subs);
        }

        console.log('Loaded subscriptions:', subs);

        updateChannelFilter(subs);

        localStorage.setItem(CACHE_KEYS.LAST_UPDATED, Date.now().toString());

        const wasCached = subs.length > 0;
        updateCacheInfo(wasCached, 'subscriptions');

        showLoading(false);
        if (wasCached) {
            showSuccess(`Loaded ${subs.length} subscriptions from cache`);
        }

    } catch (error) {
        console.error('Error loading subscriptions:', error);
        showError('Failed to load subscriptions: ' + error.message);
        showLoading(false);
    }
}

async function getSubscriptions() {
    const subs = [];
    let pageToken = '';

    do {
        const url = `https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&fields=items%2Fsnippet%2FresourceId%2FchannelId%2Citems%2Fsnippet%2Ftitle%2Citems%2Fsnippet%2Fthumbnails%2Fdefault%2CnextPageToken&mine=true&maxResults=50${pageToken ? '&pageToken=' + pageToken : ''}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch subscriptions. Please check your OAuth setup.');
        }

        const data = await response.json();

        if (data.items) {
            subs.push(...data.items.map(item => ({
                channelId: item.snippet.resourceId.channelId,
                channelTitle: item.snippet.title,
                channelThumbnail: item.snippet.thumbnails.default.url
            })));
        }

        pageToken = data.nextPageToken || '';
    } while (pageToken);

    window.subscriptions = subs;
    return subs;
}

async function loadSubscriptionVideos(forceRefresh = false) {
    if (!accessToken) {
        showError('Please sign in first');
        return;
    }

    console.log('Loading subscription videos...');
    console.log('Current allVideos:', allVideos);
    console.log('Force refresh:', forceRefresh);

    const isValid = await validateAccessToken();
    if (!isValid) {
        showError('Session expired. Please sign in again.');
        signOut();
        return;
    }

    hideError();
    showLoading(true, forceRefresh ? 'Refreshing your subscriptions...' : 'Loading your subscriptions...');
    document.getElementById('videos').innerHTML = '';
    document.getElementById('stats').style.display = 'none';

    let cachedVideos = null;
    if (!forceRefresh) {
        cachedVideos = getAllCachedVideos();
    } else {
        console.log('Force refresh: bypassing cache');
    }

    if (cachedVideos && !forceRefresh && cachedVideos.length > 0) {
        console.log('Using cached videos from all channels:', cachedVideos.length);
        allVideos = cachedVideos;
        const showShorts = document.getElementById('showShorts')?.checked || false;
        const filteredVideos = allVideos.filter(v => showShorts || !v.isShort);
        displayVideos(filteredVideos);
        updateCacheInfo(true, 'videos');
        showLoading(false);
        showSuccess(`Loaded ${cachedVideos.length} videos from cache`);
        return;
    } else if (forceRefresh) {
        console.log('Force refresh: fetching fresh videos');
    } else {
        console.log('No cached videos found, fetching fresh videos');
    }

    try {
        const subs = await getSubscriptions();

        if (subs.length === 0) {
            showError('You have no subscriptions');
            return;
        }

        console.log('Subscriptions fetched:', subs);
        showLoading(true, `Loading videos from ${subs.length} channels...`);

        const maxResults = parseInt(document.getElementById('maxResults').value);
        
        let fetchedVideos = await getVideosFromRSSFeed(subs, maxResults);
        
        if (fetchedVideos.length === 0) {
            console.log('RSS feed returned no videos, falling back to API...');
            fetchedVideos = await getVideosFromSubscriptions(subs, maxResults);
        }

        if (fetchedVideos.length === 0) {
            showError('No videos found from your subscriptions');
            return;
        }

        console.log('All videos fetched:', fetchedVideos);
        storeAllVideos(fetchedVideos);

        updateChannelVideoCounts();

        fetchedVideos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

        const showShorts = document.getElementById('showShorts')?.checked || false;
        const filteredVideos = fetchedVideos.filter(v => showShorts || !v.isShort);

        displayVideos(filteredVideos);

        if (!document.getElementById('channelFilter')) {
            createChannelFilterDropdown();
        } else {
            updateChannelDropdown();
        }

        document.getElementById('stats').style.display = 'flex';
        document.getElementById('videoCount').textContent = filteredVideos.length;
        document.getElementById('channelCount').textContent = subs.length;

    } catch (error) {
        console.error('Error:', error);
        showError(`Error: ${error.message}`);
        console.error(error);
    } finally {
        showLoading(false);
    }
}

async function getVideosFromSubscriptions(subscriptions, maxVideosPerChannel = 5) {
    const allVideos = [];
    const batchSize = 5;

    for (let i = 0; i < subscriptions.length; i += batchSize) {
        const batch = subscriptions.slice(i, i + batchSize);

        const batchPromises = batch.map(async (sub) => {
            try {
                const channelResponse = await fetch(
                    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${sub.channelId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`
                        }
                    }
                );

                const channelData = await channelResponse.json();

                if (!channelData.items || channelData.items.length === 0) {
                    return [];
                }

                const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

                const videosResponse = await fetch(
                    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&fields=items%2Fsnippet%2FresourceId%2FvideoId%2Citems%2Fsnippet%2Ftitle%2Citems%2Fsnippet%2Fdescription%2Citems%2Fsnippet%2Fthumbnails%2Fdefault%2Citems%2Fsnippet%2Fthumbnails%2Fmedium%2Citems%2Fsnippet%2Fthumbnails%2Fhigh%2Citems%2Fsnippet%2FpublishedAt&playlistId=${uploadsPlaylistId}&maxResults=${maxVideosPerChannel}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`
                        }
                    }
                );

                const videosData = await videosResponse.json();

                if (!videosData.items) {
                    return [];
                }

                const channelVideos = videosData.items.map(item => ({
                    videoId: item.snippet.resourceId.videoId,
                    title: item.snippet.title,
                    description: item.snippet.description,
                    thumbnail: item.snippet.thumbnails.high || item.snippet.thumbnails.medium,
                    channelTitle: sub.channelTitle,
                    channelThumbnail: sub.channelThumbnail,
                    publishedAt: item.snippet.publishedAt,
                    channelId: sub.channelId
                }));

                setChannelVideosCache(sub.channelId, sub.channelTitle, channelVideos);
                console.log(`Cached ${channelVideos.length} videos for channel: ${sub.channelTitle}`);

                return channelVideos;
            } catch (error) {
                console.error(`Error fetching videos for ${sub.channelTitle}:`, error);
                return [];
            }
        });

        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(videos => allVideos.push(...videos));

        showLoading(true, `Loaded videos from ${Math.min(i + batchSize, subscriptions.length)} / ${subscriptions.length} channels...`);
    }

    console.log(`Total videos fetched: ${allVideos.length}`);
    return allVideos;
}

async function getVideosFromRSSFeed(subscriptions, maxVideosPerChannel = 10) {
    const allVideos = [];

    for (let i = 0; i < subscriptions.length; i++) {
        const sub = subscriptions[i];
        try {
            const apiUrl = `/api/rss?channel_id=${sub.channelId}`;
            const response = await fetch(apiUrl);

            if (!response.ok) {
                console.log(`RSS feed not available for ${sub.channelTitle}, trying API...`);
                continue;
            }

            const data = await response.json();

            if (data.error) {
                console.log(`RSS error for ${sub.channelTitle}:`, data.error);
                continue;
            }

            const channelVideos = data.videos.slice(0, maxVideosPerChannel).map(video => ({
                videoId: video.videoId,
                title: video.title,
                description: video.description,
                thumbnail: { url: video.thumbnail || `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg` },
                channelTitle: sub.channelTitle,
                channelThumbnail: sub.channelThumbnail,
                publishedAt: video.publishedAt,
                channelId: sub.channelId,
                isShort: video.isShort
            }));

            if (channelVideos.length > 0) {
                setChannelVideosCache(sub.channelId, sub.channelTitle, channelVideos);
                allVideos.push(...channelVideos);
                console.log(`RSS: Cached ${channelVideos.length} videos for ${sub.channelTitle}`);
            }

            showLoading(true, `Loaded videos from ${i + 1} / ${subscriptions.length} channels...`);
        } catch (error) {
            console.error(`Error fetching RSS for ${sub.channelTitle}:`, error);
        }
    }

    console.log(`Total videos from RSS: ${allVideos.length}`);
    return allVideos;
}

function storeAllVideos(videos) {
    allVideos = videos;
}

function getAllVideos() {
    console.log('Getting all videos:', allVideos);
    return allVideos;
}
