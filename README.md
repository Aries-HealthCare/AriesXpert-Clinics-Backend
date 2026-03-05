# AriesXpert Backend (v2.0) - Enterprise TypeScript

A production-ready, banking-grade backend for the AriesXpert Healthcare Platform, rebuilt with **NestJS** and **TypeScript**.

## 🚀 Features

- **Strict Typing**: Full TypeScript coverage for reliability.
- **Modular Architecture**: Domain-driven design (Finance, Auth, Clinical).
- **Banking-Grade Ledger**:
  - **Double-Entry Bookkeeping**: Every transaction has equal/opposite ledger entries.
  - **Immutability**: Ledger entries cannot be edited, only status-updated.
  - **Atomic Transactions**: MongoDB Sessions ensure money is never lost in transit.
- **Multi-Country Support**: Distinct pricing logic for India (Subsidized) vs Global (RevShare).

## 📂 Structure

```bash
src/
├── app.module.ts          # Root Module
├── main.ts                # Entry Point (Validation, Swagger)
├── modules/
│   ├── finance/           # Ledger, Wallet, Pricing Engine
│   │   ├── schemas/       # Mongoose Schemas (Ledger, Wallet)
│   │   ├── wallet.service.ts # Core Financial Logic
│   │   └── finance.controller.ts
│   ├── auth/              # JWT / Firebase Auth
│   ├── leads/             # Lead Management
│   └── visits/            # Clinical Visits
└── common/                # Guards, Decorators, Utils
```

## 🛠️ Setup & Run

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Environment Setup**
    Create a `.env` file:
    ```env
    MONGODB_URI=mongodb://localhost:27017/ariesxpert_v2
    PORT=3001
    JWT_SECRET=super_secure_secret
    ```

3.  **Run Development Server**
    ```bash
    npm run start:dev
    ```

4.  **API Documentation**
    Visit `http://localhost:3001/api/docs` for the interactive Swagger UI.

## 🧪 Testing

- **Unit Tests**: `npm run test`
- **E2E Tests**: `npm run test:e2e`

## 🔐 Security

- **Validation**: Global `ValidationPipe` prevents malicious payloads.
- **CORS**: Enabled for Admin Dashboard and Mobile App.
- **Audit**: All financial actions are logged to the immutable Ledger.
