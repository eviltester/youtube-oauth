function displayVideos(videos) {
    const container = document.getElementById('videos');
    container.innerHTML = '';

    videos.forEach(video => {
        const videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
        const channelUrl = `https://www.youtube.com/channel/${video.channelId}`;
        const thumbnailUrl = (
            typeof video.thumbnail === 'string'
                ? video.thumbnail
                : video.thumbnail?.url
        ) || `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;

        const videoCard = document.createElement('div');
        videoCard.className = 'video-card';
        videoCard.innerHTML = `
            <div class="thumbnail-container" onclick="openVideo('${videoUrl}')">
                <img src="${thumbnailUrl}" alt="${escapeHtml(video.title)}">
            </div>
            <div class="video-info">
                <div class="video-title">${escapeHtml(video.title)}</div>
                <div class="video-channel">
                    <img src="${video.channelThumbnail}" alt="${escapeHtml(video.channelTitle)}" class="channel-avatar">
                    ${escapeHtml(video.channelTitle)}
                </div>
                <div class="video-description">${escapeHtml(video.description || 'No description available')}</div>
                <div class="video-meta">${formatDate(video.publishedAt)}</div>
                <div class="video-meta">
                    <a href="#" onclick="copyToClipboard('${videoUrl}', this); return false;" style="font-size: 13px; color: #0066cc; margin-right: 10px; cursor: pointer;">
                        📋 Copy Link
                    </a>
                    <a href="${videoUrl}" target="_blank" style="font-size: 13px; color: #0066cc; margin-right: 10px;">
                        🎬 View Video
                    </a>
                    <a href="${channelUrl}" target="_blank" style="font-size: 13px; color: #0066cc; margin-right: 10px;">
                        📍 View Channel
                    </a>
                    <a href="https://youtubetotranscript.com/transcript?v=${video.videoId}" target="_blank" style="font-size: 13px; color: #0066cc; margin-right: 10px;">
                        📝 youtubetoTranscript
                    </a>
                    <a href="https://vcyon.com/videos?videoId=${video.videoId}" target="_blank" style="font-size: 13px; color: #0066cc; margin-right: 10px;">
                        📝 vycon
                    </a>
                    <a href="https://notegpt.io/youtube-transcript-generator" target="_blank" style="font-size: 13px; color: #0066cc; margin-right: 10px;">
                        Notegpt.io
                    </a>
                    <a href="https://decopy.ai/youtube-transcript-generator/" target="_blank" style="font-size: 13px; color: #0066cc;">
                        Decopy.ai
                    </a>
                </div>
            </div>
        `;

        container.appendChild(videoCard);
    });
}

function openVideo(url) {
    window.open(url, '_blank');
}

async function copyToClipboard(text, linkElement) {
    try {
        await navigator.clipboard.writeText(text);
        const originalText = linkElement.innerHTML;
        linkElement.innerHTML = '✓ Copied';
        setTimeout(() => {
            linkElement.innerHTML = originalText;
        }, 500);
    } catch (err) {
        console.error('Failed to copy:', err);
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        if (diffHours === 0) {
            const diffMinutes = Math.floor(diffTime / (1000 * 60));
            return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
        }
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else {
        return `${diffDays} days ago`;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.innerHTML = message;
    errorDiv.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideError() {
    document.getElementById('error').style.display = 'none';
}

function showLoading(show, text = 'Loading videos...') {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
    if (show && text) {
        document.getElementById('loadingText').textContent = text;
    }
}

function showSuccess(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.className = 'success';
    errorDiv.style.display = 'block';

    setTimeout(() => {
        errorDiv.style.display = 'none';
        errorDiv.className = 'error';
    }, 3000);
}

function updateCacheInfo(isCached, type) {
    const cacheInfo = document.getElementById('cacheInfo');
    const cacheStatus = document.getElementById('cacheStatus');

    if (isCached) {
        cacheStatus.textContent = `📦 Using cached ${type}`;
        cacheInfo.style.display = 'block';
    } else {
        cacheStatus.textContent = `🔄 Fresh ${type} loaded`;
        cacheInfo.style.display = 'block';

        setTimeout(() => {
            cacheInfo.style.display = 'none';
        }, 3000);
    }
}
