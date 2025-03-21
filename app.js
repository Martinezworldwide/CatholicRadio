// Initialize audio objects
let currentStream = null;
let currentSleepSound = null;
let sleepTimers = {};

// Radio Browser API endpoint
const RADIO_BROWSER_API = 'https://de1.api.radio-browser.info/json';

// Sleep sounds using reliable CDN files
const sleepSounds = {
    gregorian: {
        name: 'Gregorian Chant',
        url: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3?filename=gregorian-chant-ambient-113985.mp3',
        description: 'Peaceful Gregorian Chant'
    },
    bells: {
        name: 'Church Bells',
        url: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3?filename=church-bells-ambient-113986.mp3',
        description: 'Distant Church Bells'
    },
    rain: {
        name: 'Rain & Church Ambience',
        url: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_c8c8a73467.mp3?filename=rain-ambient-113987.mp3',
        description: 'Rain with Church Ambience'
    }
};

// Function to fetch Catholic radio stations
async function fetchCatholicStations() {
    try {
        const response = await fetch(`${RADIO_BROWSER_API}/stations/search?tag=catholic&limit=10`);
        const stations = await response.json();
        
        // Update the stations grid
        const stationsGrid = document.getElementById('prayerList');
        stationsGrid.innerHTML = ''; // Clear existing stations
        
        stations.forEach(station => {
            const button = document.createElement('button');
            button.className = 'station-btn';
            button.innerHTML = `
                <span class="station-name">${station.name}</span>
                <span class="station-desc">${station.country || 'International'}</span>
            `;
            button.onclick = () => setStream(station.url);
            stationsGrid.appendChild(button);
        });
    } catch (error) {
        console.error('Error fetching stations:', error);
        alert('Error loading radio stations. Please try again.');
    }
}

// Function to handle play/pause button click
document.getElementById('playPauseButton').addEventListener('click', () => {
    if (currentStream && currentStream.playing()) {
        currentStream.pause();
        document.getElementById('playPauseButton').innerText = 'Play';
    } else if (currentStream) {
        currentStream.play();
        document.getElementById('playPauseButton').innerText = 'Pause';
    } else if (currentSleepSound) {
        if (currentSleepSound.playing()) {
            currentSleepSound.pause();
            document.getElementById('playPauseButton').innerText = 'Play';
        } else {
            currentSleepSound.play();
            document.getElementById('playPauseButton').innerText = 'Pause';
        }
    }
});

// Function to adjust the volume
document.getElementById('volumeControl').addEventListener('input', (e) => {
    if (currentStream) {
        currentStream.volume(e.target.value);
    }
    if (currentSleepSound) {
        currentSleepSound.volume(e.target.value);
    }
});

// Function to set the audio stream URL
function setStream(url) {
    // Stop any playing sleep sounds
    if (currentSleepSound) {
        currentSleepSound.stop();
        currentSleepSound = null;
    }

    // Stop and unload the current stream
    if (currentStream) {
        currentStream.unload();
    }

    // Show loading state
    document.getElementById('currentStation').textContent = 'Loading station...';
    document.getElementById('playPauseButton').innerText = 'Loading...';
    document.getElementById('playPauseButton').disabled = true;

    // Create new stream with error handling
    currentStream = new Howl({
        src: [url],
        html5: true,
        volume: document.getElementById('volumeControl').value,
        onloaderror: function(id, error) {
            console.error('Error loading stream:', error);
            document.getElementById('currentStation').textContent = 'Error loading stream';
            document.getElementById('playPauseButton').innerText = 'Error';
            document.getElementById('playPauseButton').disabled = false;
            alert('Error loading radio stream. Please try again.');
        },
        onload: function() {
            document.getElementById('playPauseButton').disabled = false;
            document.getElementById('playPauseButton').innerText = 'Play';
        },
        onplay: function() {
            document.getElementById('currentStation').textContent = 'Now Playing';
            document.getElementById('playPauseButton').innerText = 'Pause';
        }
    });
}

// Function to play sleep sounds
function playSleepSound(type) {
    const sound = sleepSounds[type];
    if (!sound) return;

    // Stop any playing radio stream
    if (currentStream) {
        currentStream.stop();
        currentStream = null;
    }

    // Stop any currently playing sleep sound
    if (currentSleepSound) {
        currentSleepSound.stop();
    }

    // Show loading state
    document.getElementById('currentStation').textContent = `Loading ${sound.name}...`;
    document.getElementById('playPauseButton').innerText = 'Loading...';
    document.getElementById('playPauseButton').disabled = true;

    // Create new sleep sound with error handling
    currentSleepSound = new Howl({
        src: [sound.url],
        html5: true,
        volume: document.getElementById('volumeControl').value,
        loop: true,
        onloaderror: function(id, error) {
            console.error('Error loading sleep sound:', error);
            document.getElementById('currentStation').textContent = 'Error loading sound';
            document.getElementById('playPauseButton').innerText = 'Error';
            document.getElementById('playPauseButton').disabled = false;
            alert('Error loading sleep sound. Please try again.');
        },
        onload: function() {
            document.getElementById('playPauseButton').disabled = false;
            document.getElementById('playPauseButton').innerText = 'Play';
        },
        onplay: function() {
            document.getElementById('currentStation').textContent = `Now Playing: ${sound.name}`;
            document.getElementById('playPauseButton').innerText = 'Pause';
        }
    });
}

// Function to set timer for sleep sounds
function setTimer(type) {
    const minutes = parseInt(document.getElementById(`${type}Timer`).value);
    if (isNaN(minutes) || minutes < 1 || minutes > 120) {
        alert('Please enter a valid time between 1 and 120 minutes');
        return;
    }

    // Clear existing timer if any
    if (sleepTimers[type]) {
        clearTimeout(sleepTimers[type]);
    }

    // Set new timer
    sleepTimers[type] = setTimeout(() => {
        if (currentSleepSound) {
            currentSleepSound.stop();
            currentSleepSound = null;
            document.getElementById('currentStation').textContent = 'Select a station';
            document.getElementById('playPauseButton').innerText = 'Play';
        }
    }, minutes * 60 * 1000);

    alert(`Timer set for ${minutes} minutes`);
}

// Initialize volume to 50%
document.getElementById('volumeControl').value = 0.5;

// Fetch stations when the page loads
fetchCatholicStations();
