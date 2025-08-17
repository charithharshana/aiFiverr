// index.js
// Handles chat logic for Gemini API Chrome extension sidepanel

document.getElementById('send-btn').addEventListener('click', async () => {
  const input = document.getElementById('user-input').value;
  if (!input) return;
  // Placeholder for Gemini API call
  const chatContainer = document.getElementById('chat-container');
  chatContainer.innerHTML += `<div>User: ${input}</div>`;
  document.getElementById('user-input').value = '';
  // TODO: Add Gemini API response here
});
