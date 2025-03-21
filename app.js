// Initialize audio objects
let currentStream = null;
let currentSleepSound = null;
let sleepTimers = {};

// Free Catholic Radio Stations
const radioStations = {
    ewtn: {
        name: 'EWTN',
        url: 'https://ewtn-ice.streamguys1.com/ewtn-audio-english',
        description: 'Eternal Word Television Network'
    },
    relevant: {
        name: 'Relevant Radio',
        url: 'https://relevantradio.streamguys1.com/rrnet-mp3-64',
        description: 'Relevant Radio Network'
    },
    avemaria: {
        name: 'Ave Maria Radio',
        url: 'https://avemariaradio.streamguys1.com/amr-mp3-64',
        description: 'Ave Maria Radio Network'
    },
    radiopax: {
        name: 'Radio Pax',
        url: 'https://radiopax.streamguys1.com/radiopax-mp3-64',
        description: 'Radio Pax Catholic Radio'
    }
};

// Sleep sounds using Freesound API
const sleepSounds = {
    gregorian: {
        name: 'Gregorian Chant',
        url: 'https://cdn.freesound.org/previews/415/415_5121236-lq.mp3',
        description: 'Peaceful Gregorian Chant'
    },
    bells: {
        name: 'Church Bells',
        url: 'https://cdn.freesound.org/previews/415/415_5121236-lq.mp3',
        description: 'Distant Church Bells'
    },
    rain: {
        name: 'Rain & Church Ambience',
        url: 'https://cdn.freesound.org/previews/415/415_5121236-lq.mp3',
        description: 'Rain with Church Ambience'
    }
};

// Function to handle play/pause button click
document.getElementById('playPauseButton').addEventListener('click', () => {
    if (currentStream && currentStream.playing()) {
        currentStream.pause();
        document.getElementById('playPauseButton').innerText = 'Play';
    } else if (currentStream) {
        currentStream.play();
        document.getElementById('playPauseButton').innerText = 'Pause';
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
function setStream(stationId) {
    const station = radioStations[stationId];
    if (!station) return;

    // Stop any playing sleep sounds
    if (currentSleepSound) {
        currentSleepSound.stop();
        currentSleepSound = null;
    }

    // Stop and unload the current stream
    if (currentStream) {
        currentStream.unload();
    }

    // Create new stream
    currentStream = new Howl({
        src: [station.url],
        html5: true,
        volume: document.getElementById('volumeControl').value,
        onloaderror: function(id, error) {
            console.error('Error loading stream:', error);
            alert('Error loading radio stream. Please try again.');
        },
        onplay: function() {
            document.getElementById('currentStation').textContent = `Now Playing: ${station.name}`;
            document.getElementById('playPauseButton').innerText = 'Pause';
        }
    });

    // Start playing
    currentStream.play();
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

    // Create new sleep sound
    currentSleepSound = new Howl({
        src: [sound.url],
        html5: true,
        volume: document.getElementById('volumeControl').value,
        loop: true,
        onloaderror: function(id, error) {
            console.error('Error loading sleep sound:', error);
            alert('Error loading sleep sound. Please try again.');
        },
        onplay: function() {
            document.getElementById('currentStation').textContent = `Now Playing: ${sound.name}`;
            document.getElementById('playPauseButton').innerText = 'Pause';
        }
    });

    // Start playing
    currentSleepSound.play();
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
