// Catholic Sleep Radio — core audio and UI controller

// Audio state
let audioElement = null; // // Hidden HTML5 audio element for all playback
let hlsPlayer = null; // // hls.js instance for HLS (.m3u8) streams
let currentMode = null; // // 'radio' | 'sleep'
let currentStationMeta = null; // // Active station metadata for UI
let currentSleepType = null; // // Active sleep sound key
let sleepTimers = {}; // // Per-sound sleep timer handles
let allStations = []; // // Full station list for search/filter
let activeStationIndex = -1; // // Index in allStations for skip navigation
let autoSkipCount = 0; // // Consecutive auto-skips when streams fail
const MAX_AUTO_SKIPS = 10; // // Stop skipping after this many failures in a row

// Radio Browser API base URL
const RADIO_BROWSER_API = 'https://de1.api.radio-browser.info/json';

// Verified HTTPS streams — tested and known to work on GitHub Pages
const VERIFIED_STATIONS = [
    {
        name: 'Radio Vaticana English',
        country: 'Vatican',
        url: 'https://radio.vaticannews.va/stream-en',
        codec: 'MP3',
        hls: false,
        verified: true
    },
    {
        name: 'Radio Vaticana Español',
        country: 'Vatican',
        url: 'https://radio.vaticannews.va/stream-es',
        codec: 'MP3',
        hls: false,
        verified: true
    },
    {
        name: 'Radio Vaticana Deutsch',
        country: 'Vatican',
        url: 'https://radio.vaticannews.va/stream-de',
        codec: 'MP3',
        hls: false,
        verified: true
    },
    {
        name: 'EWTN Catholic Radio',
        country: 'USA',
        url: 'https://ewtn-ice.streamguys1.com/english-aac',
        codec: 'AAC',
        hls: false,
        verified: true
    },
    {
        name: 'Relevant Radio',
        country: 'USA',
        url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/RR_MAIN.mp3',
        codec: 'MP3',
        hls: false,
        verified: true
    },
    {
        name: 'Radio Mir — Medjugorje',
        country: 'Bosnia',
        url: 'https://mirm.live/mir.mp3',
        codec: 'MP3',
        hls: false,
        verified: true
    },
    {
        name: 'RCF Radio',
        country: 'France',
        url: 'https://rcf.streamakaci.com/rcfdigital.mp3?platform=site',
        codec: 'MP3',
        hls: false,
        verified: true
    },
    {
        name: 'Radio Courtoisie',
        country: 'France',
        url: 'https://ice.creacast.com/radio-courtoisie',
        codec: 'MP3',
        hls: false,
        verified: true
    },
    {
        name: 'Classical Catholic Radio',
        country: 'USA',
        url: 'https://streaming.live365.com/a64105',
        codec: 'MP3',
        hls: false,
        verified: true
    },
    {
        name: 'CIRA-FM Radio Ville Marie',
        country: 'Canada',
        url: 'https://s5.radio.co/sec326ff8a/listen',
        codec: 'MP3',
        hls: false,
        verified: true
    },
    {
        name: 'Radio María España',
        country: 'Spain',
        url: 'https://dreamsiteradiocp4.com/proxy/rmspain1?mp=/stream/1/',
        codec: 'MP3',
        hls: false,
        verified: true
    },
    {
        name: 'Rádio Catedral 106.7 FM',
        country: 'Brazil',
        url: 'https://hts04.brascast.com:13728/stream',
        codec: 'AAC',
        hls: false,
        verified: true
    }
];

// Sleep sounds — verified Mixkit CDN URLs (Pixabay was returning 403)
const sleepSounds = {
    gregorian: {
        name: 'Gregorian Chant',
        url: 'https://assets.mixkit.co/active_storage/sfx/1210/1210-preview.mp3',
        description: 'Peaceful monastic ambient tones',
        icon: '🎵'
    },
    bells: {
        name: 'Church Bells',
        url: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
        description: 'Distant cathedral bell chimes',
        icon: '🔔'
    },
    rain: {
        name: 'Rain & Ambience',
        url: 'https://assets.mixkit.co/active_storage/sfx/2390/2390-preview.mp3',
        description: 'Gentle rainfall atmosphere',
        icon: '🌧️'
    },
    ocean: {
        name: 'Ocean Waves',
        url: 'https://assets.mixkit.co/active_storage/sfx/1717/1717-preview.mp3',
        description: 'Calming coastal wave sounds',
        icon: '🌊'
    },
    night: {
        name: 'Night Crickets',
        url: 'https://assets.mixkit.co/active_storage/sfx/2432/2432-preview.mp3',
        description: 'Serene evening nature ambience',
        icon: '🌙'
    }
};

