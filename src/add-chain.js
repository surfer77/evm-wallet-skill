#!/usr/bin/env node
/**
 * Add a custom EVM chain
 * 
 * Usage: node src/add-chain.js <name> <chainId> <rpc> [options]
 * 
 * Options:
 *   --native-token <symbol>  Native token symbol (default: ETH)
 *   --decimals <num>         Native token decimals (default: 18)
 *   --explorer <url>         Block explorer URL
 *   --legacy-gas             Use legacy gas pricing (required for some chains)
 *   --json                   Output as JSON
 * 
 * Examples:
 *   node src/add-chain.js berachain 80094 https://rpc.berachain.com --native-token BERA
 *   node src/add-chain.js mychain 12345 https://rpc.mychain.io --legacy-gas
 *   node src/add-chain.js customl2 99999 https://rpc.custom.io --explorer https://scan.custom.io
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const USER_CHAINS_PATH = join(homedir(), '.evm-wallet-chains.json');

/**
 * Load existing user chains
 */
function loadUserChains() {
  if (!existsSync(USER_CHAINS_PATH)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(USER_CHAINS_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

/**
 * Save user chains to config file
 */
function saveUserChains(chains) {
  writeFileSync(USER_CHAINS_PATH, JSON.stringify(chains, null, 2));
}

/**
 * Parse command line arguments
 */
function parseArgs(args) {
  const result = {
    name: null,
    chainId: null,
    rpc: null,
    nativeToken: 'ETH',
    decimals: 18,
    explorer: null,
    legacyGas: false,
    json: false
  };
  
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    
    if (arg === '--native-token' && args[i + 1]) {
      result.nativeToken = args[++i];
    } else if (arg === '--decimals' && args[i + 1]) {
      result.decimals = parseInt(args[++i], 10);
    } else if (arg === '--explorer' && args[i + 1]) {
      result.explorer = args[++i];
    } else if (arg === '--legacy-gas') {
      result.legacyGas = true;
    } else if (arg === '--json') {
      result.json = true;
    } else if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      // Positional arguments: name, chainId, rpc
      if (!result.name) {
        result.name = arg;
      } else if (!result.chainId) {
        result.chainId = parseInt(arg, 10);
      } else if (!result.rpc) {
        result.rpc = arg;
      }
    }
    i++;
  }
  
  return result;
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
Add a custom EVM chain

Usage: node src/add-chain.js <name> <chainId> <rpc> [options]

Arguments:
  name        Chain identifier (e.g., "berachain", "mychain")
  chainId     Numeric chain ID (e.g., 80094)
  rpc         RPC endpoint URL (e.g., https://rpc.berachain.com)

Options:
  --native-token <symbol>  Native token symbol (default: ETH)
  --decimals <num>         Native token decimals (default: 18)
  --explorer <url>         Block explorer URL
  --legacy-gas             Use legacy gas pricing (for chains that don't support EIP-1559)
  --json                   Output as JSON
  -h, --help               Show this help

Examples:
  # Add Berachain
  node src/add-chain.js berachain 80094 https://rpc.berachain.com --native-token BERA --explorer https://berascan.io

  # Add a chain with legacy gas (like LightLink)
  node src/add-chain.js mylegacychain 12345 https://rpc.legacy.io --legacy-gas

  # Minimal (just name, chainId, RPC)
  node src/add-chain.js testnet 99999 https://rpc.testnet.io

Config file: ~/.evm-wallet-chains.json
  `);
}

/**
 * Main
 */
function main() {
  const args = process.argv.slice(2);
  const opts = parseArgs(args);
  
  // Validate required arguments
  if (!opts.name || !opts.chainId || !opts.rpc) {
    if (!opts.json) {
      console.error('Error: Missing required arguments (name, chainId, rpc)');
      console.error('Run with --help for usage information');
    } else {
      console.log(JSON.stringify({ success: false, error: 'Missing required arguments' }));
    }
    process.exit(1);
  }
  
  // Validate chainId
  if (isNaN(opts.chainId) || opts.chainId <= 0) {
    if (!opts.json) {
      console.error(`Error: Invalid chainId: ${opts.chainId}`);
    } else {
      console.log(JSON.stringify({ success: false, error: 'Invalid chainId' }));
    }
    process.exit(1);
  }
  
  // Validate RPC URL
  try {
    new URL(opts.rpc);
  } catch {
    if (!opts.json) {
      console.error(`Error: Invalid RPC URL: ${opts.rpc}`);
    } else {
      console.log(JSON.stringify({ success: false, error: 'Invalid RPC URL' }));
    }
    process.exit(1);
  }
  
  // Build chain config
  const chainKey = opts.name.toLowerCase().replace(/\s+/g, '-');
  const chainConfig = {
    chainId: opts.chainId,
    name: opts.name,
    nativeToken: {
      symbol: opts.nativeToken,
      decimals: opts.decimals
    },
    rpcs: [opts.rpc]
  };
  
  if (opts.explorer) {
    try {
      new URL(opts.explorer);
      chainConfig.explorer = {
        name: `${opts.name} Explorer`,
        url: opts.explorer
      };
    } catch {
      if (!opts.json) {
        console.warn(`Warning: Invalid explorer URL, skipping: ${opts.explorer}`);
      }
    }
  }
  
  if (opts.legacyGas) {
    chainConfig.legacyGas = true;
  }
  
  // Load existing user chains and add new one
  const userChains = loadUserChains();
  const isUpdate = chainKey in userChains;
  userChains[chainKey] = chainConfig;
  
  // Save
  saveUserChains(userChains);
  
  // Output
  if (opts.json) {
    console.log(JSON.stringify({
      success: true,
      action: isUpdate ? 'updated' : 'added',
      chain: chainKey,
      config: chainConfig,
      configPath: USER_CHAINS_PATH
    }));
  } else {
    console.log(`✓ ${isUpdate ? 'Updated' : 'Added'} chain "${chainKey}" (chainId: ${opts.chainId})`);
    console.log(`  RPC: ${opts.rpc}`);
    console.log(`  Native token: ${opts.nativeToken}`);
    if (opts.explorer) console.log(`  Explorer: ${opts.explorer}`);
    if (opts.legacyGas) console.log(`  Legacy gas: enabled`);
    console.log(`\nConfig saved to: ${USER_CHAINS_PATH}`);
    console.log(`\nYou can now use: node src/balance.js ${chainKey}`);
  }
}

main();
