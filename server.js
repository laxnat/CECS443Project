/*const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = 3000;

let players = {};
const hit_Cooldown = 1000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Listen for player joining the game
    socket.on('joinGame', (data) => {
        // Create a new player object with health and cooldown
        players[socket.id] = {
            id: socket.id,
            name: data.name,
            x: Math.random() * 2000,
            y: Math.random() * 2000,
            radius: 20,
            color: getRandomColor(),
            opacity: 1,
            health: 10, // Initialize player's health
            lastHitTime: 0 // Timestamp of last hit
        };

        // Send initial game state to the newly joined player
        socket.emit('init', { players });

        // Notify other players about the new player
        socket.broadcast.emit('newPlayer', players[socket.id]);

        // Start game for the new player
        socket.emit('startGame');
    });

    socket.on('move', (data) => {
        const player = players[socket.id];
        if (player) {
            player.x += data.dx;
            player.y += data.dy;
    
            // Ensure player stays within boundaries on the server side too
            player.x = Math.max(0, Math.min(player.x, 2000));
            player.y = Math.max(0, Math.min(player.y, 2000));
    
            // Broadcast updated players to all clients
            io.emit('updatePlayers', players);
        }
    });

    socket.on('playerHit', (attackerId, targetId) => {
        const targetPlayer = players[targetId];
        const now = Date.now();

        if (targetPlayer && targetPlayer.health > 0 && now - targetPlayer.lastHitTime >= hit_Cooldown) {
            // Decrement health
            targetPlayer.health -= 1;
            targetPlayer.lastHitTime = now;
    
            // Notify both players about the health change
            socket.to(attackerId).emit('playerHit', { id: targetId, health: targetPlayer.health });
            socket.emit('playerHit', { id: targetId, health: targetPlayer.health });
    
            // Check if the target player is dead
            if (targetPlayer.health <= 0) {
                // Handle player death
                socket.emit('playerDied', targetId);
                socket.to(attackerId).emit('playerDied', targetId);
    
                // Optional: Remove the player from the game or perform other death logic
            }
        }
    });    
    
    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function getDistance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});*/
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = 3000;
const hit_Cooldown = 1000;

let players = {};   // Store all players by socket ID
let lobbies = {};   // Store all lobbies by name

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Send the current list of lobbies to the newly connected client
    socket.emit('lobbies', Object.values(lobbies));

    // Handle lobby creation
    socket.on('createLobby', (lobbyName) => {
        if (!lobbies[lobbyName]) {
            lobbies[lobbyName] = {
                name: lobbyName,
                players: []
            };
            io.emit('lobbies', Object.values(lobbies)); // Update all clients
        }
    });

    // Handle player joining a specific lobby
    socket.on('joinLobby', (lobbyName) => {
        const lobby = lobbies[lobbyName];
        if (lobby) {
            lobby.players.push(socket.id);  // Add player to the lobby
            socket.join(lobbyName);         // Join the socket room for that lobby
            console.log(`${socket.id} joined lobby ${lobbyName}`);
        }
    });

    // Handle player joining the game (after selecting lobby and entering name)
    socket.on('joinGame', (data) => {
        const { name } = data;
        players[socket.id] = {
            id: socket.id,
            name: name,
            x: Math.random() * 2000,
            y: Math.random() * 2000,
            radius: 20,
            color: getRandomColor(),
            opacity: 1,
            health: 10,
            lastHitTime: 0
        };

        // Send initial game state to the newly joined player
        socket.emit('init', { players });

        // Notify others in the lobby about the new player
        const lobby = findPlayerLobby(socket.id);
        if (lobby) {
            io.to(lobby.name).emit('newPlayer', players[socket.id]);
        }
    });

    // Handle player movement
    socket.on('move', (data) => {
        const player = players[socket.id];
        if (player) {
            player.x += data.dx;
            player.y += data.dy;
            player.x = Math.max(0, Math.min(player.x, 2000));
            player.y = Math.max(0, Math.min(player.y, 2000));

            // Broadcast updated players to the lobby
            const lobby = findPlayerLobby(socket.id);
            if (lobby) {
                io.to(lobby.name).emit('updatePlayers', players);
            }
        }
    });

    // Handle player attacking another player
    socket.on('playerHit', (attackerId, targetId) => {
        const targetPlayer = players[targetId];
        const now = Date.now();

        if (targetPlayer && targetPlayer.health > 0 && now - targetPlayer.lastHitTime >= hit_Cooldown) {
            targetPlayer.health -= 1;
            targetPlayer.lastHitTime = now;

            // Notify both players about the health change
            socket.to(attackerId).emit('playerHit', { id: targetId, health: targetPlayer.health });
            socket.emit('playerHit', { id: targetId, health: targetPlayer.health });

            if (targetPlayer.health <= 0) {
                socket.emit('playerDied', targetId);
                socket.to(attackerId).emit('playerDied', targetId);
            }
        }
    });

    // Handle player disconnection
    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);

        const lobby = findPlayerLobby(socket.id);
        if (lobby) {
            lobby.players = lobby.players.filter(id => id !== socket.id);
            io.to(lobby.name).emit('playerDisconnected', socket.id);
        }

        delete players[socket.id];
        console.log(`Player ${socket.id} removed from game`);
    });
});

// Utility function to get a random color
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// Utility function to find the lobby a player belongs to
function findPlayerLobby(playerId) {
    return Object.values(lobbies).find(lobby => lobby.players.includes(playerId));
}

// Start the server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