// DOM references — cached after DOMContentLoaded
const ui = {};

// Initialize application once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    cacheDomElements();
    createAudioElement();
    initTheme();
    bindControls();
    renderSleepSounds();
    fetchCatholicStations();
    updateClock();
    setInterval(updateClock, 1000);
});

// Cache frequently used DOM nodes
function cacheDomElements() {
    ui.currentStation = document.getElementById('currentStation');
    ui.stationMeta = document.getElementById('stationMeta');
    ui.playPauseButton = document.getElementById('playPauseButton');
    ui.prevButton = document.getElementById('prevButton');
    ui.nextButton = document.getElementById('nextButton');
    ui.volumeControl = document.getElementById('volumeControl');
    ui.volumeValue = document.getElementById('volumeValue');
    ui.stationsGrid = document.getElementById('prayerList');
    ui.stationSearch = document.getElementById('stationSearch');
    ui.stationCount = document.getElementById('stationCount');
    ui.statusBadge = document.getElementById('statusBadge');
    ui.visualizer = document.getElementById('visualizer');
    ui.sleepGrid = document.getElementById('sleepGrid');
    ui.timerDisplay = document.getElementById('timerDisplay');
    ui.liveClock = document.getElementById('liveClock');
    ui.loadingOverlay = document.getElementById('loadingOverlay');
    ui.themeToggle = document.getElementById('themeToggle');
}

// Initialize dark / light theme toggle
function initTheme() {
    if (!ui.themeToggle) {
        return;
    }
    updateThemeToggleLabel();
    ui.themeToggle.addEventListener('click', toggleTheme);
}

// Switch between light and night (dark) mode
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('csr-theme', next);
    updateThemeToggleLabel();
}

// Update theme toggle button label for current mode
function updateThemeToggleLabel() {
    if (!ui.themeToggle) {
        return;
    }
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const label = ui.themeToggle.querySelector('.theme-label');
    if (label) {
        label.textContent = isDark ? 'Light Mode' : 'Night Mode';
    }
}

// Create hidden audio element used for all playback
function createAudioElement() {
    audioElement = document.createElement('audio');
    audioElement.id = 'hiddenAudio';
    audioElement.preload = 'none';
    audioElement.setAttribute('playsinline', ''); // // Required for iOS playback
    audioElement.style.display = 'none';
    document.body.appendChild(audioElement);

    audioElement.addEventListener('playing', onAudioPlaying);
    audioElement.addEventListener('pause', onAudioPaused);
    audioElement.addEventListener('waiting', onAudioWaiting);
    audioElement.addEventListener('error', onAudioError);
    audioElement.addEventListener('ended', onAudioEnded);
}

// Wire up player and search controls
function bindControls() {
    ui.playPauseButton.addEventListener('click', togglePlayPause);
    ui.prevButton.addEventListener('click', () => skipStation(-1));
    ui.nextButton.addEventListener('click', () => skipStation(1));

    ui.volumeControl.addEventListener('input', (event) => {
        const volume = parseFloat(event.target.value);
        if (audioElement) {
            audioElement.volume = volume;
        }
        ui.volumeValue.textContent = `${Math.round(volume * 100)}%`;
    });

    ui.stationSearch.addEventListener('input', (event) => {
        renderStationGrid(filterStations(event.target.value.trim()));
    });

    // Default volume
    ui.volumeControl.value = 0.5;
    ui.volumeValue.textContent = '50%';
}

