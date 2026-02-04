#!/usr/bin/env node

/**
 * Transfer Script - Send ETH or ERC20 tokens
 * Usage: 
 *   node src/transfer.js <chain> <to> <amount>                  # Send native ETH
 *   node src/transfer.js <chain> <to> <amount> <tokenAddress>   # Send ERC20
 *   node src/transfer.js <chain> <to> <amount> --gas-price 0    # Send with custom gas price
 */

import { parseEther, parseUnits, formatEther, parseAbi, isAddress, encodeFunctionData } from 'viem';
import { printUpdateNag } from './check-update.js';
import { getWalletClient, exists } from './lib/wallet.js';
import { createPublicClientWithRetry } from './lib/rpc.js';
import { getChain, getExplorerTxUrl } from './lib/chains.js';
import { estimateGas, estimateGasLimit, formatGwei, buildGasParams } from './lib/gas.js';

// Standard ERC20 ABI
const ERC20_ABI = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
]);

// Parse command line arguments
const args = process.argv.slice(2);
const jsonFlag = args.includes('--json');
const yesFlag = args.includes('--yes') || args.includes('-y');
const helpFlag = args.includes('--help') || args.includes('-h');

// Parse --gas-price flag
let customGasPrice = null;
const gasPriceIdx = args.indexOf('--gas-price');
if (gasPriceIdx !== -1 && args[gasPriceIdx + 1]) {
  const gweiValue = parseFloat(args[gasPriceIdx + 1]);
  if (!isNaN(gweiValue) && gweiValue >= 0) {
    customGasPrice = BigInt(Math.floor(gweiValue * 1_000_000_000)); // Convert gwei to wei
  }
}

function showHelp() {
  console.log(`
EVM Wallet Transfer

Usage: node src/transfer.js [options] <chain> <to> <amount> [tokenAddress]

Arguments:
  chain          Chain name (base, ethereum, polygon, arbitrum, optimism, megaeth, lightlink)
  to             Recipient address
  amount         Amount to send
  tokenAddress   ERC20 token contract address (optional, for token transfers)

Options:
  --yes          Skip confirmation prompt
  --json         Output in JSON format
  --gas-price    Custom gas price in gwei (for legacy chains, e.g., --gas-price 0 for gasless)
  --help         Show this help message

Examples:
  node src/transfer.js base 0x123... 0.01                    # Send 0.01 ETH on Base
  node src/transfer.js base 0x123... 100 0x833589fcd...      # Send 100 USDC on Base
  node src/transfer.js ethereum 0x123... 0.5 --yes          # Send 0.5 ETH, skip confirmation
  node src/transfer.js lightlink 0x123... 0.01 --gas-price 0  # Send with 0 gas price on LightLink
`);
}

function exitWithError(message, code = 1) {
  if (jsonFlag) {
    console.log(JSON.stringify({ success: false, error: message }));
  } else {
    console.error(`Error: ${message}`);
  }
  process.exit(code);
}

/**
 * Get token info (symbol, decimals, name)
 */
async function getTokenInfo(client, tokenAddress) {
  try {
    const [symbol, decimals, name] = await Promise.all([
      client.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'symbol'
      }),
      client.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'decimals'
      }),
      client.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'name'
      })
    ]);
    
    return { symbol, decimals, name };
  } catch (error) {
    throw new Error(`Failed to get token info: ${error.message}`);
  }
}

/**
 * Check token balance
 */
async function checkTokenBalance(client, tokenAddress, walletAddress) {
  try {
    const balance = await client.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [walletAddress]
    });
    return balance;
  } catch (error) {
    throw new Error(`Failed to check token balance: ${error.message}`);
  }
}

/**
 * Prompt for user confirmation
 */
async function confirm(message) {
  if (yesFlag || jsonFlag) {
    return true;
  }
  
  process.stdout.write(`${message} (y/N): `);
  
  return new Promise((resolve) => {
    process.stdin.once('data', (data) => {
      const response = data.toString().trim().toLowerCase();
      resolve(response === 'y' || response === 'yes');
    });
  });
}

