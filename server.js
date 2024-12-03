const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const leaderboardRoutes = require('./services/api'); // Import the API router
const Web3 = require("web3");

const app = express();
const port = 3000;

// Enable CORS for frontend access
app.use(cors());
app.use(bodyParser.json()); // Add body parser for JSON requests

// Rate limiter: 2 requests per second to avoid rate limits
const apiLimiter = rateLimit({
  windowMs: 5000, // 5 seconds
  max: 2,         // 2 requests per 5 seconds
  message: "Too many requests, please try again later.",
});

// Mount API routes with rate limiting
app.use('/api', apiLimiter, leaderboardRoutes);

// Root Route
app.get('/', (req, res) => {
  res.send('Welcome to the WIN Token Leaderboard API!');
});

// Start Server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