// Live clock in header
function updateClock() {
    if (!ui.liveClock) {
        return;
    }
    const now = new Date();
    ui.liveClock.textContent = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Fetch stations from multiple API queries and merge results
async function fetchCatholicStations() {
    showStationLoading(true);
    setStatus('scanning', 'Tuning in...');

    const apiQueries = [
        `${RADIO_BROWSER_API}/stations/search?tag=catholic&limit=40&order=clickcount&reverse=true`,
        `${RADIO_BROWSER_API}/stations/search?tag=religious&limit=25&order=votes&reverse=true`,
        `${RADIO_BROWSER_API}/stations/byname/vatican?limit=10`,
        `${RADIO_BROWSER_API}/stations/byname/ewtn?limit=10`,
        `${RADIO_BROWSER_API}/stations/byname/maria?limit=15&order=clickcount&reverse=true`
    ];

    let merged = [];

    for (const queryUrl of apiQueries) {
        try {
            const response = await fetch(queryUrl);
            if (!response.ok) {
                continue;
            }
            const batch = await response.json();
            merged = merged.concat(batch);
        } catch (error) {
            console.error('Station query failed:', queryUrl, error);
        }
    }

    // Normalize, dedupe, and filter playable streams — verified list always included
    allStations = normalizeStations(merged);

    if (allStations.length === 0) {
        allStations = VERIFIED_STATIONS.map((station) => ({ ...station }));
        setStatus('fallback', 'Using verified stations');
    } else {
        const verifiedCount = allStations.filter((s) => s.verified).length;
        setStatus('online', `${allStations.length} stations · ${verifiedCount} verified`);
    }

    renderStationGrid(allStations);
    showStationLoading(false);
    ui.stationCount.textContent = `${allStations.length} Stations`;
}

// Normalize raw API records — verified stations first, only native HTTPS URLs
function normalizeStations(rawStations) {
    const seenUrls = new Set();
    const normalized = [];

    // Always pin tested working stations to the top
    for (const station of VERIFIED_STATIONS) {
        seenUrls.add(station.url);
        normalized.push({ ...station });
    }

    for (const station of rawStations) {
        const streamUrl = resolveStreamUrl(station);
        if (!streamUrl || seenUrls.has(streamUrl)) {
            continue;
        }

        // Skip stations the API marks as offline
        if (station.lastcheckok === 0) {
            continue;
        }

        // Skip HLS/IPTV — unreliable without dedicated video player
        if (station.hls === 1 || streamUrl.includes('.m3u8')) {
            continue;
        }

        // Skip known broken or blocked stream patterns
        if (isBlockedStreamUrl(streamUrl)) {
            continue;
        }

        seenUrls.add(streamUrl);
        normalized.push({
            name: (station.name || 'Unknown Station').trim(),
            country: station.country || station.state || 'International',
            url: streamUrl,
            codec: station.codec || guessCodec(streamUrl),
            hls: false,
            votes: station.votes || station.clickcount || 0,
            favicon: station.favicon || '',
            verified: false
        });
    }

    // Verified first, then sort by popularity
    normalized.sort((a, b) => {
        if (a.verified !== b.verified) {
            return a.verified ? -1 : 1;
        }
        return (b.votes || 0) - (a.votes || 0);
    });

    return normalized;
}

// Block stream URLs known to fail on HTTPS or in browsers
function isBlockedStreamUrl(url) {
    const blockedPatterns = [
        /stream\.zeno\.fm/i, // // Often returns 401 without auth token
        /dreamsiteradiocp\d*\.com:\d+/i, // // Port-based HTTP servers — HTTPS upgrade fails
        /\/login\/index\.php/i // // Login pages, not audio streams
    ];
    return blockedPatterns.some((pattern) => pattern.test(url));
}

// Only accept natively HTTPS URLs — never fake-upgrade HTTP (breaks most streams)
function resolveStreamUrl(station) {
    const resolved = (station.url_resolved || '').trim();
    const original = (station.url || '').trim();

    // Prefer resolved URL when it is natively HTTPS
    if (resolved.startsWith('https://')) {
        return resolved;
    }

    // Fall back to original only if also natively HTTPS
    if (original.startsWith('https://')) {
        return original;
    }

    // HTTP-only streams are blocked by GitHub Pages mixed-content policy
    return null;
}

// Guess codec label from URL extension
function guessCodec(url) {
    if (url.includes('.m3u8')) {
        return 'HLS';
    }
    if (url.includes('aac')) {
        return 'AAC';
    }
    return 'MP3';
}

// Filter stations by search term
function filterStations(term) {
    if (!term) {
        return allStations;
    }
    const lower = term.toLowerCase();
    return allStations.filter((station) =>
        station.name.toLowerCase().includes(lower) ||
        station.country.toLowerCase().includes(lower) ||
        station.codec.toLowerCase().includes(lower)
    );
}

// Render station buttons into grid
function renderStationGrid(stations) {
    ui.stationsGrid.innerHTML = '';

    if (stations.length === 0) {
        ui.stationsGrid.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📡</span>
                <p>No stations match your search.</p>
            </div>
        `;
        return;
    }

    stations.forEach((station) => {
        const globalIndex = allStations.indexOf(station);
        const button = document.createElement('button');
        button.className = 'station-btn';
        button.dataset.index = globalIndex;
        button.innerHTML = `
            <div class="station-top">
                <span class="live-dot"></span>
                <span class="station-codec">${station.verified ? '✓ ' : ''}${station.codec}</span>
            </div>
            <span class="station-name">${escapeHtml(station.name)}</span>
            <span class="station-desc">${escapeHtml(station.country)}</span>
        `;
        button.addEventListener('click', () => playStation(globalIndex));
        ui.stationsGrid.appendChild(button);
    });

    highlightActiveStation();
}

// Render sleep sound cards dynamically
function renderSleepSounds() {
    ui.sleepGrid.innerHTML = '';

    Object.entries(sleepSounds).forEach(([type, sound]) => {
        const card = document.createElement('div');
        card.className = 'sleep-item';
        card.dataset.type = type;
        card.innerHTML = `
            <div class="sleep-icon">${sound.icon}</div>
            <h3>${escapeHtml(sound.name)}</h3>
            <p class="sound-desc">${escapeHtml(sound.description)}</p>
            <button class="sleep-btn" data-type="${type}">Play Sound</button>
            <div class="timer-control">
                <input type="number" id="${type}Timer" min="1" max="120" value="30" aria-label="Timer minutes">
                <button class="timer-btn" data-type="${type}">Set Timer</button>
            </div>
        `;
        ui.sleepGrid.appendChild(card);
    });

    ui.sleepGrid.querySelectorAll('.sleep-btn').forEach((btn) => {
        btn.addEventListener('click', () => playSleepSound(btn.dataset.type));
    });

    ui.sleepGrid.querySelectorAll('.timer-btn').forEach((btn) => {
        btn.addEventListener('click', () => setTimer(btn.dataset.type));
    });
}

// Play a live radio station by index
function playStation(index) {
    const station = allStations[index];
    if (!station) {
        return;
    }

    activeStationIndex = index;
    autoSkipCount = 0; // // Manual selection resets auto-skip counter
    currentMode = 'radio';
    currentStationMeta = station;
    currentSleepType = null;

    highlightActiveStation();
    setPlayerLoading(true, `Connecting: ${station.name}`);

    stopPlayback(false);
    loadStream(station.url, station.hls)
        .then(() => {
            // playing event already fired — onAudioPlaying handles UI
        })
        .catch((error) => handlePlaybackError('radio', error));
}

// Load stream URL — play immediately for live Icecast/Shoutcast feeds
function loadStream(url, isHls) {
    return new Promise((resolve, reject) => {
        destroyHls();

        let settled = false;
        const STREAM_TIMEOUT_MS = 15000;

        const cleanup = () => {
            clearTimeout(timeoutId);
            audioElement.removeEventListener('playing', onPlaying);
            audioElement.removeEventListener('error', onError);
        };

        const finish = (callback) => {
            if (settled) {
                return;
            }
            settled = true;
            cleanup();
            callback();
        };

        const onPlaying = () => finish(resolve);
        const onError = () => finish(() => reject(new Error('Stream failed to load')));

        const timeoutId = setTimeout(() => {
            finish(() => reject(new Error('Connection timed out')));
        }, STREAM_TIMEOUT_MS);

        audioElement.addEventListener('playing', onPlaying);
        audioElement.addEventListener('error', onError);

        // HLS streams via hls.js
        if (isHls || url.includes('.m3u8')) {
            if (typeof Hls !== 'undefined' && Hls.isSupported()) {
                hlsPlayer = new Hls({ enableWorker: true, lowLatencyMode: false });
                hlsPlayer.loadSource(url);
                hlsPlayer.attachMedia(audioElement);
                hlsPlayer.on(Hls.Events.MANIFEST_PARSED, () => {
                    audioElement.play().catch(onError);
                });
                hlsPlayer.on(Hls.Events.ERROR, (_event, data) => {
                    if (data.fatal) {
                        onError();
                    }
                });
                return;
            }

            if (audioElement.canPlayType('application/vnd.apple.mpegurl')) {
                audioElement.loop = false;
                audioElement.src = url;
                audioElement.load();
                audioElement.play().catch(onError);
                return;
            }

            finish(() => reject(new Error('HLS not supported in this browser')));
            return;
        }

        // Live radio — must call play() immediately; waiting for canplay breaks Icecast
        audioElement.loop = false;
        audioElement.src = url;
        audioElement.load();
        audioElement.play().catch(onError);
    });
}

// Play ambient sleep sound
function playSleepSound(type) {
    const sound = sleepSounds[type];
    if (!sound) {
        return;
    }

    currentMode = 'sleep';
    currentSleepType = type;
    currentStationMeta = { name: sound.name, country: 'Sleep Mode', codec: 'AMBIENT' };
    activeStationIndex = -1;

    highlightActiveStation();
    highlightActiveSleep(type);
    setPlayerLoading(true, `Loading: ${sound.name}`);

    stopPlayback(false);
    destroyHls();

    audioElement.loop = true;
    audioElement.src = sound.url;
    audioElement.load();

    audioElement.play()
        .catch((error) => handlePlaybackError('sleep', error));
}

// Stop current playback and reset audio element
function stopPlayback(resetUi = true) {
    destroyHls();

    if (audioElement) {
        audioElement.pause();
        audioElement.removeAttribute('src');
        audioElement.load();
        audioElement.loop = false;
    }

    if (resetUi) {
        currentMode = null;
        currentStationMeta = null;
        currentSleepType = null;
        activeStationIndex = -1;
        setVisualizerActive(false);
        ui.currentStation.textContent = 'Select a station or sleep sound';
        ui.stationMeta.textContent = 'Ready';
        ui.playPauseButton.textContent = '▶ Listen';
        ui.playPauseButton.disabled = false;
        highlightActiveStation();
        highlightActiveSleep(null);
    }
}

// Destroy hls.js instance if active
function destroyHls() {
    if (hlsPlayer) {
        hlsPlayer.destroy();
        hlsPlayer = null;
    }
}

// Toggle play/pause for current source
function togglePlayPause() {
    if (!audioElement || !audioElement.src) {
        // Auto-start first station if nothing selected
        if (allStations.length > 0) {
            playStation(0);
        }
        return;
    }

    if (audioElement.paused) {
        audioElement.play().catch((error) => handlePlaybackError(currentMode, error));
    } else {
        audioElement.pause();
    }
}

// Skip to previous/next station
function skipStation(direction) {
    if (allStations.length === 0) {
        return;
    }

    let nextIndex = activeStationIndex + direction;
    if (nextIndex < 0) {
        nextIndex = allStations.length - 1;
    }
    if (nextIndex >= allStations.length) {
        nextIndex = 0;
    }

    playStation(nextIndex);
}

// Sleep timer — stops only the matching active sleep sound
function setTimer(type) {
    const input = document.getElementById(`${type}Timer`);
    const minutes = parseInt(input.value, 10);

    if (isNaN(minutes) || minutes < 1 || minutes > 120) {
        showToast('Enter a time between 1 and 120 minutes.');
        return;
    }

    if (sleepTimers[type]) {
        clearTimeout(sleepTimers[type]);
    }

    sleepTimers[type] = setTimeout(() => {
        if (currentMode === 'sleep' && currentSleepType === type) {
            stopPlayback(true);
            showToast(`${sleepSounds[type].name} timer ended.`);
        }
        ui.timerDisplay.textContent = '';
    }, minutes * 60 * 1000);

    ui.timerDisplay.textContent = `⏱ Sleep timer: ${minutes} min (${sleepSounds[type].name})`;
    showToast(`Timer set: ${minutes} minutes for ${sleepSounds[type].name}`);
}

// Audio event — now playing
function onAudioPlaying() {
    autoSkipCount = 0; // // Reset skip counter on successful playback
    setPlayerLoading(false);
    setVisualizerActive(true);
    setStatus('live', 'Now Playing');

    const label = currentStationMeta
        ? currentStationMeta.name
        : 'Now Playing';

    ui.currentStation.textContent = label;
    ui.stationMeta.textContent = currentStationMeta
        ? `${currentStationMeta.country} · ${currentStationMeta.codec}`
        : '';
    ui.playPauseButton.textContent = '⏸ Pause';
    ui.playPauseButton.disabled = false;
}

// Audio event — paused
function onAudioPaused() {
    if (!audioElement.ended) {
        setVisualizerActive(false);
        setStatus('paused', 'Paused');
        ui.playPauseButton.textContent = '▶ Listen';
    }
}

// Audio event — buffering
function onAudioWaiting() {
    if (currentStationMeta) {
        setPlayerLoading(true, `Buffering: ${currentStationMeta.name}`);
    }
}

// Audio event — error
function onAudioError() {
    handlePlaybackError(currentMode, new Error('Audio element error'));
}

// Audio event — track ended (non-loop)
function onAudioEnded() {
    if (currentMode === 'radio' && allStations.length > 1) {
        skipStation(1);
    }
}

// Centralized playback error handler with auto-skip for radio
function handlePlaybackError(mode, error) {
    console.error('Playback error:', error);
    setPlayerLoading(false);
    setVisualizerActive(false);
    setStatus('error', 'Connection lost');

    ui.currentStation.textContent = 'Stream unavailable';
    ui.playPauseButton.textContent = '▶ Listen';
    ui.playPauseButton.disabled = false;

    if (mode === 'radio' && allStations.length > 1 && autoSkipCount < MAX_AUTO_SKIPS) {
        autoSkipCount++;
        ui.stationMeta.textContent = `Trying next station (${autoSkipCount}/${MAX_AUTO_SKIPS})...`;
        showToast('Stream unavailable. Trying next station...');
        setTimeout(() => skipStation(1), 1200);
        return;
    }

    ui.stationMeta.textContent = 'Please select another station';
    showToast('Could not connect. Please try a verified station (✓).');
    autoSkipCount = 0;
}

// Highlight the active station button
function highlightActiveStation() {
    document.querySelectorAll('.station-btn').forEach((btn) => {
        btn.classList.toggle('active', parseInt(btn.dataset.index, 10) === activeStationIndex);
    });
}

// Highlight active sleep sound card
function highlightActiveSleep(type) {
    document.querySelectorAll('.sleep-item').forEach((card) => {
        card.classList.toggle('active', card.dataset.type === type);
    });
}

// Toggle visualizer animation
function setVisualizerActive(active) {
    ui.visualizer.classList.toggle('playing', active);
}

// Update connection status badge
function setStatus(state, label) {
    ui.statusBadge.className = `status-badge status-${state}`;
    ui.statusBadge.textContent = label;
}

// Show/hide player loading state
function setPlayerLoading(isLoading, message) {
    ui.playPauseButton.disabled = isLoading;
    if (isLoading && message) {
        ui.currentStation.textContent = message;
        ui.stationMeta.textContent = 'Connecting to stream...';
        setVisualizerActive(false);
    }
}

// Show skeleton loaders while fetching stations
function showStationLoading(isLoading) {
    if (!isLoading) {
        return;
    }

    ui.stationsGrid.innerHTML = '';
    for (let i = 0; i < 8; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'station-skeleton';
        ui.stationsGrid.appendChild(skeleton);
    }
}

// Non-blocking toast notification
function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) {
        existing.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}

// Escape HTML to prevent XSS from API station names
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
