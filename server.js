const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const ACTIONS = require('./src/Actions');

const server = http.createServer(app);
const io = new Server(server);

// app.use(express.static('build'));
// app.use((req, res, next) => {
//     res.sendFile(path.join(__dirname, 'build', 'index.html'));
// });

const userSocketMap = {};

function getAllConnectedClients(roomId) {
    // Map
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId],
            };
        }
    );
}

io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    // triggered from FrontEnd getting data function name socketRef.current.emit
    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
        userSocketMap[socket.id] = username;
        socket.join(roomId);
        const clients = getAllConnectedClients(roomId);
        // console.log(clients);
        // sending message to all clients using loop on clients array
        clients.forEach(({ socketId }) => {
            //sending to frontend 
            // notify to all a new user has connected
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
            });
        });
    });
    // Triggered from Front-End got data to emit all the client code has changed
    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        // console.log(code);
        // sending all the clients
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    });


    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    // sending data to fronted of all rooms
    socket.on('disconnecting', () => {
        // converting socket rooms into array
        const rooms = [...socket.rooms];
        delete userSocketMap[socket.id];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
        });
        socket.leave();
    });
});


app.get('/', (req, res) => {
    return res.json({message : "hello from backend"})
})

const PORT = 5000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));