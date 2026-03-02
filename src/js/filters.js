let currentChannelFilter = null;
let channelVideoCounts = {};
let channelRecentDates = {};
let currentChannelInfo = null;

function filterVideosByChannel(channelId) {
    if (!channelId || channelId === 'all') {
        return getAllVideos();
    }
    return getAllVideos().filter(video => video.channelId === channelId);
}

function updateChannelVideoCounts() {
    channelVideoCounts = {};
    channelRecentDates = {};
    allVideos.forEach(video => {
        const channelId = video.channelId;
        if (!channelVideoCounts[channelId]) {
            channelVideoCounts[channelId] = 0;
            channelRecentDates[channelId] = video.publishedAt;
        } else {
            const currentRecent = new Date(channelRecentDates[channelId]);
            const videoDate = new Date(video.publishedAt);
            if (videoDate > currentRecent) {
                channelRecentDates[channelId] = video.publishedAt;
            }
        }
        channelVideoCounts[channelId]++;
    });
}

function getChannelVideoCount(channelId) {
    return channelVideoCounts[channelId] || 0;
}

function getChannelRecentDate(channelId) {
    return channelRecentDates[channelId];
}

function formatDateForDropdown(dateString) {
    if (!dateString) return '';

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

function createChannelFilterDropdown() {
    if (document.getElementById('channelFilter')) {
        return;
    }

    const container = document.getElementById('authenticated-view');
    const dropdown = document.createElement('div');
    dropdown.className = 'filter-group';
    dropdown.innerHTML = `
        <label for="channelFilter">Filter by channel:</label>
        <select id="channelFilter" onchange="handleChannelFilterChange()">
            <option value="all" selected>All channels</option>
            ${window.subscriptions.map(sub => {
                const count = getChannelVideoCount(sub.channelId);
                const date = getChannelRecentDate(sub.channelId);
                const countText = count > 0 ? ` (${count})` : '';
                const dateText = date ? ` - ${formatDateForDropdown(date)}` : '';
                return `<option value="${sub.channelId}">${escapeHtml(sub.channelTitle)}${countText}${dateText}</option>`;
            }).join('')}
        </select>
    `;
    container.insertBefore(dropdown, container.querySelector('.button.secondary'));
}

function updateChannelDropdown() {
    const select = document.getElementById('channelFilter');
    if (!select) return;

    const options = select.querySelectorAll('option');
    options.forEach(option => {
        if (option.value !== 'all') {
            const channelId = option.value;
            const count = getChannelVideoCount(channelId);
            const date = getChannelRecentDate(channelId);

            const currentText = option.textContent;
            const cleanedText = currentText.replace(/ \(\d+\) - [^\(]+\)$/, '');

            const countText = count > 0 ? ` (${count})` : '';
            const dateText = date ? ` - ${formatDateForDropdown(date)}` : '';
            option.textContent = cleanedText + countText + dateText;
        }
    });
}

function updateChannelFilter(subs) {
    currentChannelFilter = 'all';

    window.subscriptions = subs || [];

    if (!document.getElementById('channelFilter')) {
        createChannelFilterDropdown();
    } else {
        updateChannelDropdown();
    }

    handleChannelFilterChange();
}

function createChannelHeader(channelId) {
    const channel = window.subscriptions.find(sub => sub.channelId === channelId);
    if (!channel) return null;

    const channelHeader = document.createElement('div');
    channelHeader.className = 'channel-header';
    channelHeader.innerHTML = `
        <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin-bottom: 20px; border-left: 4px solid #ff0000;">
            <h3 style="margin: 0 0 8px 0; color: #333;">
                <a href="https://www.youtube.com/channel/${channelId}" target="_blank" style="color: #ff0000; text-decoration: none;">
                    <img src="${channel.channelThumbnail}" alt="${escapeHtml(channel.channelTitle)}" style="width: 36px; height: 36px; border-radius: 50%; vertical-align: middle; margin-right: 10px;">
                    ${escapeHtml(channel.channelTitle)}
                </a>
            </h3>
            <div style="color: #666; font-size: 14px;">
                <a href="https://www.youtube.com/channel/${channelId}" target="_blank" style="color: #0066cc;">
                    📍 View Channel on YouTube
                </a>
            </div>
        </div>
    `;
    return channelHeader;
}

function showChannelHeader(channelId) {
    const container = document.getElementById('videos');
    const existingHeader = container.querySelector('.channel-header');

    if (existingHeader) {
        existingHeader.remove();
    }

    const header = createChannelHeader(channelId);
    if (header) {
        container.insertBefore(header, container.firstChild);
        currentChannelInfo = {
            channelId: channelId,
            channelName: header.querySelector('h3 a').textContent.trim()
        };
    }
}

function hideChannelHeader() {
    const container = document.getElementById('videos');
    const existingHeader = container.querySelector('.channel-header');
    if (existingHeader) {
        existingHeader.remove();
    }
    currentChannelInfo = null;
}

function handleChannelFilterChange() {
    const select = document.getElementById('channelFilter');
    const channelId = select.value;
    currentChannelFilter = channelId;

    console.log('Channel filter changed:', channelId);
    console.log('Current allVideos:', allVideos);

    const filteredVideos = filterVideosByChannel(channelId);
    console.log('Filtered videos:', filteredVideos);

    const showShorts = document.getElementById('showShorts')?.checked || false;
    const finalVideos = filteredVideos.filter(v => showShorts || !v.isShort);

    displayVideos(finalVideos);

    document.getElementById('videoCount').textContent = finalVideos.length;
    document.getElementById('channelCount').textContent =
        channelId === 'all' ? window.subscriptions.length : 1;

    updateChannelDropdown();

    if (channelId !== 'all') {
        showChannelHeader(channelId);
    } else {
        hideChannelHeader();
    }
}

function handleShortsFilterChange() {
    handleChannelFilterChange();
}
