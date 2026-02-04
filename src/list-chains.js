#!/usr/bin/env node
/**
 * List all available chains (built-in + user-defined)
 * 
 * Usage: node src/list-chains.js [options]
 * 
 * Options:
 *   --json     Output as JSON
 *   --verbose  Show full chain details
 */

import { chains, getSupportedChains, getUserChainsPath } from './lib/chains.js';
import { existsSync, readFileSync } from 'fs';

/**
 * Get list of user-defined chain keys
 */
function getUserChainKeys() {
  const userChainsPath = getUserChainsPath();
  if (!existsSync(userChainsPath)) return [];
  
  try {
    const userChains = JSON.parse(readFileSync(userChainsPath, 'utf-8'));
    return Object.keys(userChains);
  } catch {
    return [];
  }
}

/**
 * Main
 */
function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const verbose = args.includes('--verbose');
  
  const allChains = getSupportedChains();
  const userChainKeys = getUserChainKeys();
  
  if (jsonOutput) {
    const output = {
      total: allChains.length,
      builtIn: allChains.length - userChainKeys.length,
      userDefined: userChainKeys.length,
      chains: {}
    };
    
    for (const name of allChains) {
      const chain = chains[name];
      output.chains[name] = {
        chainId: chain.chainId,
        name: chain.name,
        nativeToken: chain.nativeToken?.symbol || 'ETH',
        explorer: chain.explorer?.url || null,
        legacyGas: chain.legacyGas || false,
        userDefined: userChainKeys.includes(name)
      };
    }
    
    console.log(JSON.stringify(output, null, 2));
    return;
  }
  
  // Human-readable output
  console.log('\n🔗 Available EVM Chains\n');
  console.log('━'.repeat(70));
  
  if (verbose) {
    // Verbose mode: full details
    for (const name of allChains) {
      const chain = chains[name];
      const isUser = userChainKeys.includes(name);
      const badge = isUser ? ' [USER]' : '';
      
      console.log(`\n${name}${badge}`);
      console.log(`  Chain ID:     ${chain.chainId}`);
      console.log(`  Name:         ${chain.name}`);
      console.log(`  Native Token: ${chain.nativeToken?.symbol || 'ETH'} (${chain.nativeToken?.decimals || 18} decimals)`);
      if (chain.explorer?.url) {
        console.log(`  Explorer:     ${chain.explorer.url}`);
      }
      if (chain.legacyGas) {
        console.log(`  Gas Type:     Legacy (non EIP-1559)`);
      }
      console.log(`  RPCs:         ${chain.rpcs?.length || 0} endpoint(s)`);
    }
  } else {
    // Compact mode: table
    console.log(`${'Chain'.padEnd(15)} ${'ID'.padEnd(8)} ${'Token'.padEnd(8)} ${'Type'.padEnd(10)} Source`);
    console.log('─'.repeat(70));
    
    for (const name of allChains) {
      const chain = chains[name];
      const isUser = userChainKeys.includes(name);
      const gasType = chain.legacyGas ? 'Legacy' : 'EIP-1559';
      const source = isUser ? 'User' : 'Built-in';
      
      console.log(
        `${name.padEnd(15)} ${String(chain.chainId).padEnd(8)} ${(chain.nativeToken?.symbol || 'ETH').padEnd(8)} ${gasType.padEnd(10)} ${source}`
      );
    }
  }
  
  console.log('\n' + '━'.repeat(70));
  console.log(`Total: ${allChains.length} chains (${allChains.length - userChainKeys.length} built-in, ${userChainKeys.length} user-defined)`);
  
  if (userChainKeys.length > 0) {
    console.log(`\nUser chains config: ${getUserChainsPath()}`);
  }
  
  console.log(`\nAdd a chain:  node src/add-chain.js <name> <chainId> <rpc> [options]`);
  console.log(`More details: node src/list-chains.js --verbose\n`);
}

main();
