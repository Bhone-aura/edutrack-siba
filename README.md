# EduTrack (SIBA)

EduTrack is a small single-page React app for organizing classes, schedules, and assignments. This repository is for demo and educational use. It stores all user data in the browser's localStorage and does NOT provide secure authentication or server-side storage.

Important notes:

- Data is stored in localStorage on the device and can be lost if cleared. Do NOT use this for sensitive or production data.
- Passwords are not stored in the repository; if you plan to add real users, implement server-side authentication and proper password hashing.
- Consider using services like Firebase or Auth0 for authentication and remote storage.

How to run:

1. npm install
2. npm run dev
3. Open the URL printed by Vite (usually http://localhost:5173)

License: MIT
