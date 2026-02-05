/**
 * EVM Chain Configurations
 * Includes chainId, native token, block explorers, and default public RPCs
 * Updated to support all SODAX EVM chains
 */

export const chains = {
  ethereum: {
    chainId: 1,
    name: "Ethereum",
    nativeToken: {
      symbol: "ETH",
      decimals: 18
    },
    explorer: {
      name: "Etherscan",
      url: "https://etherscan.io"
    },
    rpcs: [
      "https://ethereum.publicnode.com",
      "https://cloudflare-eth.com",
      "https://rpc.ankr.com/eth"
    ]
  },
  
  base: {
    chainId: 8453,
    name: "Base",
    nativeToken: {
      symbol: "ETH",
      decimals: 18
    },
    explorer: {
      name: "BaseScan",
      url: "https://basescan.org"
    },
    rpcs: [
      "https://mainnet.base.org",
      "https://base.publicnode.com",
      "https://base.llamarpc.com"
    ]
  },
  
  polygon: {
    chainId: 137,
    name: "Polygon",
    nativeToken: {
      symbol: "POL",
      decimals: 18
    },
    explorer: {
      name: "PolygonScan",
      url: "https://polygonscan.com"
    },
    rpcs: [
      "https://polygon-rpc.com",
      "https://polygon.publicnode.com",
      "https://rpc.ankr.com/polygon"
    ]
  },
  
  arbitrum: {
    chainId: 42161,
    name: "Arbitrum One",
    nativeToken: {
      symbol: "ETH",
      decimals: 18
    },
    explorer: {
      name: "Arbiscan",
      url: "https://arbiscan.io"
    },
    rpcs: [
      "https://arbitrum.publicnode.com",
      "https://arbitrum.llamarpc.com",
      "https://rpc.ankr.com/arbitrum"
    ]
  },
  
  optimism: {
    chainId: 10,
    name: "Optimism",
    nativeToken: {
      symbol: "ETH",
      decimals: 18
    },
    explorer: {
      name: "Optimism Etherscan",
      url: "https://optimistic.etherscan.io"
    },
    rpcs: [
      "https://optimism.publicnode.com",
      "https://optimism.llamarpc.com",
      "https://rpc.ankr.com/optimism"
    ]
  },
  
  megaeth: {
    chainId: 4326,
    name: "MegaETH",
    nativeToken: {
      symbol: "ETH",
      decimals: 18
    },
    explorer: {
      name: "Etherscan",
      url: "https://mega.etherscan.io"
    },
    rpcs: [
      "https://mainnet.megaeth.com/rpc",
      "https://rpc-megaeth-mainnet.globalstake.io"
    ],
    syncRpc: "eth_sendRawTransactionSync"
  },
  
  lightlink: {
    chainId: 1890,
    name: "LightLink",
    nativeToken: {
      symbol: "ETH",
      decimals: 18
    },
    explorer: {
      name: "LightLink Explorer",
      url: "https://phoenix.lightlink.io"
    },
    rpcs: [
      "https://replicator.phoenix.lightlink.io/rpc/v1",
      "https://1890.rpc.thirdweb.com",
      "https://endpoints.omniatech.io/v1/lightlink/phoenix/public"
    ],
    legacyGas: true
  },

  // === SODAX Additional Chains ===
  
  sonic: {
    chainId: 146,
    name: "Sonic",
    nativeToken: {
      symbol: "S",
      decimals: 18
    },
    explorer: {
      name: "Sonic Explorer",
      url: "https://sonicscan.org"
    },
    rpcs: [
      "https://rpc.soniclabs.com",
      "https://sonic.drpc.org",
      "https://rpc.ankr.com/sonic"
    ]
  },
  
  avalanche: {
    chainId: 43114,
    name: "Avalanche C-Chain",
    nativeToken: {
      symbol: "AVAX",
      decimals: 18
    },
    explorer: {
      name: "Snowtrace",
      url: "https://snowtrace.io"
    },
    rpcs: [
      "https://api.avax.network/ext/bc/C/rpc",
      "https://avalanche.publicnode.com",
      "https://rpc.ankr.com/avalanche"
    ]
  },
  
  bsc: {
    chainId: 56,
    name: "BNB Smart Chain",
    nativeToken: {
      symbol: "BNB",
      decimals: 18
    },
    explorer: {
      name: "BscScan",
      url: "https://bscscan.com"
    },
    rpcs: [
      "https://bsc-dataseed.binance.org",
      "https://bsc.publicnode.com",
      "https://rpc.ankr.com/bsc"
    ]
  },
  
  hyper: {
    chainId: 998,
    name: "HyperEVM",
    nativeToken: {
      symbol: "HYPE",
      decimals: 18
    },
    explorer: {
      name: "Hyperliquid Explorer",
      url: "https://explorer.hyperliquid.xyz"
    },
    rpcs: [
      "https://rpc.hyperliquid.xyz/evm",
      "https://api.hyperliquid.xyz/evm"
    ]
  }
};

/**
 * Get chain config by name
 * @param {string} chainName - Chain name (e.g., "base", "ethereum", "sonic")
 * @returns {Object} Chain configuration
 */
export function getChain(chainName) {
  const chain = chains[chainName.toLowerCase()];
  if (!chain) {
    throw new Error(`Unsupported chain: ${chainName}. Supported chains: ${Object.keys(chains).join(', ')}`);
  }
  return chain;
}

/**
 * Get all supported chain names
 * @returns {string[]} Array of chain names
 */
export function getSupportedChains() {
  return Object.keys(chains);
}

/**
 * Create explorer URL for transaction
 * @param {string} chainName - Chain name
 * @param {string} txHash - Transaction hash
 * @returns {string} Explorer URL
 */
export function getExplorerTxUrl(chainName, txHash) {
  const chain = getChain(chainName);
  return `${chain.explorer.url}/tx/${txHash}`;
}

/**
 * Create explorer URL for address
 * @param {string} chainName - Chain name
 * @param {string} address - Wallet address
 * @returns {string} Explorer URL
 */
export function getExplorerAddressUrl(chainName, address) {
  const chain = getChain(chainName);
  return `${chain.explorer.url}/address/${address}`;
}

// Appending missing SODAX chain
chains.kaia = {
  chainId: 8217,
  name: "Kaia",
  nativeToken: {
    symbol: "KAIA",
    decimals: 18
  },
  explorer: {
    name: "KaiaScan",
    url: "https://kaiascan.io"
  },
  rpcs: [
    "https://public-en.node.kaia.io",
    "https://kaia.blockpi.network/v1/rpc/public",
    "https://rpc.ankr.com/kaia"
  ]
};