async function main() {
  try {
    if (helpFlag) {
      showHelp();
      return;
    }

    // Check if wallet exists
    if (!exists()) {
      exitWithError('No wallet found. Run setup.js first to generate a wallet.');
    }

    // Parse arguments
    const filteredArgs = args.filter(arg => !arg.startsWith('--') && !arg.match(/^\d+\.?\d*$/));
    // Also need to filter out the gas price value
    const positionalArgs = [];
    for (let i = 0; i < args.length; i++) {
      if (args[i].startsWith('--')) {
        if (args[i] === '--gas-price') i++; // Skip the value too
        continue;
      }
      positionalArgs.push(args[i]);
    }
    
    const [chainName, to, amount, tokenAddress] = positionalArgs;
    
    if (!chainName || !to || !amount) {
      exitWithError('Missing required arguments. Use --help for usage information.');
    }
    
    // Validate recipient address
    if (!isAddress(to)) {
      exitWithError('Invalid recipient address.');
    }
    
    // Validate token address if provided
    if (tokenAddress && !isAddress(tokenAddress)) {
      exitWithError('Invalid token address.');
    }
    
    const chain = getChain(chainName);
    const publicClient = createPublicClientWithRetry(chainName);
    const walletClient = getWalletClient(chainName);
    const walletAddress = walletClient.account.address;
    
    let transferAmount, symbol, decimals, name;
    let isNativeTransfer = !tokenAddress;
    
    if (isNativeTransfer) {
      // Native token transfer
      transferAmount = parseEther(amount);
      symbol = chain.nativeToken.symbol;
      decimals = 18;
      name = `Native ${symbol}`;
      
      // Check ETH balance
      const balance = await publicClient.getBalance({ address: walletAddress });
      if (balance < transferAmount) {
        exitWithError(`Insufficient balance. Have: ${formatEther(balance)} ${symbol}, Need: ${amount} ${symbol}`);
      }
      
    } else {
      // ERC20 token transfer
      const tokenInfo = await getTokenInfo(publicClient, tokenAddress);
      symbol = tokenInfo.symbol;
      decimals = tokenInfo.decimals;
      name = tokenInfo.name;
      
      transferAmount = parseUnits(amount, decimals);
      
      // Check token balance
      const tokenBalance = await checkTokenBalance(publicClient, tokenAddress, walletAddress);
      if (tokenBalance < transferAmount) {
        const formattedBalance = decimals === 18 ? 
          formatEther(tokenBalance) : 
          (Number(tokenBalance) / (10 ** decimals)).toString();
        exitWithError(`Insufficient token balance. Have: ${formattedBalance} ${symbol}, Need: ${amount} ${symbol}`);
      }
    }
    
    // Estimate gas
    let gasEstimate;
    try {
      const gasOptions = {};
      if (customGasPrice !== null) {
        gasOptions.gasPrice = customGasPrice;
      }
      gasEstimate = await estimateGas(chainName, gasOptions);
      
      const gasLimitTx = isNativeTransfer ? {
        to,
        value: transferAmount,
        account: walletAddress
      } : {
        to: tokenAddress,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [to, transferAmount]
        }),
        account: walletAddress
      };
      
      const gasLimit = await estimateGasLimit(publicClient, gasLimitTx);
      gasEstimate.gasLimit = gasLimit;
    } catch (error) {
      exitWithError(`Gas estimation failed: ${error.message}`);
    }
    
    // Calculate total cost for native transfers
    const gasPriceForCalc = gasEstimate.type === 'legacy' 
      ? gasEstimate.gasPrice 
      : gasEstimate.maxFeePerGas;
    const estimatedGasCost = gasPriceForCalc * gasEstimate.gasLimit;
    const estimatedGasCostEth = formatEther(estimatedGasCost);
    
    // Build gas params for transaction
    const gasParams = buildGasParams(gasEstimate);
    
    // Show confirmation details
    const gasInfoText = gasEstimate.type === 'legacy'
      ? `Gas Price: ${formatGwei(gasEstimate.gasPrice)} gwei (legacy)`
      : `Max Fee: ${formatGwei(gasEstimate.maxFeePerGas)} gwei (EIP-1559)`;
    
    const confirmationMessage = `
🚀 Transfer Details:
  From: ${walletAddress}
  To: ${to}
  Amount: ${amount} ${symbol}${tokenAddress ? ` (${name})` : ''}
  Chain: ${chain.name}
  
⛽ Gas Estimate:
  Gas Limit: ${gasEstimate.gasLimit.toLocaleString()}
  ${gasInfoText}
  Est. Cost: ${estimatedGasCostEth} ETH
  
${isNativeTransfer ? `💰 Total Deduction: ${(parseFloat(amount) + parseFloat(estimatedGasCostEth)).toFixed(6)} ETH` : `💰 Gas Cost: ${estimatedGasCostEth} ETH (separate from token transfer)`}

Proceed with transfer?`;
    
    if (!jsonFlag) {
      console.log(confirmationMessage);
    }
    
    const confirmed = await confirm('');
    if (!confirmed) {
      if (jsonFlag) {
        console.log(JSON.stringify({ success: false, error: 'Transfer cancelled by user' }));
      } else {
        console.log('❌ Transfer cancelled.');
      }
      return;
    }
    
    // Execute transfer
    let txHash;
    try {
      if (isNativeTransfer) {
        // Send native token
        txHash = await walletClient.sendTransaction({
          to,
          value: transferAmount,
          gas: gasEstimate.gasLimit,
          ...gasParams
        });
      } else {
        // Send ERC20 token
        txHash = await walletClient.writeContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [to, transferAmount],
          gas: gasEstimate.gasLimit,
          ...gasParams
        });
      }
    } catch (error) {
      exitWithError(`Transfer failed: ${error.message}`);
    }
    
    const explorerUrl = getExplorerTxUrl(chainName, txHash);
    
    if (jsonFlag) {
      const result = {
        success: true,
        txHash,
        explorerUrl,
        from: walletAddress,
        to,
        amount,
        symbol,
        chain: chainName,
        tokenAddress: tokenAddress || null,
        gasType: gasEstimate.type,
        gasUsed: {
          gasLimit: gasEstimate.gasLimit.toString(),
          estimatedCostEth: estimatedGasCostEth
        }
      };
      
      if (gasEstimate.type === 'legacy') {
        result.gasUsed.gasPrice = gasEstimate.gasPrice.toString();
      } else {
        result.gasUsed.maxFeePerGas = gasEstimate.maxFeePerGas.toString();
        result.gasUsed.maxPriorityFeePerGas = gasEstimate.maxPriorityFeePerGas.toString();
      }
      
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('\n✅ Transfer successful!');
      console.log(`Tx Hash: ${txHash}`);
      console.log(`Explorer: ${explorerUrl}`);
      console.log(`\nSent ${amount} ${symbol} to ${to}`);
      console.log(`Gas used: ~${estimatedGasCostEth} ETH`);
      console.log('\n💡 Transaction may take a few minutes to confirm.');
    }
    
  } catch (error) {
    exitWithError(`Unexpected error: ${error.message}`);
  }
}

main().then(() => printUpdateNag()).catch(error => {
  exitWithError(`Unexpected error: ${error.message}`);
});
