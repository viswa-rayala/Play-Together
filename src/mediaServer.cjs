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

const port = Number(process.env.PORT || 3000);
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
            playlist: [],
            controllers: [],
            position: 0,
            playing: false,
            updatedAt: Date.now(),
            participants: [],
            messages: []
        });
    }

    return roomStates.get(roomId);
}

function canControl(roomId, socketId) {
    const hostId = hostIds.get(roomId);
    if (socketId === hostId) return true;
    const roomState = getRoomState(roomId);
    return Array.isArray(roomState.controllers) && roomState.controllers.includes(socketId);
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

app.post("/upload", upload.any(), (req, res) => {
    const files = req.files || (req.file ? [req.file] : []);

    if (!files || files.length === 0) {
        return res.status(400).json({
            error: "No media file selected"
        });
    }

    const savedMedia = [];

    for (const file of files) {
        const originalName = path.basename(file.originalname);
        const finalPath = path.join(mediaPath, originalName);

        if (fs.existsSync(finalPath)) {
            try { fs.unlinkSync(file.path); } catch (e) {}
        } else {
            try { fs.renameSync(file.path, finalPath); } catch (e) {}
        }
        savedMedia.push(originalName);
    }

    console.log("Media uploaded:", savedMedia);

    res.json({
        success: true,
        media: savedMedia[0],
        files: savedMedia
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
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=3600",
            "Content-Disposition": "inline"
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
            getContentType(fileName),
        "Cache-Control": "public, max-age=3600",
        "Content-Disposition": "inline"
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

function removeParticipant(roomState, socketId) {
    roomState.participants = roomState.participants.filter(
        participant => participant.id !== socketId
    );
    if (Array.isArray(roomState.controllers)) {
        roomState.controllers = roomState.controllers.filter(
            id => id !== socketId
        );
    }
}

function endRoom(roomId, roomState) {
    roomState.playing = false;
    roomState.position = 0;
    roomState.media = "";
    roomState.playlist = [];
    roomState.controllers = [];
    roomState.updatedAt = Date.now();
    roomState.participants = [];
    roomState.messages = [];
    hostIds.delete(roomId);
}

io.on("connection", socket => {

    const roomId = String(socket.handshake.auth?.roomId || "default");
    const roomState = getRoomState(roomId);
    const participantName = String(socket.handshake.auth?.name || "Participant").trim() || "Participant";
    let hostId = hostIds.get(roomId) || null;

    socket.join(roomId);
    roomState.participants.push({ id: socket.id, name: participantName });

    console.log(
        "Client connected:", socket.id, "Room:", roomId, "Name:", participantName
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
            playlist: roomState.playlist || [],
            controllers: roomState.controllers || [],
            messages: roomState.messages,
            position: getCurrentPosition(roomState),
            playing:
                roomState.playing,
            serverTime:
                Date.now(),
            isHost:
                socket.id === hostId,
            hasControl:
                canControl(roomId, socket.id),
            myId:
                socket.id
        }
    );

    io.to(roomId).emit("PARTICIPANT_JOINED", {
        participants: roomState.participants
    });

    socket.emit("MEET_PEERS", {
        peers: roomState.participants
            .filter(participant => participant.id !== socket.id)
            .map(participant => ({ id: participant.id, name: participant.name }))
    });

    socket.to(roomId).emit("MEET_PEER_JOINED", {
        id: socket.id,
        name: participantName
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

    socket.on("CHAT_MESSAGE", data => {
        const message = String(data?.message || "").trim().slice(0, 500);
        if (!message) return;

        const chatMessage = {
            id: String(data?.clientMessageId || `${socket.id}-${Date.now()}`),
            name: participantName,
            message,
            sentAt: Date.now()
        };

        roomState.messages.push(chatMessage);
        if (roomState.messages.length > 100) {
            roomState.messages.shift();
        }

        io.to(roomId).emit("CHAT_MESSAGE", chatMessage);
    });

    socket.on("MEET_SIGNAL", data => {
        const targetId = String(data?.targetId || "");
        if (!targetId || !data?.signal) return;

        io.to(targetId).emit("MEET_SIGNAL", {
            senderId: socket.id,
            senderName: participantName,
            signal: data.signal
        });
    });

    socket.on("MEET_READY", () => {
        socket.emit("MEET_PEERS", {
            peers: roomState.participants
                .filter(participant => participant.id !== socket.id)
                .map(participant => ({ id: participant.id, name: participant.name }))
        });
    });

    socket.on("MEET_END", () => {
        if (socket.id === hostId) {
            io.to(roomId).emit("MEET_ENDED");
        }
    });

    // Toggle control permissions for participants (Host only)
    socket.on("TOGGLE_CONTROL", data => {
        const currentHost = hostIds.get(roomId);
        if (socket.id !== currentHost) return;
        const targetId = String(data?.targetId || "");
        if (!targetId || targetId === currentHost) return;

        if (!Array.isArray(roomState.controllers)) {
            roomState.controllers = [];
        }

        const isCurrentlyController = roomState.controllers.includes(targetId);
        const shouldGrant = data?.grant !== undefined ? Boolean(data.grant) : !isCurrentlyController;

        if (shouldGrant) {
            if (!isCurrentlyController) roomState.controllers.push(targetId);
        } else {
            roomState.controllers = roomState.controllers.filter(id => id !== targetId);
        }

        console.log(`Controllers updated in room ${roomId}:`, roomState.controllers);
        io.to(roomId).emit("CONTROLLERS_UPDATED", {
            controllers: roomState.controllers
        });
    });

    // Select active media
    socket.on(
        "MEDIA_SELECTED",
        data => {

            if (!canControl(roomId, socket.id)) {
                return;
            }

            const selected = String(data?.media || "").trim();
            console.log(
                "MEDIA_SELECTED:",
                selected
            );

            roomState.media =
                selected;

            if (selected && !roomState.playlist.includes(selected)) {
                roomState.playlist.push(selected);
            }

            roomState.position =
                0;

            roomState.playing =
                false;

            roomState.updatedAt =
                Date.now();

            io.to(roomId).emit(
                "MEDIA_SELECTED",
                {
                    media:
                        roomState.media,
                    playlist:
                        roomState.playlist
                }
            );
        }
    );

    // Playlist update
    socket.on("PLAYLIST_UPDATE", data => {
        if (!canControl(roomId, socket.id)) return;
        if (Array.isArray(data?.playlist)) {
            roomState.playlist = data.playlist.map(item => String(item).trim()).filter(Boolean);
            if (!roomState.media && roomState.playlist.length > 0) {
                roomState.media = roomState.playlist[0];
                roomState.position = 0;
                roomState.playing = false;
                roomState.updatedAt = Date.now();
            }
            io.to(roomId).emit("PLAYLIST_UPDATED", {
                playlist: roomState.playlist,
                media: roomState.media
            });
        }
    });

    // Add items to playlist
    socket.on("ADD_TO_PLAYLIST", data => {
        if (!canControl(roomId, socket.id)) return;
        const newItems = Array.isArray(data?.items) ? data.items : (data?.item ? [data.item] : []);
        let changed = false;

        for (const item of newItems) {
            const name = String(item).trim();
            if (name && !roomState.playlist.includes(name)) {
                roomState.playlist.push(name);
                changed = true;
            }
        }

        if (!roomState.media && roomState.playlist.length > 0) {
            roomState.media = roomState.playlist[0];
            roomState.position = 0;
            roomState.playing = false;
            roomState.updatedAt = Date.now();
            changed = true;
        }

        if (changed || data?.selectFirst) {
            if (data?.selectFirst && newItems.length > 0) {
                roomState.media = String(newItems[0]).trim();
                roomState.position = 0;
                roomState.playing = false;
                roomState.updatedAt = Date.now();
            }
            io.to(roomId).emit("PLAYLIST_UPDATED", {
                playlist: roomState.playlist,
                media: roomState.media
            });
        }
    });

    // Remove item from playlist
    socket.on("REMOVE_FROM_PLAYLIST", data => {
        if (!canControl(roomId, socket.id)) return;
        const name = String(data?.name || "").trim();
        roomState.playlist = roomState.playlist.filter(item => item !== name);

        if (roomState.media === name) {
            roomState.media = roomState.playlist.length > 0 ? roomState.playlist[0] : "";
            roomState.position = 0;
            roomState.playing = false;
            roomState.updatedAt = Date.now();
        }

        io.to(roomId).emit("PLAYLIST_UPDATED", {
            playlist: roomState.playlist,
            media: roomState.media
        });
    });

    socket.on(
        "PLAY",
        data => {

            if (!canControl(roomId, socket.id)) {
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

            if (!canControl(roomId, socket.id)) {
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

            if (!canControl(roomId, socket.id)) {
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

            if (!canControl(roomId, socket.id)) {
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

    socket.on("LEAVE_ROOM", () => {
        const isHostLeaving = socket.id === hostId;

        if (isHostLeaving) {
            console.log("Host left room:", roomId);
            endRoom(roomId, roomState);
            io.to(roomId).emit("HOST_DISCONNECTED");
            return;
        }

        removeParticipant(roomState, socket.id);
        socket.to(roomId).emit("PARTICIPANT_LEFT", {
            participants: roomState.participants
        });
        io.to(roomId).emit("CONTROLLERS_UPDATED", {
            controllers: roomState.controllers
        });
    });

    socket.on(
        "disconnect",
        () => {

            console.log(
                "Client disconnected:",
                socket.id
            );

            removeParticipant(roomState, socket.id);

            socket.to(roomId).emit("PARTICIPANT_LEFT", {
                participants: roomState.participants
            });
            socket.to(roomId).emit("MEET_PEER_LEFT", { id: socket.id });
            io.to(roomId).emit("CONTROLLERS_UPDATED", {
                controllers: roomState.controllers
            });

            if (socket.id === hostId) {

                console.log(
                    "Host disconnected"
                );

                endRoom(roomId, roomState);
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