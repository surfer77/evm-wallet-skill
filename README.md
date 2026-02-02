# 🔐 EVM Wallet Skill

Self-sovereign crypto wallet for AI agents. Your keys, your wallet, no API dependencies.

Built for [Moltbot](https://github.com/BankrBot/moltbot-skills) / [Clawdbot](https://github.com/clawdbot/clawdbot).

## Why?

Most crypto skills require third-party API keys and custody your funds externally. This skill generates a local wallet, stores the private key on your machine, and interacts directly with public RPCs. **You own the keys.**

## Install

```bash
clawdhub install evm-wallet-skill
```

Or clone directly:

```bash
git clone https://github.com/surfer77/evm-wallet-skill.git
cd evm-wallet-skill
npm install
```

## Quick Start

```bash
# Generate a wallet
node src/setup.js

# Check your balance
node src/balance.js base

# Send ETH
node src/transfer.js base 0x... 0.01

# Interact with any contract
node src/contract.js base 0x... "balanceOf(address)" 0x...
```

## Commands

| Command | Description |
|---------|-------------|
| `node src/setup.js` | Generate a new wallet and store it securely |
| `node src/balance.js <chain>` | Check native token balance |
| `node src/balance.js <chain> <token>` | Check ERC20 token balance |
| `node src/balance.js --all` | Check balance across all chains |
| `node src/transfer.js <chain> <to> <amount>` | Send native token (ETH/POL) |
| `node src/transfer.js <chain> <to> <amount> <token>` | Send ERC20 token |
| `node src/swap.js <chain> <from> <to> <amount>` | Swap tokens via Odos aggregator |
| `node src/contract.js <chain> <addr> <fn> [args...]` | Call any contract function |

All commands support `--json` for machine-readable output.

## Supported Chains

| Chain | Native Token | Chain ID | Explorer | Notes |
|-------|-------------|----------|----------|-------|
| Base | ETH | 8453 | [basescan.org](https://basescan.org) |
| Ethereum | ETH | 1 | [etherscan.io](https://etherscan.io) |
| Polygon | POL | 137 | [polygonscan.com](https://polygonscan.com) |
| Arbitrum | ETH | 42161 | [arbiscan.io](https://arbiscan.io) |
| Optimism | ETH | 10 | [optimistic.etherscan.io](https://optimistic.etherscan.io) |
| MegaETH | ETH | 4326 | [mega.etherscan.io](https://mega.etherscan.io) |
| LightLink | ETH | 1890 | [phoenix.lightlink.io](https://phoenix.lightlink.io) | Legacy gas, supports gasless txs |

## Architecture

```
evm-wallet-skill/
├── src/
│   ├── lib/
│   │   ├── chains.js     # Chain configs (RPCs, IDs, explorers)
│   │   ├── rpc.js        # RPC client with auto-retry & rotation
│   │   ├── wallet.js     # Key generation, storage, signing
│   │   └── gas.js        # EIP-1559 smart gas estimation
│   ├── setup.js          # Generate wallet
│   ├── balance.js        # Check balances
│   ├── transfer.js       # Send tokens
│   └── contract.js       # Generic contract interaction
├── SKILL.md              # Agent skill definition
└── package.json
# Wallet: ~/.evm-wallet.json (private key, chmod 600, never in project)
```

### Core Libraries

**`chains.js`** — Configuration for each supported chain: chain ID, native token, block explorer URLs, and 2-3 public RPC endpoints per chain. Easy to extend with new chains.

**`rpc.js`** — Creates [viem](https://viem.sh) public and wallet clients with automatic RPC failover. If one RPC fails, it rotates to the next. No API keys required — uses public endpoints from Chainlist.

**`wallet.js`** — Handles wallet lifecycle. Generates a new private key via viem's `generatePrivateKey()`, stores it at `~/.evm-wallet.json` with `chmod 600` permissions. Loads the key and returns viem account/client objects for signing transactions.

**`gas.js`** — Smart gas estimation supporting both EIP-1559 and legacy gas pricing:
- **EIP-1559 chains** (Base, Ethereum, Polygon, etc.): Analyzes last 20 blocks for optimal `maxFeePerGas` and `maxPriorityFeePerGas`
- **Legacy chains** (LightLink): Uses `gasPrice` with support for custom overrides (including 0 for gasless transactions)
- Auto-detects chain type and applies correct pricing model
- Applies 2x safety margin and 20% gas limit buffer

### Transaction Flow

```
User request
  → Load wallet from state/wallet.json
  → Create viem walletClient (with RPC failover)
  → Estimate gas (EIP-1559 smart estimation)
  → Build transaction
  → Sign locally with private key
  → Broadcast via public RPC
  → Return tx hash + explorer link
```

### Security

- **Private key never leaves the machine** — stored at `~/.evm-wallet.json` with `chmod 600`
- **Never logged or printed** — the key is loaded in memory only when signing
- **Never in the project** — wallet lives in user's home dir, not in version control
- **No external custody** — no API keys, no third-party wallets, no accounts
- **Balance validation** — checks sufficient funds before broadcasting

## Tech Stack

- **Runtime:** [Node.js](https://nodejs.org)
- **EVM library:** [viem](https://viem.sh) — lightweight, typed, modern
- **DEX aggregator:** [Odos](https://odos.xyz) — multi-hop, multi-source routing
- **RPCs:** Public endpoints (no API keys)

## Gas Pricing

The skill automatically handles gas pricing based on the chain type:

- **EIP-1559 chains** (Base, Ethereum, Polygon, Arbitrum, Optimism, MegaETH): Uses modern gas pricing with `maxFeePerGas` and `maxPriorityFeePerGas`
- **Legacy chains** (LightLink): Uses traditional `gasPrice` format

For legacy chains, you can override the gas price:

```bash
# Gasless transaction on LightLink (0 gas price)
node src/transfer.js lightlink 0x... 0.01 --gas-price 0 --yes

# Custom gas price on any chain
node src/transfer.js base 0x... 0.01 --gas-price 20
node src/contract.js lightlink 0x... "transfer(address,uint256)" 0x... 1000 --gas-price 0
```

## Roadmap

- [ ] **Token swaps** via Matcha/0x aggregator (Uniswap V2/V3/V4 + more)
- [ ] **Chainlist auto-refresh** — periodically fetch fresh RPCs
- [x] **ENS resolution** — send to `vitalik.eth`
- [ ] **Passphrase encryption** for key storage
- [ ] **Multi-wallet support**
- [ ] **Transaction history** tracking

## License

MIT
