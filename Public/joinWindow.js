const joinWindow = document.getElementById('joinWindow');
const joinLobbyBtn = document.getElementById('joinLobbyBtn');
const closeWindow = document.getElementsByClassName('close')[0];
const submit = document.getElementById('submit');
const codeInput = document.getElementById('lobbyCode');

// Show the window when Join Lobby button is clicked
joinLobbyBtn.onclick = function() {
    joinWindow.style.display = 'block';
}

// Close the window when the 'x' is clicked
closeWindow.onclick = function() {
    joinWindow.style.display = 'none';
}

// Close the window when clicking outside of the modal
window.onclick = function(event) {
    if (event.target == joinWindow) {
        joinWindow.style.display = 'none';
    }
}

// Submit the lobby code (for now just logs the input)
submit.onclick = function() {
    const lobbyCode = codeInput.value;
    console.log('Lobby Code:', lobbyCode);
    joinWindow.style.display = 'none'; // Close the window
}
