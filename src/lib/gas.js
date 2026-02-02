/**
 * Smart Gas Estimation
 * Supports both EIP-1559 and legacy gas pricing
 */

import { createPublicClientWithRetry } from './rpc.js';
import { getChain } from './chains.js';

/**
 * Check if chain uses legacy gas pricing (non-EIP-1559)
 * @param {string} chainName - Chain name
 * @returns {boolean} True if chain uses legacy gas
 */
export function isLegacyGasChain(chainName) {
  try {
    const chain = getChain(chainName);
    return chain.legacyGas === true;
  } catch {
    return false;
  }
}

/**
 * Get smart gas estimation for transaction
 * Automatically detects chain type (EIP-1559 vs legacy)
 * @param {string} chainName - Chain name
 * @param {Object} [options] - Gas estimation options
 * @param {number} [options.safetyMargin] - Safety margin multiplier (default: 2)
 * @param {number} [options.priorityFeePercentile] - Priority fee percentile from recent blocks (default: 75)
 * @param {bigint} [options.gasPrice] - Override gas price for legacy chains (optional)
 * @returns {Object} Gas parameters with `type` field ('eip1559' or 'legacy')
 */
export async function estimateGas(chainName, options = {}) {
  const {
    safetyMargin = 2,
    priorityFeePercentile = 75,
    gasPrice: gasPriceOverride
  } = options;
  
  // Check if this chain uses legacy gas pricing
  if (isLegacyGasChain(chainName)) {
    return estimateLegacyGas(chainName, { gasPrice: gasPriceOverride });
  }
  
  // Use EIP-1559 estimation
  return estimateEIP1559Gas(chainName, { safetyMargin, priorityFeePercentile });
}

/**
 * Estimate gas using EIP-1559 (modern chains)
 * @param {string} chainName - Chain name
 * @param {Object} options - Estimation options
 * @returns {Object} EIP-1559 gas parameters with type 'eip1559'
 */
async function estimateEIP1559Gas(chainName, options) {
  const { safetyMargin, priorityFeePercentile } = options;
  const client = createPublicClientWithRetry(chainName);
  
  try {
    // Get latest block
    const latestBlock = await client.getBlock({ blockTag: 'latest' });
    const baseFeePerGas = latestBlock.baseFeePerGas;
    
    if (!baseFeePerGas) {
      // Chain doesn't support EIP-1559, fall back to legacy
      return estimateLegacyGas(chainName, {});
    }
    
    // Estimate priority fee from recent blocks
    const maxPriorityFeePerGas = await estimateMaxPriorityFeePerGas(
      client, 
      priorityFeePercentile
    );
    
    // Calculate max fee with safety margin
    // maxFeePerGas = safetyMargin * baseFee + maxPriorityFee
    const maxFeePerGas = baseFeePerGas * BigInt(safetyMargin) + maxPriorityFeePerGas;
    
    return {
      type: 'eip1559',
      maxFeePerGas,
      maxPriorityFeePerGas,
      baseFeePerGas,
      gasPrice: maxFeePerGas, // For backward compatibility
      estimatedCostGwei: formatGwei(maxFeePerGas),
      baseFeeGwei: formatGwei(baseFeePerGas),
      priorityFeeGwei: formatGwei(maxPriorityFeePerGas)
    };
  } catch (error) {
    // If EIP-1559 estimation fails, try legacy as fallback
    try {
      return estimateLegacyGas(chainName, {});
    } catch {
      throw new Error(`Failed to estimate gas: ${error.message}`);
    }
  }
}

/**
 * Estimate gas using legacy pricing (pre-EIP-1559 chains)
 * @param {string} chainName - Chain name
 * @param {Object} options - Estimation options
 * @param {bigint} [options.gasPrice] - Override gas price (optional)
 * @returns {Object} Legacy gas parameters with type 'legacy'
 */
async function estimateLegacyGas(chainName, options) {
  const { gasPrice: gasPriceOverride } = options;
  const client = createPublicClientWithRetry(chainName);
  
  try {
    let gasPrice;
    
    if (gasPriceOverride !== undefined) {
      // Use provided gas price override
      gasPrice = gasPriceOverride;
    } else {
      // Get gas price from RPC
      gasPrice = await client.getGasPrice();
    }
    
    return {
      type: 'legacy',
      gasPrice,
      // For backward compatibility
      maxFeePerGas: gasPrice,
      maxPriorityFeePerGas: BigInt(0),
      estimatedCostGwei: formatGwei(gasPrice)
    };
  } catch (error) {
    throw new Error(`Failed to estimate legacy gas: ${error.message}`);
  }
}

