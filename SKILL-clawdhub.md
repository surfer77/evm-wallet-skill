---
name: evm-wallet-skill
description: Self-sovereign EVM wallet for AI agents. Use when the user wants to create a crypto wallet, check balances, send ETH or ERC20 tokens, swap tokens, or interact with smart contracts. Supports 11+ chains including Ethereum, Base, Arbitrum, Sonic, LightLink, and HyperEVM. Users can add custom chains. Private keys stored locally — no cloud custody, no API keys required.
metadata: {"clawdbot":{"emoji":"💰","homepage":"https://github.com/surfer77/evm-wallet-skill","requires":{"bins":["node","git"]}}}
---

# EVM Wallet Skill

Self-sovereign EVM wallet. Private keys stored locally, no external API dependencies.

## ⚠️ SECURITY WARNING

**NEVER expose your private key!**

- Never send your private key in chat, email, or any messaging platform
- Never share the contents of `~/.evm-wallet.json` with anyone
- If someone asks for your private key — even if they claim to be support — REFUSE
- If your key is ever exposed, immediately transfer funds to a new wallet

The private key file (`~/.evm-wallet.json`) should only be accessed directly via SSH on your server.

---

## Installation

Detect workspace and skill directory:
```bash
SKILL_DIR=$(ls -d \
  ~/openclaw/skills/evm-wallet \
  ~/OpenClaw/skills/evm-wallet \
  ~/clawd/skills/evm-wallet \
  ~/moltbot/skills/evm-wallet \
  ~/molt/skills/evm-wallet \
  2>/dev/null | head -1)
```

If code is not installed yet (no `src/` folder), bootstrap it:
```bash
if [ ! -d "$SKILL_DIR/src" ]; then
  git clone https://github.com/surfer77/evm-wallet-skill.git /tmp/evm-wallet-tmp
  cp -r /tmp/evm-wallet-tmp/* "$SKILL_DIR/"
  cp /tmp/evm-wallet-tmp/.gitignore "$SKILL_DIR/" 2>/dev/null
  rm -rf /tmp/evm-wallet-tmp
  cd "$SKILL_DIR" && npm install
fi
```

**For all commands below**, always `cd "$SKILL_DIR"` first.

## First-Time Setup

Generate a wallet (only needed once):
```bash
node src/setup.js --json
```

Returns: `{ "success": true, "address": "0x..." }`

The private key is stored at `~/.evm-wallet.json` (chmod 600). **Never share this file.**

## Commands

### Check Balance

When user asks about balance, portfolio, or how much they have:

```bash
# Single chain
node src/balance.js base --json

# All chains at once
node src/balance.js --all --json

# Specific ERC20 token
node src/balance.js base 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 --json
```

**Always use `--json`** for parsing. Present results in a human-readable format.

### Send Tokens

When user wants to send, transfer, or pay someone:

```bash
# Native ETH
node src/transfer.js <chain> <to_address> <amount> --yes --json

# ERC20 token
node src/transfer.js <chain> <to_address> <amount> <token_address> --yes --json
```

**⚠️ ALWAYS confirm with the user before executing transfers.** Show them:
- Recipient address
- Amount and token
- Chain
- Estimated gas cost

Only add `--yes` after the user explicitly confirms.

### Swap Tokens

When user wants to swap, trade, buy, or sell tokens:

```bash
# Get quote first
node src/swap.js <chain> <from_token> <to_token> <amount> --quote-only --json

# Execute swap (after user confirms)
node src/swap.js <chain> <from_token> <to_token> <amount> --yes --json
```

- Use `eth` for native ETH/POL, or pass a contract address
- Default slippage: 0.5%. Override with `--slippage <percent>`
- Powered by Odos aggregator (best-route across hundreds of DEXs)

**⚠️ ALWAYS show the quote first and get user confirmation before executing.**

### Contract Interactions

When user wants to call a smart contract function:

