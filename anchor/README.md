# BasedLaunch — Anchor Program (reconstructed)

The original Rust source for the on-chain program was lost. This is a faithful
**reconstruction** built from the live deployment
(`D4pVcNw2AZfZ78QDB4nNQ6WLYb49jrH4q22xVDQqTzkn`) plus the frontend's embedded
interface. It type-checks with `cargo check`; it still needs a real
`anchor build` + `anchor test` on devnet before you trust it with funds.

> ⚠️ This program custodies user SOL. **Test thoroughly on devnet and get an audit
> before mainnet.** Treat the economic constants and the graduation/whitelist logic
> as needing review — see "Assumptions" below.

## What it implements

| Instruction | Notes |
|---|---|
| `create_token` | Mints an SPL token (6 decimals, **freeze authority renounced**), creates Metaplex metadata, initialises the bonding curve + SOL vault, and (optionally) mints the team allocation into a vesting vault. Charges a one-time fee to the fee wallet. |
| `buy` | Constant-product quote; **enforces `min_tokens_out`** (real slippage protection); enforces the whitelist window; mints tokens to the buyer; graduates at 69 SOL. |
| `sell` | Constant-product quote; **enforces `min_sol_out`**; burns seller tokens; pays SOL out of the program-owned vault by direct lamport debit (so no System Program account — matches the original ABI). |
| `claim_vested` | Linear vesting after cliff; already-claimed is inferred from the vault balance. |
| `add_to_whitelist` | Creator-only; creates a `WhitelistEntry` PDA for a wallet. |

### Preserved from the original (so the existing frontend keeps working)
- Program ID `D4pVcNw2AZfZ78QDB4nNQ6WLYb49jrH4q22xVDQqTzkn`.
- `create_token` and `buy` discriminators (standard Anchor naming).
- `BondingCurve` field order exactly as the frontend parses it (new fields are appended at the end, which the parser ignores).
- PDA seeds: `mint-authority`, `curve`, `sol-vault`, `vesting-vault`.
- Per-instruction account order the frontend already sends.

## Build & deploy

```bash
cd anchor
# prerequisites: Rust, Solana CLI, Anchor 0.30.1, yarn
anchor build
anchor keys list          # shows the program keypair pubkey
```

You have two deployment paths:

**A. Upgrade the existing program (keeps the same program ID — you hold the upgrade authority `Fgruw84ApYbqfyQRQmnCWHNcxP6sgqQBTBFJ3UfTo9US`):**
```bash
anchor build
anchor upgrade target/deploy/basedlaunch.so \
  --program-id D4pVcNw2AZfZ78QDB4nNQ6WLYb49jrH4q22xVDQqTzkn \
  --provider.cluster devnet
```
Note: existing on-chain curve accounts from the old program may not match this
layout — fine on devnet (test tokens are disposable); start clean for mainnet.

**B. Fresh deploy (new program ID — recommended for mainnet):**
```bash
anchor keys sync         # writes a new declare_id! into lib.rs + Anchor.toml
anchor build
anchor deploy --provider.cluster devnet
```
Then update the frontend `PROGRAM_ID` (`src/lib/anchor.ts`) to the new ID.

## Frontend wiring (required after deploy)

Instruction discriminators (`sha256("global:<name>")[..8]`):

| Instruction | Discriminator |
|---|---|
| create_token | `[0x54,0x34,0xcc,0xe4,0x18,0x8c,0xea,0x4b]` (unchanged) |
| buy | `[0x66,0x06,0x3d,0x12,0x01,0xda,0xeb,0xea]` (unchanged) |
| **sell** | `[0x33,0xe6,0x85,0xa4,0x01,0x7f,0x83,0xad]` (**changed** — update `SELL_DISCRIMINATOR` in `src/hooks/useSell.ts`) |
| claim_vested | `[0xd0,0xbe,0xa6,0x72,0xcb,0xe1,0x8c,0xd0]` (new) |
| add_to_whitelist | `[0x9d,0xd3,0x34,0x36,0x90,0x51,0x05,0x37]` (new) |

Other frontend changes:
1. **`useSell.ts`** — set `SELL_DISCRIMINATOR` to the value above.
2. **Decimals** — this program uses **6 decimals**. The frontend already reads the
   mint's decimals for holders; the curve math is in whole tokens and is unchanged.
3. **Whitelist** — during a token's whitelist window, `buy` requires the buyer's
   `WhitelistEntry` PDA (`["whitelist", mint, buyer]`) appended to the instruction's
   accounts (as a trailing/remaining account). Outside the window, buy is unchanged.
   Add a creator UI that calls `add_to_whitelist` to authorise wallets.
4. `claim_vested` and `add_to_whitelist` are new — add UI when ready.

## Assumptions made during reconstruction (verify before mainnet)
- **Decimals = 6**, total supply = 1,000,000,000 whole tokens.
- Virtual reserves seed: `virtual_sol = 30 SOL`, `virtual_tokens = 1e9`; graduation at
  `real_sol = 69 SOL`. Curve invariant `(virtual_sol+real_sol)·(virtual_tokens−real_tokens)=k`.
- Creation fee `CREATE_FEE_LAMPORTS = 0.02 SOL` (adjust to your $1 target).
- **Graduation freezes trading.** Real LP migration to a DEX (Raydium/Meteora) is NOT
  implemented — it needs a separate CPI integration. Until then, graduated curves stop
  trading and the vault SOL stays put.
- The original `sell` used a non-standard function name we could not recover, so this
  `sell` gets the standard discriminator for the name `sell` (hence the frontend change).

## Test
```bash
anchor test            # runs tests/basedlaunch.ts against a local validator
```
The included test is a smoke test scaffold — expand coverage (slippage bounds,
graduation, vesting math, whitelist gating) before mainnet.
