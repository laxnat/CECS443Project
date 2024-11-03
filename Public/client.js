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
const mapWidth = 2000; // Width of the playable area
const mapHeight = 2000; // Height of the playable area
const totalMapWidth = mapWidth; // Total width including borders
const totalMapHeight = mapHeight; // Total height including borders

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
survivor.src = 'Survivor.png';

// Gun flash image
const gunFlash = new Image();
gunFlash.src = 'Flash.png';
let showFlash = false;
let flashTimeout;

// Zombie sprite
const zombieSprite = new Image();
zombieSprite.src = 'Zombie.png';

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

    // Ensure the local player has a health attribute
    if (!players[playerId]) {
        // If the player doesn't exist, initialize them
        players[playerId] = {
            health: 10, // Example: Max health of 10
            x: Math.random() * canvas.width, // Random x position
            y: Math.random() * canvas.height, // Random y position
            radius: 20, // Default radius
            color: getRandomColor(), // Function to get a random color
        };
    } else {
        // Existing player, just use the data
        players[playerId].health = players[playerId].health || 10; // Ensure health is initialized
    }
});


// Listen for new players
socket.on('newPlayer', (newPlayer) => {
    players[newPlayer.id] = newPlayer;
});

// Listen for player updates
socket.on('updatePlayers', (updatedPlayers) => {
    players = updatedPlayers;
});

socket.on('playerHit', ({ id, health }) => {
    // Update the health of the target player
    if (players[id]) {
        players[id].health = health;
    }

    // Flash red for a split second when hit
    flashRed(players[id]);

    // Optional: Log for debugging
    console.log(`Player ${id} hit! Health is now ${health}`);
});

// Function to make the player flash red temporarily
function flashRed(player) {
    const originalColor = player.color; // Store original color

    // Change color to red
    player.color = 'red';
    setTimeout(() => {
        // Reset to original color after 200ms
        player.color = originalColor;
    }, 200);
}

socket.on('playerDied', () => {
    // Handle player death
    alert("You died! Refreshing the game...");
    window.location.reload(); // Refresh the page
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
        // Calculate the new position
        let newX = player.x + dx;
        let newY = player.y + dy;

        // Clamp the new position within the map boundaries
        newX = Math.max(0, Math.min(newX, totalMapWidth));
        newY = Math.max(0, Math.min(newY, totalMapHeight));

        // Check if the position actually changed
        if (newX !== player.x || newY !== player.y) {
            // Update the player's position locally
            player.x = newX;
            player.y = newY;

            // Send the movement to the server with actual deltas
            socket.emit('move', { dx, dy });
        }
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
/*function shootBullet() {
    const player = players[playerId];
    if (player) {
        const angle = Math.atan2(mouseY - (player.y - cameraY), mouseX - (player.x - cameraX));

        // Calculate the position at the gun's tip (just in front of the player)
        const gunTipX = player.x + Math.cos(angle) * (player.radius + 5); // Adjust to align with gun length
        const gunTipY = player.y + Math.sin(angle) * (player.radius + 5);

        // Create a new bullet at the gun's tip with the correct direction
        const bullet = {
            x: gunTipX,
            y: gunTipY,
            damage: bulletDamage,
            radius: bulletSize, // Radius of the bullet
            velocityX: Math.cos(angle) * 7, // Bullet speed in X direction
            velocityY: Math.sin(angle) * 7, // Bullet speed in Y direction
            move: function () {
                this.x += this.velocityX;
                this.y += this.velocityY;
            }
        };

        bullets.push(bullet);
    }
}*/

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

function checkPlayerZombieCollisions() {
    const player = players[playerId];
    if (!player) return;

    zombies.forEach((zombie, zombieIndex) => {
        const dx = player.x - zombie.x;
        const dy = player.y - zombie.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check if the zombie is touching the player
        if (distance < player.radius + zombieSize) {
            // Notify the server of the hit and the zombie index
            socket.emit('playerHit', zombieIndex, playerId);
        }
    });
}

// Track shooting key event
document.addEventListener('mousedown', (e) => {
    shootBullet();
});

function drawMap() {
    // Draw the background map
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(-cameraX, -cameraY, totalMapWidth, totalMapHeight); // Draw the entire map area

    const gridSize = 100; // Size of each grid square

    ctx.strokeStyle = '#d0d0d0'; // Gridline color (light gray)
    ctx.lineWidth = 1; // Gridline width

    // Draw vertical gridlines
    for (let x = 0; x <= totalMapWidth; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x - cameraX, -cameraY); // From top of the map
        ctx.lineTo(x - cameraX, totalMapHeight - cameraY); // To bottom of the map
        ctx.stroke();
    }

    // Draw horizontal gridlines
    for (let y = 0; y <= totalMapHeight; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(-cameraX, y - cameraY); // From the left of the map
        ctx.lineTo(totalMapWidth - cameraX, y - cameraY); // To the right of the map
        ctx.stroke();
    }

    // Draw the border around the entire map
    ctx.strokeStyle = 'black'; // Border color
    ctx.lineWidth = 2; // Border width
    ctx.strokeRect(-cameraX, -cameraY, totalMapWidth, totalMapHeight); // Draw the border
}



// Capture mouse movements
canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left; // Adjust for canvas position
    mouseY = event.clientY - rect.top; // Adjust for canvas position
});

