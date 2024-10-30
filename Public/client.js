const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io();

let playerId;
let players = {};
let zombies = []; // Array to store zombie entities
let bullets = []; // Array to store bullets
const zombieSpeed = 1; // Speed of the zombies
const zombieMinDistance = 50; // Minimum distance between zombies
const zombieSeparationDistance = 30; // Minimum distance for separation behavior
const zombieSize = 20; // Size of the zombies (width and height)
const maxZombieHealth = 3; // Health of each zombie
const bulletSize = 5; // Radius of the bullets
const bulletDamage = 1; // Damage done by each bullet

// Define map dimensions (with additional space for borders)
const borderThickness = 500; // Border thickness
const mapWidth = 2000; // Width of the playable area
const mapHeight = 2000; // Height of the playable area
const totalMapWidth = mapWidth + borderThickness * 2; // Total width including borders
const totalMapHeight = mapHeight + borderThickness * 2; // Total height including borders

// Track which keys are currently being pressed
const keysPressed = {};
const moveSpeed = 5;

// Camera position (initially centered around the player)
let cameraX = 0;
let cameraY = 0;

// Track mouse position
let mouseX = 0;
let mouseY = 0;

// Survivor sprite
const survivor = new Image();
survivor.src = 'sprites/Survivor.png';

// Gun flash image
const gunFlash = new Image();
gunFlash.src = 'sprites/Flash.png';
let showFlash = false;
let flashTimeout;

// Zombie sprite
const zombieSprite = new Image();
zombieSprite.src = 'sprites/Zombie.png';

// Variable to track whether the image is loaded
let zombieLoaded = false;

// Set onload event
zombieSprite.onload = () => {
    zombieLoaded = true; // Mark the image as loaded
    console.log("Zombie sprite loaded!");
};

// Dynamically resize the canvas to fit the window
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Call resizeCanvas initially and whenever the window is resized
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Initial call to set up the canvas

// Start screen elements
const startScreen = document.getElementById('startScreen');
const playerNameInput = document.getElementById('playerName');
const startGameBtn = document.getElementById('startGameBtn');

// Listen for the "Start Game" button click
startGameBtn.addEventListener('click', () => {
    playerName = playerNameInput.value.trim();
    if (playerName) {
        startScreen.style.display = 'none';
        canvas.style.display = 'block';
        socket.emit('joinGame', { name: playerName });
    }
});

// Listen for initial game state
socket.on('init', (data) => {
    players = data.players;
    playerId = socket.id;
});

// Listen for new players
socket.on('newPlayer', (newPlayer) => {
    players[newPlayer.id] = newPlayer;
});

// Listen for player updates
socket.on('updatePlayers', (updatedPlayers) => {
    players = updatedPlayers;
});

// Listen for player disconnects
socket.on('playerDisconnected', (id) => {
    delete players[id];
});

// Track keydown and keyup events
document.addEventListener('keydown', (e) => {
    keysPressed[e.key] = true;
});

document.addEventListener('keyup', (e) => {
    delete keysPressed[e.key];
});

// Track mouse movement
canvas.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

// Function to check if a new zombie overlaps with existing ones
function isZombieOverlap(newZombie) {
    for (let zombie of zombies) {
        const dx = newZombie.x - zombie.x;
        const dy = newZombie.y - zombie.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < zombieMinDistance) {
            return true; // Overlapping
        }
    }
    return false; // No overlap
}

// Function to spawn zombies at random positions
function spawnZombie() {
    const x = Math.random() * totalMapWidth; // Random X position
    const y = Math.random() * totalMapHeight; // Random Y position

    const newZombie = { x, y, health: maxZombieHealth }; // Example zombie structure

    // Check for overlap and spawn only if it's valid
    if (!isZombieOverlap(newZombie)) {
        zombies.push(newZombie);
    } else {
        // If there is an overlap, recursively call to try again
        spawnZombie();
    }
}

// Call spawnZombie every few seconds
setInterval(spawnZombie, 3000); // Spawn a new zombie every 3 seconds

