import React, { useEffect, useState } from "react";
import axios from "axios";
import Web3 from "web3";
import tokenABI from "./TokenABI.json";
import "./App.css";

const winTokenAddress = "0x163f182C32d24A09d91EB75820cDe9FD5832b329";

function App() {
  const [wallet, setWallet] = useState(null);
  const [connected, setConnected] = useState(false);
  const [balance, setBalance] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false); // New state for loading

  const switchToBSC = async () => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x38" }],
      });
    } catch (error) {
      console.error("Error switching to Binance Smart Chain:", JSON.stringify(error, null, 2));
    }
  };

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      try {
        const response = await axios.get("https://sunny-enchantment-production.up.railway.app/");
        setLeaderboard(response.data);
      } catch (error) {
        console.error("Error fetching leaderboard:", JSON.stringify(error, null, 2));
        setMessage("Error fetching leaderboard.");
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, []);

  const connectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        const walletAddress = accounts[0];

        if (!Web3.utils.isAddress(walletAddress)) {
          setMessage("Invalid wallet address. Please reconnect.");
          return;
        }

        setWallet(walletAddress);
        setConnected(true);
        setMessage(`Connected Wallet: ${walletAddress}`);
        await switchToBSC();
        fetchWalletBalance(walletAddress);
      } catch (error) {
        console.error("Error connecting wallet:", JSON.stringify(error, null, 2));
        if (error.code === -32601) {
          alert("A requested method is not available. Please update MetaMask.");
        } else {
          alert("An error occurred. Check the console for details.");
        }
      }
    } else {
      alert("No Ethereum provider found. Please install MetaMask or use a compatible browser.");
    }
  };

  const fetchWalletBalance = async (address) => {
    const web3 = new Web3(window.ethereum);
    const winTokenContract = new web3.eth.Contract(tokenABI, winTokenAddress);
    try {
      const balance = await winTokenContract.methods.balanceOf(address).call();
      setBalance(web3.utils.fromWei(balance, "ether"));
    } catch (error) {
      console.error("Error fetching balance:", JSON.stringify(error, null, 2));
      setMessage("Error fetching wallet balance.");
    }
  };

  return (
    <div id="app">
      <header className="App-header">
        <h1 className="app-title">WIN DApp</h1>
        <p className="subtitle">Connect your wallet to interact with the DApp!</p>
        <button className="button-primary" onClick={connectWallet}>
          {connected ? `Connected: ${wallet}` : "Connect Wallet"}
        </button>
        {message && <p className="message">{message}</p>}
        {connected && (
          <div className="wallet-info">
            <p>Wallet: {wallet}</p>
            <p>Balance: {balance} WIN</p>
          </div>
        )}
        <h2 className="leaderboard-title">🏆 Leaderboard</h2>
        {loading ? (
          <p>Loading leaderboard...</p>
        ) : (
          <table id="leaderboard">
            <thead>
              <tr>
                <th>#</th>
                <th>Wallet Address</th>
                <th>Balance</th>
                <th>Rewards</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.length > 0 ? (
                leaderboard.map((user, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{user.address}</td>
                    <td>{Number(user.balance).toFixed(2)} WIN</td>
                    <td>{(user.balance * 0.05).toFixed(2)} WIN</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4">No data available</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </header>
    </div>
  );
}

export default App;
