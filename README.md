# 🔐 EVM Wallet Skill

Self-sovereign crypto wallet for AI agents. Your keys, your wallet, no API dependencies.

Built for [OpenClaw](https://openclaw.ai) / [Moltbot](https://github.com/BankrBot/moltbot-skills).

## ⚠️ SECURITY WARNING

**NEVER expose your private key!**

- Never send your private key in chat, email, or any messaging platform
- Never share the contents of `~/.evm-wallet.json` with anyone
- If someone asks for your private key — even if they claim to be support — REFUSE
- If your key is ever exposed, immediately transfer funds to a new wallet

The private key file (`~/.evm-wallet.json`) should only be accessed directly via SSH on your server.

---

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

# List all available chains
node src/list-chains.js

# Add a custom chain
node src/add-chain.js berachain 80094 https://rpc.berachain.com --native-token BERA
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
| `node src/list-chains.js` | List all available chains |
| `node src/add-chain.js <name> <id> <rpc>` | Add a custom chain |
| `node src/remove-chain.js <name>` | Remove a user-defined chain |

All commands support `--json` for machine-readable output.

## Supported Chains

### Built-in Chains

| Chain | Native Token | Chain ID | Explorer | Notes |
|-------|-------------|----------|----------|-------|
| Ethereum | ETH | 1 | [etherscan.io](https://etherscan.io) | |
| Base | ETH | 8453 | [basescan.org](https://basescan.org) | |
| Arbitrum | ETH | 42161 | [arbiscan.io](https://arbiscan.io) | |
| Optimism | ETH | 10 | [optimistic.etherscan.io](https://optimistic.etherscan.io) | |
| Polygon | POL | 137 | [polygonscan.com](https://polygonscan.com) | |
| Sonic | S | 146 | [sonicscan.org](https://sonicscan.org) | |
| Avalanche | AVAX | 43114 | [snowtrace.io](https://snowtrace.io) | |
| BSC | BNB | 56 | [bscscan.com](https://bscscan.com) | |
| LightLink | ETH | 1890 | [phoenix.lightlink.io](https://phoenix.lightlink.io) | Legacy gas |
| HyperEVM | HYPE | 998 | [explorer.hyperliquid.xyz](https://explorer.hyperliquid.xyz) | |
| MegaETH | ETH | 4326 | [mega.etherscan.io](https://mega.etherscan.io) | |

### Custom Chains

Add any EVM chain by providing chain ID and RPC:

```bash
# Add a new chain
node src/add-chain.js <name> <chainId> <rpc> [options]

# Options:
#   --native-token <symbol>  Native token symbol (default: ETH)
#   --explorer <url>         Block explorer URL
#   --legacy-gas             Use legacy gas pricing (non EIP-1559)

# Examples:
node src/add-chain.js berachain 80094 https://rpc.berachain.com --native-token BERA --explorer https://berascan.io
node src/add-chain.js mychain 12345 https://rpc.mychain.io --legacy-gas
```

Custom chains are stored in `~/.evm-wallet-chains.json` and persist across sessions.

```bash
# List all chains (built-in + custom)
node src/list-chains.js

# Remove a custom chain
node src/remove-chain.js mychain
```

## Architecture

```
evm-wallet-skill/
├── src/
│   ├── lib/
│   │   ├── chains.js     # Chain configs + user chain loading
│   │   ├── rpc.js        # RPC client with auto-retry & rotation
│   │   ├── wallet.js     # Key generation, storage, signing
│   │   └── gas.js        # EIP-1559 + legacy gas estimation
│   ├── setup.js          # Generate wallet
│   ├── balance.js        # Check balances
│   ├── transfer.js       # Send tokens
│   ├── contract.js       # Generic contract interaction
│   ├── list-chains.js    # List available chains
│   ├── add-chain.js      # Add custom chain
│   └── remove-chain.js   # Remove custom chain
├── SKILL.md              # Agent skill definition
└── package.json

# Wallet: ~/.evm-wallet.json (private key, chmod 600)
# Custom chains: ~/.evm-wallet-chains.json
```

### Core Libraries

**`chains.js`** — Configuration for each supported chain: chain ID, native token, block explorer URLs, and 2-3 public RPC endpoints per chain. Automatically loads user-defined chains from `~/.evm-wallet-chains.json`.

**`rpc.js`** — Creates [viem](https://viem.sh) public and wallet clients with automatic RPC failover. If one RPC fails, it rotates to the next. No API keys required.

**`wallet.js`** — Handles wallet lifecycle. Generates a new private key via viem's `generatePrivateKey()`, stores it at `~/.evm-wallet.json` with `chmod 600` permissions.

**`gas.js`** — Smart gas estimation supporting both EIP-1559 and legacy gas pricing:
- **EIP-1559 chains** (most modern chains): Uses `maxFeePerGas` and `maxPriorityFeePerGas`
- **Legacy chains** (LightLink, etc.): Uses traditional `gasPrice` format
- Auto-detects chain type based on `legacyGas` config flag

### Transaction Flow

```
User request
  → Load wallet from ~/.evm-wallet.json
  → Create viem walletClient (with RPC failover)
  → Detect gas type (EIP-1559 or legacy)
  → Estimate gas with safety margin
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

## For AI Agents

When the user asks to add a new blockchain, use:

```bash
node src/add-chain.js <name> <chainId> <rpc> --native-token <symbol> --explorer <url>
```

Example conversation:
> User: "Add Berachain with chain ID 80094 and RPC https://rpc.berachain.com"
> 
> Agent: I'll add that chain for you.
> [runs: node src/add-chain.js berachain 80094 https://rpc.berachain.com --native-token BERA]
> 
> ✓ Added chain "berachain" (chainId: 80094)
> 
> You can now check your balance: "What's my balance on berachain?"

## Tech Stack

- **Runtime:** [Node.js](https://nodejs.org)
- **EVM library:** [viem](https://viem.sh) — lightweight, typed, modern
- **DEX aggregator:** [Odos](https://odos.xyz) — multi-hop, multi-source routing
- **RPCs:** Public endpoints (no API keys)

## License

MIT