function movePlayer() {
    let dx = 0;
    let dy = 0;

    if (keysPressed['w']) dy = -moveSpeed;
    if (keysPressed['s']) dy = moveSpeed;
    if (keysPressed['a']) dx = -moveSpeed;
    if (keysPressed['d']) dx = moveSpeed;

    const player = players[playerId];

    if (player) {
        // Calculate new position
        const newX = player.x + dx;
        const newY = player.y + dy;

        // Ensure player stays within the map boundaries
        if (newX > player.radius + borderThickness && newX < totalMapWidth - player.radius - borderThickness) {
            player.x = newX;
        }
        if (newY > player.radius + borderThickness && newY < totalMapHeight - player.radius - borderThickness) {
            player.y = newY;
        }

        // Send the player's new position to the server
        socket.emit('move', { dx, dy });
    }
}

// Function to separate zombies if they get too close
function avoidOverlappingZombies(zombie) {
    zombies.forEach((otherZombie) => {
        if (otherZombie !== zombie) { // Ignore self
            const dx = zombie.x - otherZombie.x;
            const dy = zombie.y - otherZombie.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < zombieSeparationDistance) {
                const angle = Math.atan2(dy, dx);
                const avoidanceX = Math.cos(angle) * (zombieSeparationDistance - distance);
                const avoidanceY = Math.sin(angle) * (zombieSeparationDistance - distance);
                
                // Move the zombie away from the other one
                zombie.x += avoidanceX;
                zombie.y += avoidanceY;
            }
        }
    });
}

// Function to move zombies towards the player while avoiding each other
function moveZombies() {
    const player = players[playerId];
    if (player) {
        zombies.forEach((zombie) => {
            const dx = player.x - zombie.x;
            const dy = player.y - zombie.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Normalize the direction and move the zombie towards the player
            if (distance > 0) {
                zombie.x += (dx / distance) * zombieSpeed;
                zombie.y += (dy / distance) * zombieSpeed;
            }

            // Apply avoidance behavior
            avoidOverlappingZombies(zombie);
        });
    }
}

// Function to shoot a bullet toward the mouse cursor
function shootBullet() {
    const player = players[playerId];
    if (player) {
        // Calculate direction and angle as before
        const mouseWorldX = mouseX + cameraX;
        const mouseWorldY = mouseY + cameraY;
        const dx = mouseWorldX - player.x;
        const dy = mouseWorldY - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const directionX = dx / distance;
        const directionY = dy / distance;

        const angle = Math.atan2(dy, dx);
        const gunTipOffsetX = survivor.width / 2 - 225;
        const gunTipOffsetY = 15;

        const rotatedGunTipX = player.x + Math.cos(angle) * gunTipOffsetX - Math.sin(angle) * gunTipOffsetY;
        const rotatedGunTipY = player.y + Math.sin(angle) * gunTipOffsetX + Math.cos(angle) * gunTipOffsetY;

        const bullet = {
            x: rotatedGunTipX,
            y: rotatedGunTipY,
            damage: bulletDamage,
            radius: bulletSize,
            velocityX: directionX * 7,
            velocityY: directionY * 7,
            move: function() {
                this.x += this.velocityX;
                this.y += this.velocityY;
            }
        };
        bullets.push(bullet);

        // Show the flash for a brief moment
        showFlash = true;
        clearTimeout(flashTimeout); // Clear previous timer if any
        flashTimeout = setTimeout(() => {
            showFlash = false;
        }, 50); // Flash duration in milliseconds
    }
}

// Function to check bullet collisions with zombies
function checkBulletCollisions() {
    bullets.forEach((bullet, bulletIndex) => {
        zombies.forEach((zombie, zombieIndex) => {
            const dx = bullet.x - zombie.x;
            const dy = bullet.y - zombie.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Check if the bullet hits the zombie
            if (distance < bullet.radius + zombieSize) {
                zombie.health -= bullet.damage; // Reduce zombie health
                // Check if zombie is dead
                if (zombie.health <= 0) {
                    // Remove the zombie from the array
                    zombies.splice(zombieIndex, 1);
                }
                // Remove the bullet after hitting the zombie
                bullets.splice(bulletIndex, 1);
            }
        });
    });
}

