const socket = io();

const syncPlayer = document.getElementById("player");

socket.on("connect", () => {
    console.log("Connected to server:", socket.id);
});

socket.on("disconnect", () => {
    console.log("Disconnected from server");
});

function sendPlay() {
    const position = syncPlayer.currentTime;
    const timestamp = Date.now();

    socket.emit("PLAY", {
        position: position,
        timestamp: timestamp
    });
}

socket.on("PLAY", data => {
    const elapsed = (Date.now() - data.timestamp) / 1000;
    const position = data.position + elapsed;

    syncPlayer.currentTime = position;
    syncPlayer.play();
});