import { useEffect, useState } from "react";
import { BrowserProvider, Contract } from "ethers";
import ccAbi from "./CarbonCreditABI.json";
import mAbi from "./FixedPriceMarketABI.json";

// Fill these in after running scripts/deploy.ts
const CARBON_CREDIT_ADDRESS = "PASTE_CARBON_CREDIT_ADDRESS";
const MARKET_ADDRESS = "PASTE_MARKET_ADDRESS";

export default function App() {
  const [account, setAccount] = useState("");
  const [carbonCredit, setCarbonCredit] = useState(null);
  const [market, setMarket] = useState(null);
  const [balance, setBalance] = useState("0");
  const [listAmount, setListAmount] = useState("");
  const [listPrice, setListPrice] = useState("");
  const [retireAmount, setRetireAmount] = useState("");
  const [retireReason, setRetireReason] = useState("");
  const [status, setStatus] = useState("");

  async function connectWallet() {
    if (!window.ethereum) {
      setStatus("MetaMask not detected. Please install it to continue.");
      return;
    }
    const provider = new BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    setAccount(await signer.getAddress());
    setCarbonCredit(new Contract(CARBON_CREDIT_ADDRESS, ccAbi, signer));
    setMarket(new Contract(MARKET_ADDRESS, mAbi, signer));
  }

  async function refreshBalance() {
    if (!carbonCredit || !account) return;
    const raw = await carbonCredit.balanceOf(account);
    setBalance(raw.toString());
  }

  async function handleListForSale() {
    try {
      const approveTx = await carbonCredit.approve(MARKET_ADDRESS, listAmount);
      await approveTx.wait();
      const listTx = await market.list(listAmount, listPrice);
      await listTx.wait();
      setStatus(`Listed ${listAmount} credits at ${listPrice} wei each.`);
      await refreshBalance();
    } catch (err) {
      setStatus(`Listing failed: ${err.reason || err.message}`);
    }
  }

  async function handleBuy(listingId, amount, pricePerUnit) {
    try {
      const cost = BigInt(amount) * BigInt(pricePerUnit);
      const tx = await market.buy(listingId, amount, { value: cost });
      await tx.wait();
      setStatus(`Purchased ${amount} credits from listing #${listingId}.`);
      await refreshBalance();
    } catch (err) {
      setStatus(`Purchase failed: ${err.reason || err.message}`);
    }
  }

  async function handleRetire() {
    try {
      const tx = await carbonCredit.retire(retireAmount, retireReason, "ipfs://retirement-claim");
      await tx.wait();
      setStatus(`Retired ${retireAmount} credits. This action is permanent.`);
      await refreshBalance();
    } catch (err) {
      setStatus(`Retirement failed: ${err.reason || err.message}`);
    }
  }

  useEffect(() => {
    if (carbonCredit && account) refreshBalance();
  }, [carbonCredit, account]);

  return (
    <div style={{ maxWidth: 720, margin: "2rem auto", fontFamily: "ui-sans-serif, system-ui" }}>
      <h1>Carbon Credit Marketplace (Simulated)</h1>
      <p style={{ color: "#666" }}>
        Demo / student project — credits are simulated and are not officially verified offsets.
      </p>

      {!account ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <p>
          Connected: <code>{account}</code>
        </p>
      )}

      <h3>My Balance: {balance} sCO2</h3>

      <section>
        <h3>List Credits For Sale</h3>
        <input placeholder="Amount" value={listAmount} onChange={(e) => setListAmount(e.target.value)} />
        <input placeholder="Price per unit (wei)" value={listPrice} onChange={(e) => setListPrice(e.target.value)} />
        <button onClick={handleListForSale}>List for Sale</button>
      </section>

      <section>
        <h3>Retire Credits</h3>
        <input placeholder="Amount" value={retireAmount} onChange={(e) => setRetireAmount(e.target.value)} />
        <input placeholder="Reason" value={retireReason} onChange={(e) => setRetireReason(e.target.value)} />
        <button onClick={handleRetire}>Retire (Permanent)</button>
      </section>

      {status && <p style={{ marginTop: "1rem", fontWeight: "bold" }}>{status}</p>}
    </div>
  );
}
