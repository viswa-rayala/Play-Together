const express = require("express");
const fs = require("fs");
const path = require("path");
const http = require("http");
const multer = require("multer");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: true,
        methods: ["GET", "POST"]
    }
});

const port = 3000;
const mediaPath = path.join(__dirname, "../media");

if (!fs.existsSync(mediaPath)) {
    fs.mkdirSync(mediaPath, { recursive: true });
}

const upload = multer({
    dest: mediaPath
});

const hostIds = new Map();
const roomStates = new Map();

function getRoomState(roomId) {
    if (!roomStates.has(roomId)) {
        roomStates.set(roomId, {
            media: "",
            position: 0,
            playing: false,
            updatedAt: Date.now(),
            participants: []
        });
    }

    return roomStates.get(roomId);
}

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
});

app.use(express.static(path.join(__dirname, "../public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.post("/upload", upload.single("media"), (req, res) => {

    if (!req.file) {
        return res.status(400).json({
            error: "No media file selected"
        });
    }

    const originalName =
        path.basename(req.file.originalname);

    const finalPath =
        path.join(mediaPath, originalName);

    if (fs.existsSync(finalPath)) {
        fs.unlinkSync(req.file.path);
    } else {
        fs.renameSync(
            req.file.path,
            finalPath
        );
    }

    console.log(
        "Media uploaded:",
        originalName
    );

    res.json({
        success: true,
        media: originalName
    });
});

app.get("/media/:file", (req, res) => {

    const fileName =
        path.basename(req.params.file);

    const filePath =
        path.join(mediaPath, fileName);

    if (!fs.existsSync(filePath)) {
        return res.status(404).send(
            "Media file not found"
        );
    }

    const stat =
        fs.statSync(filePath);

    const size =
        stat.size;

    const range =
        req.headers.range;

    if (!range) {

        res.writeHead(200, {
            "Content-Length": size,
            "Content-Type":
                getContentType(fileName),
            "Accept-Ranges": "bytes"
        });

        return fs
            .createReadStream(filePath)
            .pipe(res);
    }

    const parts =
        range.replace(/bytes=/, "")
        .split("-");

    const start =
        parseInt(parts[0], 10);

    const end =
        parts[1]
            ? parseInt(parts[1], 10)
            : size - 1;

    if (
        start >= size ||
        start > end
    ) {
        return res
            .status(416)
            .send("Invalid range");
    }

    const actualEnd =
        Math.min(end, size - 1);

    const chunkSize =
        actualEnd - start + 1;

    res.writeHead(206, {
        "Content-Range":
            `bytes ${start}-${actualEnd}/${size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type":
            getContentType(fileName)
    });

    fs.createReadStream(
        filePath,
        {
            start,
            end: actualEnd
        }
    ).pipe(res);
});

function getContentType(fileName) {

    const ext =
        path.extname(fileName)
        .toLowerCase();

    if (ext === ".mp3") {
        return "audio/mpeg";
    }

    if (ext === ".wav") {
        return "audio/wav";
    }

    if (ext === ".ogg") {
        return "audio/ogg";
    }

    if (ext === ".mp4") {
        return "video/mp4";
    }

    if (ext === ".webm") {
        return "video/webm";
    }

    return "application/octet-stream";
}

function getCurrentPosition(roomState) {

    if (!roomState.playing) {
        return roomState.position;
    }

    const elapsed =
        (Date.now() -
        roomState.updatedAt) / 1000;

    return roomState.position + elapsed;
}

io.on("connection", socket => {

    const roomId = String(socket.handshake.auth?.roomId || "default");
    const roomState = getRoomState(roomId);
    let hostId = hostIds.get(roomId) || null;

    socket.join(roomId);
    roomState.participants.push({ id: socket.id, name: "Participant" });

    console.log(
        "Client connected:", socket.id, "Room:", roomId
    );

    if (!hostId && socket.handshake.auth?.isHost === true) {

        hostId = socket.id;
        hostIds.set(roomId, hostId);

        console.log(
            "Host assigned:",
            hostId
        );
    }

    socket.emit(
        "ROOM_STATE",
        {
            media: roomState.media,
            position: getCurrentPosition(roomState),
            playing:
                roomState.playing,
            serverTime:
                Date.now(),
            isHost:
                socket.id === hostId
        }
    );

    io.to(roomId).emit("PARTICIPANT_JOINED", {
        participants: roomState.participants
    });

    socket.emit(
        "ROLE",
        {
            isHost:
                socket.id === hostId
        }
    );

    socket.on(
        "TIME_REQUEST",
        () => {

            socket.emit(
                "TIME_RESPONSE",
                {
                    serverTime:
                        Date.now()
                }
            );
        }
    );

    socket.on(
        "MEDIA_SELECTED",
        data => {

            if (socket.id !== hostId) {
                return;
            }

            console.log(
                "MEDIA_SELECTED:",
                data
            );

            roomState.media =
                data.media;

            roomState.position =
                0;

            roomState.playing =
                false;

            roomState.updatedAt =
                Date.now();

            socket.to(roomId).emit(
                "MEDIA_SELECTED",
                {
                    media:
                        roomState.media
                }
            );
        }
    );

    socket.on(
        "PLAY",
        data => {

            if (socket.id !== hostId) {
                return;
            }

            console.log(
                "PLAY:",
                data
            );

            roomState.position =
                Number(data.position) || 0;

            roomState.playing =
                true;

            roomState.updatedAt =
                Date.now();

            socket.to(roomId).emit(
                "PLAY",
                {
                    position:
                        roomState.position,
                    serverTime:
                        roomState.updatedAt
                }
            );

            socket.emit(
                "PLAY_CONFIRMED",
                {
                    position:
                        roomState.position,
                    serverTime:
                        roomState.updatedAt
                }
            );
        }
    );

    socket.on(
        "PAUSE",
        data => {

            if (socket.id !== hostId) {
                return;
            }

            console.log(
                "PAUSE:",
                data
            );

            roomState.position =
                Number(data.position) || 0;

            roomState.playing =
                false;

            roomState.updatedAt =
                Date.now();

            socket.to(roomId).emit(
                "PAUSE",
                {
                    position:
                        roomState.position
                }
            );
        }
    );

    socket.on(
        "SEEK",
        data => {

            if (socket.id !== hostId) {
                return;
            }

            console.log(
                "SEEK:",
                data
            );

            roomState.position =
                Number(data.position) || 0;

            roomState.updatedAt =
                Date.now();

            socket.to(roomId).emit(
                "SEEK",
                {
                    position:
                        roomState.position
                }
            );
        }
    );

    socket.on(
        "SYNC",
        data => {

            if (socket.id !== hostId) {
                return;
            }

            roomState.position =
                Number(data.position) || 0;

            roomState.playing =
                Boolean(data.playing);

            roomState.updatedAt =
                Date.now();

            socket.to(roomId).emit(
                "SYNC",
                {
                    position:
                        roomState.position,
                    playing:
                        roomState.playing,
                    serverTime:
                        roomState.updatedAt
                }
            );
        }
    );

    socket.on(
        "disconnect",
        () => {

            console.log(
                "Client disconnected:",
                socket.id
            );

            roomState.participants = roomState.participants.filter(
                participant => participant.id !== socket.id
            );

            socket.to(roomId).emit("PARTICIPANT_LEFT", {
                participants: roomState.participants
            });

            if (socket.id === hostId) {

                console.log(
                    "Host disconnected"
                );

                hostIds.delete(roomId);

                roomState.playing =
                    false;

                roomState.position =
                    0;

                roomState.media =
                    "";

                roomState.updatedAt =
                    Date.now();

                io.to(roomId).emit(
                    "HOST_DISCONNECTED"
                );
            }
        }
    );
});

server.listen(
    port,
    "0.0.0.0",
    () => {

        console.log(
            `Media server running at http://localhost:${port}`
        );
    }
);