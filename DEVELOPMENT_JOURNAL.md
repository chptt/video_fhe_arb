# PrivateStream FHE — AI-Assisted Development Journal

**Developer:** Chandana Shajith
**Project:** PrivateStream FHE — Privacy-Preserving Encrypted Video Access Platform
**Network:** Arbitrum Sepolia (Testnet)
**Contract Address:** `0x3231cAb7111E7c3bfdc36995fa358c00E1890614`
**GitHub:** https://github.com/chptt/video_fhe_arb
**Date:** May 2026

---

## Table of Contents

1. [Project Concept Prompt](#1-project-concept-prompt)
2. [Architecture & Tech Stack Decisions](#2-architecture--tech-stack-decisions)
3. [Smart Contract Development](#3-smart-contract-development)
4. [Backend API Routes](#4-backend-api-routes)
5. [Frontend Pages & Components](#5-frontend-pages--components)
6. [Deployment Setup](#6-deployment-setup)
7. [Errors Encountered & Solutions](#7-errors-encountered--solutions)
8. [Final Deployment Checklist](#8-final-deployment-checklist)

---

## 1. Project Concept Prompt

The following was the initial prompt used to define and build the entire project:

---

> **Prompt:**
>
> Build a complete production-style deploy-ready decentralized application
> called "PrivateStream FHE" — A privacy-preserving encrypted video access
> platform on Arbitrum using Fully Homomorphic Encryption (FHE)-inspired
> architecture principles, wallet authentication, encrypted metadata storage,
> limited-time paid access, and one-campaign-per-account restrictions.
>
> **Platform Goals:**
> - Creators connect wallet (MetaMask preferred)
> - Create ONLY ONE campaign per wallet address
> - Upload an unlisted YouTube video link
> - Encrypt the video metadata before storage
> - Store encrypted metadata on Pinata IPFS
> - Set: access price, access duration, campaign title/description
> - Users pay ETH on Arbitrum Sepolia
> - Buyers receive temporary access to watch the embedded video
> - Video is playable only inside the platform
> - Campaign auto-closes after reaching $20 USD gross revenue
> - Platform deducts 10% commission, creator receives 90%
> - Existing paid users continue watching until expiry
> - New purchases blocked after sold out
>
> **Architecture Note:**
> This MVP uses encrypted metadata, encrypted access control, and
> wallet-gated decryption. Actual on-chain FHE is NOT required.
> Simulate privacy-preserving architecture suitable for future migration
> to Fhenix, Zama, or Arbitrum FHE rollups.
>
> **Blockchain:** Arbitrum Sepolia | Chain ID: 421614
>
> **Tech Stack:**
> - Frontend: Next.js App Router, TypeScript, Tailwind CSS, Framer Motion
> - Blockchain: ethers v6, wagmi, viem, MetaMask
> - Storage: Pinata IPFS
> - Encryption: AES-256-GCM
> - Backend: Next.js serverless API routes, Vercel-compatible
>
> **Smart Contract Requirements:**
> - createCampaign(), purchaseAccess(), getCampaign()
> - Revenue cap enforcement, 90/10 payment split, event emission
> - mapping(address => bool) hasCampaign — one campaign per wallet enforced on-chain
>
> **UI Style:** Cyberpunk, dark theme, glassmorphism, Framer Motion animations

---

## 2. Architecture & Tech Stack Decisions

**Prompt used:**

> Explain the FHE-inspired architecture and how encryption works in this project.
> Document clearly in README: "This MVP demonstrates FHE-inspired encrypted
> access control architecture on Arbitrum."

**Decisions made:**

| Decision | Reason |
|----------|--------|
| AES-256-GCM over actual FHE | Practical for MVP, same privacy pattern |
| Server-side decryption only | Video URL never reaches frontend in plaintext |
| On-chain access expiry | Trustless, no backend database needed |
| Pinata IPFS for metadata | Decentralized, permanent, cheap |
| Arbitrum Sepolia | Low gas fees, EVM compatible, L2 speed |
| Remix IDE for deployment | No private key in config files |

**Encryption Flow:**

```
Creator submits YouTube URL
        ↓
Server: AES-256-GCM encrypt(videoUrl, ENCRYPTION_MASTER_KEY)
        ↓
Store {ciphertext, iv, authTag} in JSON → upload to Pinata IPFS
        ↓
Store IPFS CID on-chain via createCampaign()
        ↓
Buyer purchases → accessExpiry[campaignId][buyer] stored on-chain
        ↓
Buyer requests /api/campaign/[id]/play?wallet=0x...
        ↓
Server verifies hasAccess() on Arbitrum Sepolia
        ↓
Server fetches IPFS metadata → AES-256-GCM decrypt
        ↓
Returns ONLY embed URL to frontend (never raw watch URL)
```

---

## 3. Smart Contract Development

**Prompt used:**

> Write the Solidity smart contract PrivateStreamFHE.sol with:
> - One campaign per wallet (enforced on-chain)
> - createCampaign(metadataCID, priceWei, durationSeconds)
> - purchaseAccess(campaignId) with 90/10 payment split
> - Revenue cap enforcement — soldOut when cap reached
> - hasAccess(campaignId, buyer) view function
> - Events: CampaignCreated, AccessPurchased, RevenueCapReached

**Contract deployed at:** `0x3231cAb7111E7c3bfdc36995fa358c00E1890614`

**Key functions:**

```solidity
// One campaign per wallet — enforced on-chain
mapping(address => bool) public hasCampaign;
require(!hasCampaign[msg.sender], "Already own a campaign");

// Payment split: 90% creator, 10% platform
uint256 fee     = (payment * platformFeeBps) / 10000;
uint256 creator = payment - fee;
payable(c.creator).transfer(creator);
payable(platformTreasury).transfer(fee);

// Revenue cap check
if (c.totalRevenueWei >= revenueCapWei) {
    c.soldOut = true;
    c.active  = false;
    emit RevenueCapReached(id, c.totalRevenueWei);
}
```

**Constructor parameters used:**

| Parameter | Value | Meaning |
|-----------|-------|---------|
| `_treasury` | `0x32efae774a73a4e4b835bad888e52e291c34e9ac` | Wallet receiving 10% fees |
| `_feeBps` | `1000` | 10% in basis points |
| `_revenueCapWei` | `6666666666666667` | $20 at $3000/ETH in wei |

---

## 4. Backend API Routes

**Prompt used:**

> Build all Next.js serverless API routes:
> - POST /api/ipfs/upload — encrypt video URL and upload to Pinata IPFS
> - GET /api/campaign/[id]/play — verify on-chain access then decrypt video URL
> - GET /api/campaign/[id]/access — check if wallet has valid access
> - GET /api/campaign/list — return active campaigns
> - GET /api/pricing — return ETH/USD price

**8 API routes built:**

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/ipfs/upload` | POST | Encrypt URL + upload metadata to IPFS |
| `/api/campaign/create` | POST | Check one-campaign-per-wallet eligibility |
| `/api/campaign/list` | GET | List all active campaigns |
| `/api/campaign/[id]` | GET | Get public campaign data |
| `/api/campaign/[id]/access` | GET | Check on-chain access for wallet |
| `/api/campaign/[id]/play` | GET | Verify access + decrypt video URL |
| `/api/campaign/[id]/purchase` | POST | Verify purchase transaction |
| `/api/pricing` | GET | ETH/USD price + revenue cap |

**Most critical route — `/api/campaign/[id]/play`:**

```typescript
// Step 1: Validate wallet address
// Step 2: Verify on-chain access (hasAccess contract call)
// Step 3: Fetch encrypted metadata from IPFS
// Step 4: AES-256-GCM decrypt video URL server-side
// Step 5: Return ONLY embed URL — never raw watch URL
```

---

## 5. Frontend Pages & Components

**Prompt used:**

> Build all frontend pages with cyberpunk dark theme, glassmorphism,
> Framer Motion animations. Pages needed:
> - Landing page with hero and FHE architecture explanation
> - Marketplace to browse active campaigns
> - Campaign create form with encryption flow
> - Campaign detail page with purchase button
> - Secure watch page (wallet-gated)
> - Creator dashboard with revenue analytics

**Pages built:**

| Page | Route | Description |
|------|-------|-------------|
| Landing | `/` | Hero, features, FHE note |
| Marketplace | `/marketplace` | Browse active campaigns |
| Create Campaign | `/campaign/create` | Multi-step form with encryption |
| Campaign Detail | `/campaign/[id]` | Stats, purchase button, access badge |
| Watch | `/watch/[id]` | Wallet-gated secure video player |
| Dashboard | `/dashboard` | Creator analytics, revenue progress |

**Components built:**

| Component | Purpose |
|-----------|---------|
| `WalletConnect.tsx` | MetaMask connection hook + UI |
| `PurchaseButton.tsx` | On-chain purchase with ethers.js |
| `SecurePlayer.tsx` | Sandboxed iframe video player |
| `RevenueProgress.tsx` | Animated revenue cap progress bar |
| `CountdownTimer.tsx` | Live countdown to access expiry |
| `AccessBadge.tsx` | Shows access status |
| `CampaignCard.tsx` | Campaign listing card |
| `Navbar.tsx` | Glassmorphism navbar |

---

## 6. Deployment Setup

**Prompt used:**

> Push everything to https://github.com/chptt/video_fhe_arb.git
> Also make an env.vercel for deployment.
> Deploy the contract using Remix IDE instead of Hardhat.

**Steps completed:**

### GitHub
- Remote added: `https://github.com/chptt/video_fhe_arb.git`
- 46 files committed and pushed
- `vercel.json` created with build configuration
- `.env.example` created (no secrets)
- `.env.local` and `.env.vercel` gitignored

### Smart Contract (Remix IDE)
- Opened [remix.ethereum.org](https://remix.ethereum.org)
- Pasted `PrivateStreamFHE.sol`
- Compiled with Solidity 0.8.24, optimization enabled
- Connected MetaMask → Arbitrum Sepolia (Chain ID 421614)
- Deployed with constructor parameters
- **Deployed address:** `0x3231cAb7111E7c3bfdc36995fa358c00E1890614`

### Environment Variables

All 12 variables configured in `.env.local` and `.env.vercel`:

```
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_CHAIN_ID=421614
NEXT_PUBLIC_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
NEXT_PUBLIC_CONTRACT_ADDRESS=0x3231cAb7111E7c3bfdc36995fa358c00E1890614
PINATA_JWT=<configured>
PINATA_GATEWAY_URL=https://gateway.pinata.cloud
ENCRYPTION_MASTER_KEY=<generated 64-char hex>
PLATFORM_TREASURY_ADDRESS=0x32efae774a73a4e4b835bad888e52e291c34e9ac
REVENUE_CAP_USD=20
PLATFORM_FEE_PERCENTAGE=10
ETH_USD_FALLBACK=3000
ALLOW_MOCK_PAYMENT=false
```

---

## 7. Errors Encountered & Solutions

### Error 1 — BigNumberish TypeError in Remix

**Error message:**
```
TypeError: invalid BigNumberish string: Cannot convert "run" to a BigInt
```

**Cause:** The word "run" from the compiler optimization settings was
accidentally typed into the `_revenueCapWei` constructor field.

**Solution:** Used pre-calculated value table — no browser console needed:

| ETH Price | `_revenueCapWei` |
|-----------|-----------------|
| $3,000 | `6666666666666667` |

---

### Error 2 — Wrong Network (Ethereum Sepolia vs Arbitrum Sepolia)

**Error message:**
```
insufficient funds for intrinsic transaction cost
have: 0.002 ETH  need: 0.005 ETH
```

**Cause:** MetaMask was connected to **Ethereum Sepolia** (Chain ID 11155111)
instead of **Arbitrum Sepolia** (Chain ID 421614). The 0.0869 ETH balance
was on Arbitrum Sepolia, not visible on the wrong network.

**Solution:** Switched MetaMask to Arbitrum Sepolia. Balance showed 0.0869 ETH.

---

### Error 3 — Injected Provider Not Showing in Remix

**Cause:** MetaMask was not connected to remix.ethereum.org

**Solution:**
1. Unlocked MetaMask
2. Connected MetaMask to remix.ethereum.org
3. Hard refreshed Remix (Ctrl+Shift+R)
4. "Injected Provider - MetaMask" appeared in dropdown

---

### Error 4 — Gas Price Below Base Fee

**Error message:**
```
max fee per gas less than block base fee:
maxFeePerGas: 20000000  baseFee: 20046000
```

**Cause:** MetaMask cached a stale gas price. Network base fee ticked up
by 46000 wei between estimation and submission.

**Solution:** Edited gas in MetaMask → set Max base fee to 0.05 GWEI manually.

---

### Error 5 — TypeScript Build Errors

**Errors:**
- `BigInt literals not available when targeting lower than ES2020`
- `Hardhat config type errors included in Next.js type check`

**Solutions:**
- Changed `tsconfig.json` target from `ES2017` to `ES2020`
- Added `hardhat.config.ts` and `scripts/` to tsconfig exclude list

---

### Error 6 — favicon.ico 404

**Cause:** No favicon file in `/public` directory.

**Solution:** Copied existing SVG as favicon placeholder.

---

## 8. Final Deployment Checklist

| Item | Status |
|------|--------|
| Smart contract compiled | ✅ |
| Contract deployed on Arbitrum Sepolia | ✅ |
| Contract address in env files | ✅ |
| Pinata IPFS configured | ✅ |
| Encryption key generated | ✅ |
| `.env.local` complete (12 variables) | ✅ |
| `.env.vercel` complete (12 variables) | ✅ |
| GitHub repository pushed | ✅ |
| `vercel.json` configured | ✅ |
| Build passing (zero TypeScript errors) | ✅ |
| 16 routes compiled | ✅ |
| App running locally | ✅ |
| Purchase flow working (screenshot confirmed) | ✅ |

---

## Project Links

| Resource | Link |
|----------|------|
| GitHub Repository | https://github.com/chptt/video_fhe_arb |
| Contract on Arbiscan | https://sepolia.arbiscan.io/address/0x3231cAb7111E7c3bfdc36995fa358c00E1890614 |
| Network | Arbitrum Sepolia — Chain ID 421614 |

---

*Prepared by Chandana Shajith — May 2026*
