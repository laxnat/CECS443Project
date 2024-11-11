/* ALERT POP-UP */
const customAlert = document.getElementById('customAlert');
const alertBtn = document.getElementById('alertBtn');
const alertClose = document.getElementsByClassName('alertClose')[0];

// Function to show the custom alert
function showAlert(message) {
    const alertMsg = document.getElementById('alertMessage');
    alertMsg.textContent = message;
    customAlert.style.display = 'block';
}

function showNameAlert(){
    showAlert('Please enter your name!')
}

function showLobbyAlert(){
    showAlert("Please enter a lobby name!")
}

function showJoinAlert(){
    showAlert("Please enter your name and lobby code! (or select an open lobby).")
}

// Close the alert when the 'OK' button or close 'X' is clicked
alertBtn.onclick = function() {
    customAlert.style.display = 'none';
}

alertClose.onclick = function() {
    customAlert.style.display = 'none';
}

/* START SCREEN */
const startGameBtn = document.getElementById('startGameBtn');
const playerNameInput = document.getElementById('playerName');
const startScreen = document.getElementById('startScreen');
const canvas = document.getElementById('gameCanvas');

// Listen for the "Start Game" button click
startGameBtn.addEventListener('click', () => {
    playerName = playerNameInput.value.trim();
    if (playerName) {
        startScreen.style.display = 'none';
        canvas.style.display = 'block';
        socket.emit('joinGame', { name: playerName });
    } else{
        showNameAlert();
    }
});

/* CREATE LOBBY POP-UP WINDOW */
const lobbyWindow = document.getElementById('createLobby');
const createLobbyBtn = document.getElementById('createLobbyBtn');
const createLobby = document.getElementById('create');
const nameInput = document.getElementById('lobbyName');

// Show the window when Join Lobby button is clicked
createLobbyBtn.addEventListener('click', () => {
    lobbyWindow.style.display = 'block';
});

// Submit the lobby code (for now just logs the input)
createLobby.addEventListener("click", () => {
    const lobbyName = nameInput.value.trim();
    if(lobbyName){
        console.log('Lobby Name:', lobbyName);
        lobbyWindow.style.display = 'none';
    } else {
        showLobbyAlert();
    }
})

/* JOIN LOBBY POP-UP WINDOW */
const joinWindow = document.getElementById('joinWindow');
const joinLobbyBtn = document.getElementById('joinLobbyBtn');
const join = document.getElementById('join');
const codeInput = document.getElementById('lobbyCode');

// Show the window when Join Lobby button is clicked
joinLobbyBtn.addEventListener('click', () => {
    joinWindow.style.display = 'block';
});

// Submit the lobby code (for now just logs the input)
join.addEventListener('click', () => {
    const playerName = playerNameInput.value.trim();
    const lobbyCode = codeInput.value.trim();
    if(playerName && lobbyCode) {
        console.log('Joining lobby', lobbyCode, 'as', playerName);
        joinWindow.style.display = 'none';
    } else{
        showJoinAlert();
    }
});

/* CLOSE WINDOW */
const closeBtn = document.querySelectorAll('.close'); // selects all close buttons
closeBtn.forEach(button => {
    button.onclick = function() {
        button.closest('.joinWindow, .lobbyWindow').style.display = 'none';
    }
})