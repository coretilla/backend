# 🟠 Coretilla Backend

Backend service for **Coretilla** – the Bitcoin Neobank, built with **NestJS**.  
This backend powers Coretilla's features, including wallet creation, gasless BTC transactions, staking, lending, borrowing, and portfolio tracking.

🔗 **Swagger API Docs:** [https://core-backend-production-0965.up.railway.app/api#/](https://core-backend-production-0965.up.railway.app/api#/)

---

## 📜 Description

Coretilla Backend provides RESTful APIs for the **Coretilla Neobank** platform.  
It handles:

- **Authentication** (Wallet signature, Account Abstraction)
- **User management**
- **Payments & deposits**
- **Finance operations** (buy BTC, stake, lending, borrowing)
- **Transaction history**

Built for **CoreDAO Testnet 2** and fully integrated with our smart contracts.

---

## 🚀 Features

- **Wallet Auth** – Sign in using wallet signature
- **Account Abstraction** – Gmail-based wallet creation
- **Gasless Payments** – No gas fees for deposits & BTC swaps
- **Stripe Integration** – USD deposits directly into Bitcoin
- **Bitcoin DeFi Tools** – Staking, lending, borrowing
- **User Dashboard API** – Profile & portfolio tracking

---

## 📦 Project Setup

### 1️⃣ Clone Repository

```bash
git clone https://github.com/coretilla/backend-coretilla.git
cd backend-coretilla
```

### 2️⃣ Install Dependencies

```bash
pnpm install
```

---

## 🛠 Running the Project

### Development

```bash
pnpm run start
```

### Watch Mode (Hot Reload)

```bash
pnpm run start:dev
```

### Production

```bash
pnpm run start:prod
```

---

## 🧪 Testing

```bash
# Unit tests
pnpm run test

# E2E tests
pnpm run test:e2e

# Coverage
pnpm run test:cov
```

---

## 📚 API Endpoints (Overview)

### **Authentication**

- `GET /auth` – Health check for auth service
- `GET /auth/nonce` – Generate nonce for wallet authentication
- `POST /auth/signin` – Sign in with wallet signature

### **Users**

- `GET /users/me` – Get current user profile
- `PATCH /users/me` – Update profile
- `GET /users/me/transactions` – Get transaction history

### **Payments**

- `POST /payments/deposits` – Create new deposit
- `GET /payments/deposits` – Get user deposits
- `POST /payments/deposits/confirm` – Confirm deposit
- `GET /payments/deposits/{id}` – Get deposit by ID

### **Finance**

- `GET /finance/btc-price` – Get current BTC price
- `POST /finance/swap` – Swap USD to BTC _(gasless)_
- `GET /finance/stake-history` – Get staking history
- `GET /finance/collateral-deposit-history` – Get collateral deposit history
- `GET /finance/loan-history` – Get loan history

📌 Full API documentation available on **Swagger**:  
[https://core-backend-production-0965.up.railway.app/api#/](https://core-backend-production-0965.up.railway.app/api#/)

---

## 📚 Additional Documentation

### 🚀 Future Development & Scalability

- **[Future Scalability Notes](./docs/future-scalability-notes.md)** - Reminder notes for performance and scalability improvements
- **[Stripe Deposit System](./docs/stripe-deposit-system.md)** - Frontend implementation guide for payments

### 🔍 Architecture Notes

#### Blockchain Indexer Integration (Future)

> **Important:** To improve query performance and reduce RPC load, consider implementing a blockchain indexer. Expected improvement: 80-90% faster (from 2-5 seconds to 200-500ms).

#### Fiat-to-Crypto Swap Scalability

> **Current Limitation:** Synchronous processing limits throughput to ~10 swaps/minute
>
> **Suggested Improvement:** Async processing with job queues, multiple price sources, and batch processing. Expected improvement: 50x throughput (500+ swaps/minute).

> See [Future Scalability Notes](./docs/future-scalability-notes.md) for full details.

---

## 📜 License

MIT License – You are free to use, modify, and distribute this code.

---