/**
 * Estimate max priority fee per gas from recent blocks
 * @param {Object} client - Viem public client
 * @param {number} percentile - Percentile to use (0-100)
 * @returns {bigint} Max priority fee per gas
 */
async function estimateMaxPriorityFeePerGas(client, percentile = 75) {
  try {
    // Get last 20 blocks to analyze priority fees
    const latestBlockNumber = await client.getBlockNumber();
    const blocksToAnalyze = 20n;
    const startBlock = latestBlockNumber - blocksToAnalyze + 1n;
    
    const priorityFees = [];
    
    // Analyze recent blocks
    for (let i = 0; i < 10; i++) { // Limit to 10 blocks for performance
      const blockNumber = startBlock + BigInt(i * 2); // Sample every other block
      
      try {
        const block = await client.getBlock({
          blockNumber,
          includeTransactions: true
        });
        
        if (block.transactions?.length > 0) {
          // Calculate priority fees for transactions in this block
          for (const tx of block.transactions.slice(0, 10)) { // Sample first 10 txs
            if (tx.maxPriorityFeePerGas && tx.maxFeePerGas) {
              priorityFees.push(tx.maxPriorityFeePerGas);
            }
          }
        }
      } catch (blockError) {
        // Skip failed blocks
        continue;
      }
    }
    
    if (priorityFees.length === 0) {
      // Fallback to a reasonable default (2 gwei)
      return BigInt(2_000_000_000);
    }
    
    // Sort and get percentile
    priorityFees.sort((a, b) => {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    });
    
    const index = Math.floor((percentile / 100) * (priorityFees.length - 1));
    const selectedFee = priorityFees[index];
    
    // Ensure minimum of 0.1 gwei
    const minPriorityFee = BigInt(100_000_000); // 0.1 gwei
    return selectedFee > minPriorityFee ? selectedFee : minPriorityFee;
  } catch (error) {
    // Fallback to reasonable default
    return BigInt(2_000_000_000); // 2 gwei
  }
}

/**
 * Estimate gas limit for a transaction
 * @param {Object} client - Viem public client
 * @param {Object} transaction - Transaction object
 * @returns {bigint} Estimated gas limit
 */
export async function estimateGasLimit(client, transaction) {
  try {
    const gasEstimate = await client.estimateGas(transaction);
    
    // Add 20% buffer to gas estimate for safety
    const buffer = gasEstimate / 5n; // 20% = 1/5
    return gasEstimate + buffer;
  } catch (error) {
    throw new Error(`Failed to estimate gas limit: ${error.message}`);
  }
}

/**
 * Format gas price to human-readable gwei
 * @param {bigint} gasPrice - Gas price in wei
 * @returns {string} Formatted gas price in gwei
 */
export function formatGwei(gasPrice) {
  const gwei = Number(gasPrice) / 1_000_000_000;
  return gwei.toFixed(2);
}

/**
 * Parse gwei to wei
 * @param {number|string} gwei - Gas price in gwei
 * @returns {bigint} Gas price in wei
 */
export function parseGwei(gwei) {
  return BigInt(Math.floor(Number(gwei) * 1_000_000_000));
}

/**
 * Get current gas prices for all supported chains
 * @param {string[]} [chainNames] - Specific chains to check, or all if not provided
 * @returns {Object} Gas prices by chain
 */
export async function getCurrentGasPrices(chainNames = null) {
  const { getSupportedChains } = await import('./chains.js');
  const chains = chainNames || getSupportedChains();
  
  const results = {};
  
  await Promise.allSettled(
    chains.map(async (chainName) => {
      try {
        const gasInfo = await estimateGas(chainName);
        results[chainName] = {
          success: true,
          ...gasInfo
        };
      } catch (error) {
        results[chainName] = {
          success: false,
          error: error.message
        };
      }
    })
  );
  
  return results;
}

/**
 * Build gas parameters for transaction based on gas type
 * @param {Object} gasEstimate - Gas estimate from estimateGas()
 * @returns {Object} Transaction gas parameters
 */
export function buildGasParams(gasEstimate) {
  if (gasEstimate.type === 'legacy') {
    return {
      gasPrice: gasEstimate.gasPrice
    };
  }
  
  // EIP-1559
  return {
    maxFeePerGas: gasEstimate.maxFeePerGas,
    maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas
  };
}
