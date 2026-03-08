# StellarSplit — On-Chain Bill Splitting

> Split bills with friends. Every settlement is a real Stellar blockchain transaction.

**No Venmo. No UPI delays. No trust issues. Fully auditable forever.**

---

## ✨ Features

- 💸 **Real on-chain settlements** — each "Pay" button broadcasts a Stellar TX
- 🔐 **Freighter Wallet** support for secure browser signing
- 🧾 **Receipt-style UI** — visual bill breakdown with settlement progress bar
- 📊 **Activity log** — every TX hash linked to Stellar Expert explorer
- ⚡ 5-second finality · $0.0000015 fee per settlement
- 🎨 Neon-noir aesthetic with Syne + DM Mono fonts

---

## 🚀 Quick Start

```bash
cd stellarsplit
npm install
npm run dev
# → http://localhost:5173
```

---

## 🌐 Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
# Get live URL in 60 seconds
```

---

## 📱 How to Use

### 1. Wallets Tab
- Generate new Stellar keypairs (auto-funded via Friendbot)
- OR connect your Freighter wallet

### 2. New Bill Tab
- Enter bill title, total XLM amount, who paid
- Add all members (name + Stellar address)
- See live split preview
- Click "Create Bill"

### 3. My Bills Tab
- See all bills as receipts
- Click "Pay X XLM →" to settle on-chain
- TX confirmed in ~5 seconds
- Progress bar shows who has settled

### 4. Activity Tab
- Full log of all on-chain settlements
- TX hashes linked to Stellar Expert
- Total XLM settled across all bills

---

## 🏗️ Architecture

```
stellarsplit/
├── src/
│   ├── lib/
│   │   ├── stellar.js      ← Stellar SDK: payments, balances, Freighter
│   │   ├── useSplit.js     ← Bill state: create, settle, track
│   │   └── useWallet.js    ← Freighter React hook
│   ├── App.jsx             ← All UI (WalletsTab, CreateBill, BillsTab, ActivityTab)
│   ├── main.jsx            ← Entry + Buffer polyfill
│   └── index.css           ← Global styles + animations
├── vite.config.js
├── vercel.json
└── package.json
```

---

## 🔮 Production Upgrades

- [ ] USDC payments instead of XLM (Stellar native USDC)
- [ ] Group creation with invite links
- [ ] Push notifications when you're owed money
- [ ] QR code sharing of Stellar addresses
- [ ] Recurring splits (rent, subscriptions)
- [ ] Mainnet switch (1 line in stellar.js)

---

## 🌍 Switch to Mainnet

```js
// src/lib/stellar.js
export const HORIZON_URL        = "https://horizon.stellar.org";       // ← change
export const NETWORK_PASSPHRASE = StellarSdk.Networks.PUBLIC;          // ← change
export const NETWORK            = "PUBLIC";                             // ← change
```

Built for **Stellar Ecosystem Hackathon** · Devdock.AI project #2
