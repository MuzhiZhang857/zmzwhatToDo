// document.addEventListener('DOMContentLoaded', () => {
//     const form = document.getElementById('register-form');
//     form.addEventListener('submit', async (e) => {
//         e.preventDefault();

//         const username = document.getElementById('username').value.trim();
//         const email = document.getElementById('email').value.trim();
//         const password = document.getElementById('password').value.trim();

//         const res = await fetch('/register', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ username, email, password })
//         });

//         const data = await res.json();
//         alert(data.message);

//         if (res.ok) {
//             window.location.href = '/login.html';
//         }
//     });
// });