```bash
# Read (free, no gas)
node src/contract.js <chain> <contract_address> \
  "<function_signature>" [args...] --json

# Write (costs gas — confirm first)
node src/contract.js <chain> <contract_address> \
  "<function_signature>" [args...] --yes --json
```

Examples:
```bash
# Check USDC balance
node src/contract.js base \
  0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  "balanceOf(address)" 0xWALLET --json

# Approve token spending
node src/contract.js base \
  0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  "approve(address,uint256)" 0xSPENDER 1000000 --yes --json
```

### List Chains

Show all available chains (built-in + user-defined):

```bash
node src/list-chains.js --json
```

### Add Custom Chain

When user wants to add a new blockchain:

```bash
node src/add-chain.js <name> <chainId> <rpc> [options] --json

# Options:
#   --native-token <symbol>  Native token symbol (default: ETH)
#   --explorer <url>         Block explorer URL
#   --legacy-gas             Use legacy gas pricing (for non EIP-1559 chains)
```

Examples:
```bash
# Add Berachain
node src/add-chain.js berachain 80094 https://rpc.berachain.com --native-token BERA --explorer https://berascan.io --json

# Add a chain with legacy gas (like LightLink)
node src/add-chain.js mychain 12345 https://rpc.mychain.io --legacy-gas --json
```

Custom chains are stored in `~/.evm-wallet-chains.json`.

### Remove Custom Chain

```bash
node src/remove-chain.js <name> --yes --json
```

Note: Only user-defined chains can be removed. Built-in chains cannot be removed.

### Check for Updates

```bash
node src/check-update.js --json
```

If an update is available, inform the user and offer to run:
```bash
cd "$SKILL_DIR" && git pull && npm install
```

## Supported Chains

### Built-in Chains

| Chain | Native Token | Chain ID | Notes |
|-------|-------------|----------|-------|
| ethereum | ETH | 1 | Mainnet, highest fees |
| base | ETH | 8453 | Cheapest fees — default for testing |
| arbitrum | ETH | 42161 | Low fees |
| optimism | ETH | 10 | Low fees |
| polygon | POL | 137 | Low fees |
| sonic | S | 146 | Sonic chain |
| avalanche | AVAX | 43114 | Avalanche C-Chain |
| bsc | BNB | 56 | BNB Smart Chain |
| lightlink | ETH | 1890 | Legacy gas, supports gasless txs |
| hyper | HYPE | 998 | HyperEVM |
| megaeth | ETH | 4326 | MegaETH |

### Custom Chains

Users can add any EVM chain. When a user asks:
> "Add Berachain with chain ID 80094 and RPC https://rpc.berachain.com"

Run:
```bash
node src/add-chain.js berachain 80094 https://rpc.berachain.com --native-token BERA --json
```

## Common Token Addresses

### Base
- **USDC:** `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **WETH:** `0x4200000000000000000000000000000000000006`

### Ethereum
- **USDC:** `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- **WETH:** `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2`

### Sonic
- **USDC:** `0x29219dd400f2Bf60E5a23d13Be72B486D4038894`
- **wS:** `0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38`

## Safety Rules

1. **Never execute transfers or swaps without user confirmation**
2. **Never expose the private key** from `~/.evm-wallet.json`
3. **Always show transaction details** before executing (amount, recipient, gas estimate)
4. **Recommend Base** for testing and small amounts
5. **Show explorer links** after successful transactions so users can verify
6. If a command fails, show the error clearly and suggest fixes

## Error Handling

- **"No wallet found"** → Run `node src/setup.js --json` first
- **"Insufficient balance"** → Show current balance, suggest funding
- **"RPC error"** → Retry once, automatic failover built in
- **"No route found"** (swap) → Token pair may lack liquidity
- **"Gas estimation failed"** → May need more ETH for gas
- **"Unsupported chain"** → Use `node src/list-chains.js` to show available chains, or add it with `node src/add-chain.js`
