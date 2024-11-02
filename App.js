// Initialize an empty Howl object to hold the audio stream
let prayerStream = null;

// Function to handle play/pause button click
document.getElementById('playPauseButton').addEventListener('click', () => {
    if (prayerStream && prayerStream.playing()) {
        prayerStream.pause();
        document.getElementById('playPauseButton').innerText = 'Play';
    } else if (prayerStream) {
        prayerStream.play();
        document.getElementById('playPauseButton').innerText = 'Pause';
    }
});

// Function to adjust the volume
document.getElementById('volumeControl').addEventListener('input', (e) => {
    if (prayerStream) {
        prayerStream.volume(e.target.value);
    }
});

// Function to set the audio stream URL
function setStream(url) {
    if (prayerStream) {
        prayerStream.unload(); // Stop and unload the current stream
    }
    prayerStream = new Howl({
        src: [url],
        html5: true,
        volume: document.getElementById('volumeControl').value
    });
    prayerStream.play();
    document.getElementById('playPauseButton').innerText = 'Pause';
}
