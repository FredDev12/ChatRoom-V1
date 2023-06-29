
const chatForm = document.getElementById('chat-form');
const chatMessages = document.querySelector('.chat-messages');
const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');

// Obtenir le pseudonyme, le username et le room à partir de l'URL
const { pseudonyme, username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const socket = io();

// iscription
socket.emit('inscription', { pseudonyme, username });

// Join chatroom
socket.emit('joinRoom', { pseudonyme, room });

// Obtenir room et users
socket.on('roomUsers', ({ room, users }) => {
  outputRoomName(room);
  outputUsers(users);
});

// Message from server
socket.on('message', (message) => {
  // console.log(message);
  outputMessage(message);

  // Scroll down
  chatMessages.scrollTop = chatMessages.scrollHeight;
  console.log(`user : ${message.message}`);
  
});

socket.on('messages', (message) => {
  // Afficher les messages dans la fenêtre de chat
  message.forEach((message) => {
    outputMessage(message);
  });

  // Scroll down
  chatMessages.scrollTop = chatMessages.scrollHeight;
  console.log(`db : ${[message.message]}`);
});

socket.emit('message');




// Réception de l'événement "redirect"
socket.on('redirect', (url) => {
  // Redirection vers la page spécifiée dans l'URL
  window.location.href = url;
});


// Message submit
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();

  // Get message text
  let msg = e.target.elements.msg.value;

  msg = msg.trim();

  if (!msg) {
    return false;
  }

  // Emit message to server
  socket.emit('chatMessage', msg);

  // Clear input
  e.target.elements.msg.value = '';
  e.target.elements.msg.focus();

});

// Output message to DOM
function outputMessage(message) {
  const div = document.createElement('div');
  div.classList.add('message');

  div.innerHTML = `<p class="meta">${message.pseudonyme} <span>${message.time}</span></p>
  <p class="text">${message.message}</p>`;

  document.querySelector('.chat-messages').appendChild(div);
}

// Add room name to DOM
function outputRoomName(room) {
  roomName.innerText = room.room;
}

// Add users to DOM
function outputUsers(users) {
  userList.innerHTML = `
    ${users.map(user => `<li>${user.pseudonyme}</li>`).join('')}
  `;
}


//Prompt the user before leave chat room
document.getElementById('leave-btn').addEventListener('click', () => {
  const leaveRoom = confirm('Voulez-vous vraiment quitter le chatroom?');
  if (leaveRoom) {
    window.location = '../login.html';
  } else {
  }
});


