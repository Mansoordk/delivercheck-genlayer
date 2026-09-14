# DeliverCheck

DeliverCheck is a GenLayer Intelligent Contract application for trust-minimized milestone verification.

A creator defines a milestone, acceptance criteria, contributor wallet, GitHub evidence URL, reward metadata, and a deadline. The contributor submits the milestone. GenLayer validators inspect the GitHub evidence and independently corroborate a structured decision: APPROVED, REJECTED, or UNDETERMINED.

The reward field is metadata only in this version. No funds are transferred.

## Network

This project targets **GenLayer Studionet**.

| Setting | Value |
|---|---|
| Network | Studionet |
| Chain ID | 61999 |
| RPC/API | https://studio.genlayer.com/api |
| Currency | GEN |
| Explorer | https://explorer-studio.genlayer.com |

This project is not configured for Bradbury or Localnet.

## Trust model

Evidence URLs are restricted to:
- `https://github.com/`
- `https://www.github.com/`
- `https://raw.githubusercontent.com/`

During evaluation the contract retrieves the GitHub evidence, treats it as untrusted data, asks a nondeterministic evaluator for structured JSON, then independently reruns verification. A mismatch becomes `UNDETERMINED`.

The contract checks the deadline before submission and evaluation. A terminal milestone cannot simply be evaluated again because evaluation requires the `SUBMITTED` state.

## Setup

1. Open GenLayer Studio and select **Studionet** (chain 61999).
2. Deploy `contracts/deliver_check.py` and keep the contract address.
3. In `frontend/`, create `.env.local`:
   ```env
   NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS=0xYOUR_DEPLOYED_DELIVERCHECK_ADDRESS
   ```
4. Install and build:
   ```bash
   cd frontend
   npm install
   npm run build
   ```
5. Start locally:
   ```bash
   npm run dev
   ```

## Test flow

1. Connect a Studionet wallet.
2. Create a milestone with one acceptance criterion per line.
3. Use a GitHub evidence URL.
4. Switch to the contributor wallet and submit.
5. Evaluate while before the deadline.
6. Read the milestone ID to see the on-chain result.

## Transaction lifecycle

The frontend displays the transaction hash and polls the GenLayer lifecycle while waiting for finalization.

Exact timing depends on Studionet validator availability.

## Project structure

```text
delivercheck-genlayer-studionet/
├── contracts/deliver_check.py
├── frontend/
│   ├── app/page.tsx
│   ├── app/globals.css
│   ├── app/layout.tsx
│   ├── lib/genlayer.ts
│   ├── package.json
│   ├── .env.example
│   ├── next.config.ts
│   ├── tsconfig.json
│   └── next-env.d.ts
├── .gitignore
└── README.md
```

## Important limitation

This version does not hold escrow or transfer rewards. The reward field is descriptive metadata only.

Before deployment, run the GenLayer lint/validation tools available in your current Studio/CLI environment. This package does not claim that the contract has already been deployed or validated.
