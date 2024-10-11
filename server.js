const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = 3000;

let players = {};
let food = [];

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Listen for player joining the game
    socket.on('joinGame', (data) => {
        // Create a new player object
        players[socket.id] = {
            id: socket.id,
            name: data.name,
            x: Math.random() * 500,
            y: Math.random() * 500,
            radius: 10,
            color: getRandomColor(),
        };

        // Send initial game state to the newly joined player
        socket.emit('init', { players, food });

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

            // Check for collisions with food
            food.forEach((f, index) => {
                if (getDistance(player.x, player.y, f.x, f.y) < player.radius + f.size) {
                    player.radius += 2;
                    food.splice(index, 1);
                    io.emit('foodEaten', { id: socket.id, foodIndex: index });
                }
            });
        }
        io.emit('updatePlayers', players);
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

function generateFood() {
    for (let i = 0; i < 50; i++) {
        food.push({
            x: Math.random() * 500,
            y: Math.random() * 500,
            size: 5 + Math.random() * 10,
            color: getRandomColor(),
        });
    }
}

generateFood();

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
