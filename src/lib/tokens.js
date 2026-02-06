/**
 * Common Token Addresses by Chain
 * Includes stablecoins, wrapped natives, and Venice ecosystem tokens
 */

export const tokens = {
  base: {
    // Stablecoins
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    USDT: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    
    // Wrapped Native
    WETH: '0x4200000000000000000000000000000000000006',
    
    // Venice Ecosystem
    DIEM: '0xf4d97f2da56e8c3098f3a8d538db630a2606a024',
    VVV: '0x5b2d8b2e2a8d7e8d3f0b8c6b5b3d1c0e4e3f2d1a', // Venice VVV token (stake for DIEM)
  },
  
  ethereum: {
    // Stablecoins
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EesE3dF831d7e5d',
    
    // Wrapped Native
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  },
  
  polygon: {
    // Stablecoins
    USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    
    // Wrapped Native
    WPOL: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
  },
  
  arbitrum: {
    // Stablecoins
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    
    // Wrapped Native
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  },
  
  optimism: {
    // Stablecoins
    USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    
    // Wrapped Native
    WETH: '0x4200000000000000000000000000000000000006',
  },
};

/**
 * Get token address by symbol and chain
 * @param {string} chainName - Chain name (e.g., "base")
 * @param {string} symbol - Token symbol (e.g., "DIEM", "USDC")
 * @returns {string|null} Token address or null if not found
 */
export function getTokenAddress(chainName, symbol) {
  const chainTokens = tokens[chainName.toLowerCase()];
  if (!chainTokens) return null;
  return chainTokens[symbol.toUpperCase()] || null;
}

/**
 * Get token symbol by address and chain
 * @param {string} chainName - Chain name
 * @param {string} address - Token address
 * @returns {string|null} Token symbol or null if not found
 */
export function getTokenSymbol(chainName, address) {
  const chainTokens = tokens[chainName.toLowerCase()];
  if (!chainTokens) return null;
  
  const normalizedAddress = address.toLowerCase();
  for (const [symbol, addr] of Object.entries(chainTokens)) {
    if (addr.toLowerCase() === normalizedAddress) {
      return symbol;
    }
  }
  return null;
}

/**
 * Venice ecosystem token info
 */
export const veniceTokens = {
  DIEM: {
    address: '0xf4d97f2da56e8c3098f3a8d538db630a2606a024',
    chain: 'base',
    decimals: 18,
    description: 'Venice DIEM token - stake for AI compute. 1 staked DIEM = $1/day of inference.',
  },
};
