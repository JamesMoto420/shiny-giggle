const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const Web3 = require("web3");
const NodeCache = require("node-cache");
const tokenABI = require("./TokenABI.json");

const leaderboardCache = new NodeCache({ stdTTL: 60 }); // Cache data for 60 seconds

// Initialize Web3 with an optimized RPC provider
const web3 = new Web3("https://rpc.ankr.com/bsc"); // Replace with a dedicated RPC endpoint

// WIN Token Details
const winTokenAddress = "0x163f182C32d24A09d91EB75820cDe9FD5832b329"; // WIN token contract address

// WIN Token Contract Instance
const winTokenContract = new web3.eth.Contract(tokenABI, winTokenAddress);
const CACHE_FILE = path.resolve(__dirname, "leaderboard_cache.json");

// Fetch token holders
const fetchTokenHolders = async () => {
  try {
    const latestBlock = await web3.eth.getBlockNumber(); // Get the latest block number
    const chunkSize = 5000; // Fetch larger chunks to reduce requests
    const balances = {};

    console.log("Fetching token holders...");
    for (let startBlock = latestBlock - 50000; startBlock <= latestBlock; startBlock += chunkSize) {
      const endBlock = Math.min(startBlock + chunkSize - 1, latestBlock);
      console.log(`Processing blocks ${startBlock} to ${endBlock}...`);

      // Fetch transfer events within the block range
      const transferEvents = await winTokenContract.getPastEvents("Transfer", {
        fromBlock: startBlock,
        toBlock: endBlock,
      });

      transferEvents.forEach(({ returnValues: { from, to, value } }) => {
        const amount = parseFloat(value) / 10 ** 18; // Convert Wei to Ether
        if (from !== "0x0000000000000000000000000000000000000000") {
          balances[from] = (balances[from] || 0) - amount;
        }
        balances[to] = (balances[to] || 0) + amount;
      });

      // Add a delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 2-second delay
    }

    return Object.entries(balances)
      .filter(([_, balance]) => balance > 0) // Filter positive balances
      .map(([address, balance]) => ({ address, balance }))
      .sort((a, b) => b.balance - a.balance); // Sort by balance descending
  } catch (error) {
    console.error("Error fetching token holders:", error.message);
    throw error;
  }
};

// Fetch leaderboard with caching
const fetchTokenHoldersWithCache = async () => {
  try {
    // Serve cached leaderboard if available
    if (fs.existsSync(CACHE_FILE)) {
      const cachedData = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
      console.log("Serving leaderboard from cache");
      return cachedData;
    }

    // Fetch fresh leaderboard
    const leaderboard = await fetchTokenHolders();

    // Save leaderboard to cache
    fs.writeFileSync(CACHE_FILE, JSON.stringify(leaderboard, null, 2), "utf-8");
    console.log("Leaderboard cached successfully");

    return leaderboard;
  } catch (error) {
    console.error("Error fetching leaderboard with cache:", error.message);
    throw error;
  }
};

router.get("/leaderboard", async (req, res) => {
  try {
    // Check if cached data exists
    const cachedLeaderboard = leaderboardCache.get("leaderboard");
    if (cachedLeaderboard) {
      return res.status(200).json(cachedLeaderboard); // If cache exists, return it
    }

    // Simulate leaderboard fetching (replace with actual logic)
    const leaderboard = await fetchTokenHoldersWithCache();

    // Cache the leaderboard data
    leaderboardCache.set("leaderboard", leaderboard);

    // Return the leaderboard
    return res.status(200).json(leaderboard); // Use return here to avoid sending a duplicate response
  } catch (error) {
    console.error("Error fetching leaderboard:", error.message || error);

    // Send error response
    return res.status(500).json({ error: error.message || "Failed to fetch leaderboard." });
  }
});

module.exports = router;
