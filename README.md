# 🌍 Blockchain-Powered Carbon Credit Trading Platform

A Solidity-based prototype that simulates the issuance, peer-to-peer trading, and permanent retirement of carbon credits on-chain, with a fully transparent and auditable transaction history.

> **Student / portfolio project.** All carbon credits, projects, and verification statuses in this repository are **simulated** for learning purposes. This platform does **not** issue legally recognized or officially verified carbon credits. See [Disclaimer](#-disclaimer).

![Status](https://img.shields.io/badge/status-complete-brightgreen) ![Solidity](https://img.shields.io/badge/solidity-%5E0.8.20-363636) ![Hardhat](https://img.shields.io/badge/tooling-hardhat-yellow) ![License](https://img.shields.io/badge/license-MIT-blue)

---

## 📖 Overview

Carbon markets today are fragmented across siloed registries, making it hard to verify that a credit hasn't already been sold or claimed elsewhere ("double counting"). This project demonstrates how blockchain — with tokenized credits, transparent ownership transfer, and irreversible on-chain retirement — can solve that trust problem at a technical level.

The platform models the full lifecycle of a carbon credit:

```
Simulated Project  →  Issuance  →  Tokenized Credit  →  Owner Wallet
        →  Marketplace Listing  →  Buyer Purchase  →  Ownership Transfer
        →  Retirement  →  Immutable Retirement Record
```

## 🎯 Problem Statement

Traditional carbon registries are opaque, slow to reconcile, and vulnerable to double counting and disputed ownership. Buyers and auditors have no easy way to independently verify that a credit is genuine, currently owned by the claimed party, and has not already been retired elsewhere.

## 🎯 Objectives

- Simulate transparent issuance of carbon credits by an authorized verifier role.
- Allow credits to be freely transferred and traded peer-to-peer.
- Enforce that **retired credits can never be resold, listed, or transferred again**.
- Provide a public, immutable audit trail via on-chain events.
- Package the project as a clean, GitHub-ready, interview-ready portfolio piece.

---

## 🏭 Industry Relevance

Systems like this are directly relevant to:

| Sector | Use Case |
|---|---|
| ESG Reporting | Verifiable proof of offset retirement for corporate disclosures |
| Carbon Marketplaces | Transparent order books, reduced settlement time |
| Renewable Energy | Digitizing credit issuance for solar/wind projects |
| Aviation & Logistics | Offsetting emissions with auditable retirement records |
| Climate-Tech Startups | Building compliant, traceable offset infrastructure |
| Corporate Net-Zero Programs | Preventing double counting across supply chains |

**Business value:** transparent ownership · full traceability · reduced double counting · easier third-party audits · faster digital settlement · verifiable retirement for compliance claims.

---

## 🧠 Carbon Credit Concept

**Simple explanation:** A carbon credit represents one tonne of CO₂-equivalent emissions that has been avoided or removed. Owning a credit and "retiring" it is how a company or individual claims that reduction as their own offset — and once retired, it can never be claimed by anyone else.

**Technical explanation:** In this project, one ERC-20-style token equals one simulated tonne of CO₂e. Issuance is a controlled `mint()` restricted to an authorized verifier role. Retirement is a `burn()` combined with a permanently stored on-chain record (reason, reference, timestamp), which prevents the same unit from being counted twice.

---

## ⛓️ Blockchain Concepts Demonstrated

`Smart Contracts` · `Solidity` · `Wallet Addresses` · `Tokenization` · `struct` / `enum` / `mapping` · `modifier` & `require()` · `msg.sender` · `events` for audit logging · `access control` (Admin / Verifier roles) · `immutable ledger history` · `gas & transactions` · `testnets` · `decentralized application (DApp)` architecture.

---

## 👥 Actors & Permissions

docs/screenshots/03_actors_permissions_matrix.png

| Actor | Responsibilities |
|---|---|
| **Admin** | Registers/revokes verifiers, registers projects, cannot alter retired credits |
| **Issuer / Verifier** | Issues simulated credit batches against an active project |
| **Seller** | Owns active credits, lists them on the marketplace |
| **Buyer** | Purchases listed credits, becomes the new owner |
| **Credit Owner** | Can transfer or permanently retire owned credits |

---

## 🛠️ Technology Stack

Three implementation tiers were evaluated; **Option B (Recommended)** was built in full.

| Option | Stack | Difficulty | Real Crypto Needed? |
|---|---|---|---|
| A — Easy | Solidity + Remix IDE + Remix VM | Beginner | No |
| **B — Recommended** | Solidity + Hardhat + Ethers.js + MetaMask + local testnet + React | Intermediate | No (local/test only) |
| C — Advanced | Solidity + Hardhat + Next.js + ERC-1155 + IPFS + verifier roles + analytics | Advanced | No (testnet optional) |

This repo implements: role-gated ERC-20 credit token, project registry, batch issuance, a standalone fixed-price marketplace contract, retirement with burn + audit log, a React/Ethers.js frontend, and a full Hardhat test suite.

---

## 🏗️ Architecture

![System Architecture](docs/diagrams/01_system_architecture.png)

- **Frontend:** Issuer Dashboard, Marketplace UI, Buyer Dashboard, Portfolio View, Retirement Page
- **Smart Contracts:** Issuer Registry, Carbon Credit Registry, Marketplace Contract, Transfer Logic, Retirement Registry
- **Off-chain:** Project documents, verification evidence, and metadata JSON pinned to IPFS and referenced on-chain by hash

**On-chain data:** credit/batch IDs · owner wallet · tonnes CO2e · metadata reference · status · full transfer history via events · retirement state.

---

## 📦 Carbon Credit Data Model

![Data Model and State Machine](docs/diagrams/04_data_model_state_machine.png)

| Field | Type | Description |
|---|---|---|
| `creditId` / `batchId` | `bytes32` | Unique identifier |
| `projectName` | `string` | Simulated project name |
| `projectType` | `string` | e.g. Solar, REDD+, Wind |
| `country` | `string` | Project location |
| `vintageYear` | `uint16` | Year of the emissions reduction |
| `tonnesCO2e` | `uint256` | Credit quantity issued |
| `issuer` | `address` | Verifier who issued the batch |
| `owner` | `address` | Current token holder |
| `metadataHash` | `string` | IPFS reference to supporting docs |
| `status` | `enum` | `ISSUED → ACTIVE → LISTED → TRANSFERRED → RETIRED` |
| `createdAt` | `uint256` | Issuance timestamp |

`RETIRED` is a **terminal state** — no further transitions are permitted.

---

## 🔄 Lifecycle Workflow

![Carbon Credit Lifecycle Workflow](docs/diagrams/02_credit_lifecycle_workflow.png)

1. **Issuance** — Verifier calls `issueBatch()` for an active, registered project.
2. **Ownership** — Minted tokens land in the developer/owner's wallet.
3. **Listing** — Owner approves the marketplace and calls `list()`.
4. **Purchase** — Buyer calls `buy()`; tokens move seller → buyer, ETH moves buyer → seller.
5. **Transfer** — Owners can also transfer directly, peer-to-peer.
6. **Retirement** — Current owner calls `retire()`; tokens are burned and a permanent `Retirement` record is written on-chain.

---

## 🔑 Smart Contract Functions

**`CarbonCredit.sol`**
- `registerProject()` — Admin registers a simulated project's metadata.
- `setVerifier()` — Admin grants/revokes the verifier role.
- `issueBatch()` — Verifier mints credits for an active project (unique batch ID, amount > 0).
- `retire(amount, reason, reference)` — Owner burns their own credits permanently.
- `circulatingSupply()` / `retiredSupply` — Live supply metrics.

**`FixedPriceMarket.sol`**
- `list(amount, pricePerUnit)` — Seller lists approved tokens for sale.
- `cancelListing(id)` — Seller withdraws an active listing.
- `buy(id, amount)` — Buyer purchases against `msg.value`; listing auto-closes when sold out.

### Events (audit trail)
`ProjectRegistered` · `ProjectStatus` · `BatchIssued` · `Retired` · `Listed` · `ListingCancelled` · `Purchased`

---

## 🔐 Security Features

- Role-gated issuance (`onlyRole(VERIFIER_ROLE)`) prevents unauthorized minting.
- Unique batch IDs prevent duplicate/re-issuance of the same batch.
- `retire()` only burns from `msg.sender`'s own balance — no one can retire another owner's credits.
- Retired supply is monotonically increasing and tokens are permanently destroyed (irreversible).
- Marketplace uses **checks-effects-interactions**: listing state is updated *before* the external `transferFrom` and ETH payment calls, mitigating reentrancy risk.
- Marketplace never custodies tokens — `transferFrom` requires live seller approval at time of sale, so a revoked approval blocks the trade.
- Input validation on addresses, amounts, and prices throughout.

---

## 📁 Folder Structure

```
Blockchain-Carbon-Credit-Trading-Platform/
├── contracts/
│   ├── CarbonCredit.sol        # ERC-20 credit token + project registry + retirement
│   └── FixedPriceMarket.sol    # Peer-to-peer listing & purchase logic
├── scripts/
│   └── deploy.ts               # Hardhat deployment script with sample data
├── test/
│   └── CarbonCredit.test.ts    # Full automated test suite
├── frontend/
│   └── src/App.jsx             # React + Ethers.js demo UI
├── sample_metadata/
│   └── project_001.json        # Simulated off-chain project metadata
├── docs/diagrams/               # Architecture & workflow diagrams (this README)
├── screenshots/                 # Simulation proof screenshots (see below)
├── reports/                     # Project report (optional)
├── README.md
├── hardhat.config.ts
├── tsconfig.json
├── package.json
└── .gitignore
```

---

## ⚙️ Installation

```bash
git clone https://github.com/<your-username>/Blockchain-Carbon-Credit-Trading-Platform.git
cd Blockchain-Carbon-Credit-Trading-Platform
npm install
npx hardhat compile
```

## 🧪 Hardhat Testing

```bash
npx hardhat node                                   # local blockchain + funded test accounts
npx hardhat run scripts/deploy.ts --network localhost
npx hardhat test                                   # run the automated test suite
```

Covered cases include: authorized vs. unauthorized issuance, zero-amount rejection, ownership transfer correctness, retirement accounting (`retiredSupply`), event emission, listing without approval, purchase with incorrect ETH, and automatic listing closure.

## 🧪 Remix Simulation (Option A walkthrough)

1. Open [Remix IDE](https://remix.ethereum.org) and paste `CarbonCredit.sol`.
2. Compile with Solidity `^0.8.20`, deploy on **Remix VM**.
3. **Account 1 (Admin)** registers a project and grants **Account 2 (Verifier)** the verifier role.
4. **Account 2** issues a batch (e.g. 10 tonnes, vintage 2026) to **Account 3 (Seller)**.
5. **Account 3** approves and lists credits on the marketplace; **Account 4 (Buyer)** purchases with test ETH.
6. **Account 4** retires the purchased credits — confirm `retiredSupply` increases.
7. Attempt to transfer/list the retired tokens again — confirm both **revert as expected**.
8. Check the emitted `BatchIssued`, `Purchased`, and `Retired` events in the Remix console.

## 💻 Optional Frontend DApp

A minimal React + Ethers.js UI (`frontend/src/App.jsx`) supports: connecting MetaMask, viewing balance, approving + listing credits for sale, purchasing listings, and retiring credits with a reason. Paste your deployed contract addresses into the constants at the top of the file to run it locally.

---

## 📸 Screenshots / Proof Checklist

The `docs/diagrams/` folder contains the architecture and workflow diagrams embedded above. For your own submission, capture and add to `screenshots/`:

| # | Screenshot | Proves |
|---|---|---|
| 1 | `01_contract_compiled.png` | Successful Solidity compilation |
| 2 | `02_contract_deployed.png` | Contract deployed on Remix VM / localhost |
| 3 | `03_issuer_registered.png` | Admin successfully registered a verifier |
| 4 | `04_credit_issued.png` | `BatchIssued` event + updated balance |
| 5 | `05_marketplace_listing.png` | Credit successfully listed for sale |
| 6 | `06_purchase_success.png` | `Purchased` event + new owner balance |
| 7 | `07_credit_retired.png` | `Retired` event + `retiredSupply` increase |
| 8 | `08_retired_transfer_blocked.png` | Reverted transaction on a retired credit |
| 9 | `09_hardhat_tests_passing.png` | `npx hardhat test` all green |
| 10 | `10_github_repo.png` | Public repository with commit history |

---

## ⚠️ Limitations & Market Integrity Considerations

Blockchain can preserve transaction history and ownership with strong guarantees, **but it cannot by itself prove that a real-world project actually removed or avoided the stated amount of CO₂**. Production systems still need trusted measurement, reporting, and verification (MRV) processes, oracle integrations, and regulatory oversight. This project also does not address: real-registry double counting across chains, KYC/sanctions screening, or dispute resolution — all flagged as future scope below.

## 🚀 Future Improvements

- Move to ERC-1155 to separate credits by vintage/project natively.
- Add an on-chain attestation/DID registry for verifier identity.
- Integrate an oracle for real-world MRV data feeds.
- Add an indexed analytics dashboard (circulating vs. retired supply over time).
- Optional KYC-gated marketplace for permissioned/regulated deployments.

## 🎓 Learning Outcomes

Practical experience with Solidity access control, ERC-20 mint/burn mechanics, event-driven audit trails, checks-effects-interactions security patterns, Hardhat testing/deployment workflows, and translating a real-world market problem into a smart contract data model.

## 📜 Disclaimer

This is an educational/portfolio project built with **simulated data and test wallets only**. It does not connect to any real carbon registry, does not issue legally recognized carbon credits, and must not be used for actual ESG or carbon-accounting claims.

## 👤 Author

**Ananya Jain**
Blockchain Course Project — Carbon Credit Trading Platform Prototype

---

*If this project helped you, consider ⭐ starring the repository.*
