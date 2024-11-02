let audio = new Audio();
audio.volume = 1;

document.getElementById('playPauseButton').addEventListener('click', () => {
    if (audio.paused) {
        audio.play();
        document.getElementById('playPauseButton').innerText = 'Pause';
    } else {
        audio.pause();
        document.getElementById('playPauseButton').innerText = 'Play';
    }
});

document.getElementById('volumeControl').addEventListener('input', (e) => {
    audio.volume = e.target.value;
});

function setStream(url) {
    if (!audio.paused) audio.pause();
    audio.src = url;
    audio.play();
    document.getElementById('playPauseButton').innerText = 'Pause';
}
