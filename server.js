// server.js
const express = require('express');
const app = express();
const http = require('http');

// Serve static files from 'public' directory
app.use(express.static('public'));

const server = http.createServer(app);

const port = 3000;
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});