/*function drawPlayers() {
    const gunLength = 10;  // Tiny gun length
    const gunWidth = 5;    // Tiny gun width

    Object.values(players).forEach((player) => {
        ctx.drawImage(
            playerImage,
            player.x - cameraX - player.radius,  // Adjust for camera and player size
            player.y - cameraY - player.radius,
            player.radius * 2,  // Width of the image (diameter)
            player.radius * 2   // Height of the image (diameter)
        );

        // Calculate the angle from the player to the mouse
        const angle = Math.atan2(mouseY - (player.y - cameraY), mouseX - (player.x - cameraX));

        // Calculate the gun's position at the player's edge
        const offsetX = Math.cos(angle) * player.radius; // Gun placed at the edge of the player
        const offsetY = Math.sin(angle) * player.radius; // Gun placed at the edge of the player

        const gunX = player.x - cameraX + offsetX; // X-coordinate for gun
        const gunY = player.y - cameraY + offsetY; // Y-coordinate for gun

        // Save the current context
        ctx.save();

        // Move the origin to the gun's position
        ctx.translate(gunX, gunY);

        // Rotate the context to align the gun with the player’s orientation
        ctx.rotate(angle);

        // Draw the tiny gun as a small rectangle
        ctx.fillStyle = 'grey'; // Gun color
        ctx.fillRect(-gunLength / 2, -gunWidth / 2, gunLength, gunWidth); // Center the gun around the origin

        // Draw gun outline
        ctx.strokeStyle = 'black'; // Gun outline color
        ctx.lineWidth = 1; // Gun outline width
        ctx.strokeRect(-gunLength / 2, -gunWidth / 2, gunLength, gunWidth); // Draw the gun's outline

        // Restore the context to its original state
        ctx.restore();
    });
}*/
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
        ctx.beginPath();
        ctx.arc(bullet.x - cameraX, bullet.y - cameraY, bullet.radius, 0, 2 * Math.PI);
        ctx.fillStyle = 'gray'; // Set bullet color to gray
        ctx.fill();
    });
}

function drawPlayerHealth() {
    const player = players[playerId];
    if (player) {
        ctx.fillStyle = 'black';
        ctx.font = '20px Arial';
        ctx.fillText(`Health: ${player.health}`, 10, 30); // Display health in the top-left corner
    }
}

function updateGame() {
    movePlayer();
    moveZombies();
    checkBulletCollisions();
    checkPlayerZombieCollisions(); // Check for player-zombie collisions
    bullets.forEach((bullet) => bullet.move());

    const player = players[playerId];
    if (player) {
        cameraX = player.x - canvas.width / 2;
        cameraY = player.y - canvas.height / 2;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMap();
    drawPlayers();
    drawZombies();
    drawBullets();
    drawPlayerHealth(); // Display health

    requestAnimationFrame(updateGame);
}


// Start the game loop
requestAnimationFrame(updateGame);
