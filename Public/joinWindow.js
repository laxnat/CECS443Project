// Get modal element
const joinWindow = document.getElementById('joinWindow');
const joinLobbyBtn = document.getElementById('joinLobbyBtn');
const closeWindow = document.getElementsByClassName('close')[0];
const submit = document.getElementById('submit');
const codeInput = document.getElementById('lobbyCode');

// Show the modal when Join Lobby button is clicked
joinLobbyBtn.onclick = function() {
    joinWindow.style.display = 'block';
}

// Close the modal when the 'x' is clicked
closeWindow.onclick = function() {
    joinWindow.style.display = 'none';
}

// Close the modal when clicking outside of the modal
window.onclick = function(event) {
    if (event.target == joinWindow) {
        joinWindow.style.display = 'none';
    }
}

// Submit the lobby code (for now just logs the input)
submit.onclick = function() {
    const lobbyCode = codeInput.value;
    console.log('Lobby Code:', lobbyCode);
    joinWindow.style.display = 'none'; // Close the modal
    // Add further logic here to handle joining the lobby with the lobby code
}
