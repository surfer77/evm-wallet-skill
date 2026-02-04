#!/usr/bin/env node
/**
 * Remove a user-defined chain
 * 
 * Usage: node src/remove-chain.js <name> [options]
 * 
 * Note: Only user-defined chains can be removed. Built-in chains cannot be removed.
 * 
 * Options:
 *   --json     Output as JSON
 *   --yes      Skip confirmation
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { createInterface } from 'readline';

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
 * Prompt for confirmation
 */
async function confirm(message) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const skipConfirm = args.includes('--yes') || args.includes('-y');
  
  // Get chain name (first non-flag argument)
  const chainName = args.find(arg => !arg.startsWith('-'))?.toLowerCase();
  
  if (!chainName) {
    if (jsonOutput) {
      console.log(JSON.stringify({ success: false, error: 'Chain name required' }));
    } else {
      console.error('Error: Chain name required');
      console.error('Usage: node src/remove-chain.js <name> [--yes]');
    }
    process.exit(1);
  }
  
  // Load user chains
  const userChains = loadUserChains();
  
  // Check if chain exists in user config
  if (!(chainName in userChains)) {
    if (jsonOutput) {
      console.log(JSON.stringify({ 
        success: false, 
        error: `Chain "${chainName}" not found in user config (only user-defined chains can be removed)` 
      }));
    } else {
      console.error(`Error: Chain "${chainName}" not found in user config`);
      console.error('Note: Only user-defined chains can be removed. Built-in chains cannot be removed.');
      console.error('\nUser-defined chains:', Object.keys(userChains).join(', ') || '(none)');
    }
    process.exit(1);
  }
  
  // Confirm removal
  if (!skipConfirm && !jsonOutput) {
    const chain = userChains[chainName];
    console.log(`\nChain to remove:`);
    console.log(`  Name:     ${chainName}`);
    console.log(`  Chain ID: ${chain.chainId}`);
    console.log(`  RPC:      ${chain.rpcs?.[0] || 'N/A'}`);
    
    const confirmed = await confirm('\nRemove this chain?');
    if (!confirmed) {
      console.log('Cancelled.');
      process.exit(0);
    }
  }
  
  // Remove chain
  const removedChain = userChains[chainName];
  delete userChains[chainName];
  saveUserChains(userChains);
  
  // Output
  if (jsonOutput) {
    console.log(JSON.stringify({
      success: true,
      removed: chainName,
      chainId: removedChain.chainId,
      configPath: USER_CHAINS_PATH
    }));
  } else {
    console.log(`\n✓ Removed chain "${chainName}" (chainId: ${removedChain.chainId})`);
  }
}

main();