// Track shooting key event
document.addEventListener('mousedown', (e) => {
    shootBullet();
});

function drawMap() {
    // Draw the background map
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(-cameraX, -cameraY, totalMapWidth, totalMapHeight); // Draw total map area

    // Draw borders
    ctx.strokeStyle = 'black'; // Border color
    ctx.lineWidth = borderThickness; // Border thickness
    ctx.strokeRect(borderThickness / 2 - cameraX, borderThickness / 2 - cameraY, mapWidth + borderThickness, mapHeight + borderThickness);
}

// Capture mouse movements
canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left; // Adjust for canvas position
    mouseY = event.clientY - rect.top; // Adjust for canvas position
});

function drawPlayers() {
    Object.values(players).forEach((player) => {
        const angle = Math.atan2(mouseY - (player.y - cameraY), mouseX - (player.x - cameraX));

        ctx.save();
        ctx.translate(player.x - cameraX, player.y - cameraY);
        ctx.rotate(angle);

        const survivorWidth = 80;
        const aspectRatio = survivor.height / survivor.width;
        const survivorHeight = survivorWidth * aspectRatio;

        // Draw the player sprite
        ctx.drawImage(survivor, -survivorWidth / 2, -survivorHeight / 2, survivorWidth, survivorHeight);

        // Draw the flash if showFlash is true
        if (showFlash) {
            const flashWidth = 30;
            const flashHeight = 30;

            // Position the flash at the gun tip
            const gunTipX = survivorWidth / 2;
            const gunTipY = 0;

            // Additional offset to move it down
            const additionalYOffset = 16;
            
            // Draw the flash image with the adjusted y-position
            ctx.drawImage(gunFlash, gunTipX, gunTipY - flashHeight / 2 + additionalYOffset, flashWidth, flashHeight);
        }

        ctx.restore();
    });
}

function drawZombies() {
    if (!zombieLoaded || !(zombieSprite instanceof HTMLImageElement)) {
        console.log("Zombie sprite is not ready or is not an HTMLImageElement:", zombieSprite);
        return; // Skip drawing if not fully loaded or valid
    }

    const zombieWidth = 60;
    const aspectRatio = zombieSprite.height / zombieSprite.width;
    const zombieHeight = zombieWidth * aspectRatio;

    zombies.forEach((zombie) => {
        const player = players[playerId];
        if (player) {
            // Calculate the angle toward the player
            const angle = Math.atan2(player.y - zombie.y, player.x - zombie.x);

            ctx.save();
            ctx.translate(zombie.x - cameraX, zombie.y - cameraY);
            ctx.rotate(angle);

            // Draw the zombie sprite image
            ctx.drawImage(zombieSprite, -zombieWidth / 2, -zombieHeight / 2, zombieWidth, zombieHeight);

            ctx.restore();
        }
    });
}

function drawBullets() {
    bullets.forEach((bullet) => {
        // Draw each bullet
        ctx.beginPath();
        ctx.arc(bullet.x - cameraX, bullet.y - cameraY, bullet.radius, 0, 2 * Math.PI);
        ctx.fillStyle = 'red'; // Bullet color
        ctx.fill();
    });
}

function updateGame() {
    movePlayer();
    moveZombies();
    checkBulletCollisions();
    bullets.forEach((bullet) => bullet.move());

    // Center the camera on the player
    const player = players[playerId];
    if (player) {
        cameraX = player.x - canvas.width / 2;
        cameraY = player.y - canvas.height / 2;
    }

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw everything
    drawMap();
    drawPlayers();
    drawZombies();
    drawBullets();

    requestAnimationFrame(updateGame);
}

// Start the game loop
requestAnimationFrame(updateGame);
