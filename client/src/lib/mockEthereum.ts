// Mock EIP-1193 Ethereum provider for testing
// Implements the minimal subset needed by ethers.js BrowserProvider

interface MockEthereumOptions {
  address?: string;
  chainId?: string;
}

export function createMockEthereum(options: MockEthereumOptions = {}) {
  const {
    address = '0x742d35cc6e4d2bb3d4b8c85f53533f8f2f4d5b1f', // Lowercase address (avoids checksum validation)
    chainId = '0xaa36a7' // Sepolia testnet
  } = options;

  const mockProvider = {
    isMetaMask: true,
    
    // Main request method that ethers.js uses
    request: async ({ method, params }: { method: string; params?: any[] }) => {
      console.log(`Mock Ethereum Provider: ${method}`, params);
      
      switch (method) {
        case 'eth_requestAccounts':
          // Simulate user approving account connection
          return [address];
          
        case 'eth_accounts':
          // Return connected accounts
          return [address];
          
        case 'eth_chainId':
          // Return current chain ID
          return chainId;
          
        case 'wallet_switchEthereumChain':
          // Simulate successful chain switch
          return null;
          
        case 'wallet_addEthereumChain':
          // Simulate successful chain addition
          return null;
          
        case 'eth_call':
          // Mock contract call (though fetchBalance has fallback)
          return '0x7d'; // 125 in hex (mock GTN balance)
          
        case 'eth_getBalance':
          // Mock ETH balance
          return '0xde0b6b3a7640000'; // 1 ETH in wei
          
        default:
          console.warn(`Mock Ethereum Provider: Unhandled method ${method}`);
          throw new Error(`Unsupported method: ${method}`);
      }
    },
    
    // Event listener methods (stub implementations)
    on: (event: string, handler: Function) => {
      console.log(`Mock Ethereum Provider: Listening for ${event}`);
    },
    
    removeListener: (event: string, handler: Function) => {
      console.log(`Mock Ethereum Provider: Removed listener for ${event}`);
    },
    
    // Additional MetaMask properties
    selectedAddress: address,
    networkVersion: parseInt(chainId, 16).toString(),
    chainId: chainId,
  };

  return mockProvider;
}

// Helper function to setup mock wallet in development/testing
export function setupMockWallet() {
  if (typeof window !== 'undefined' && !window.ethereum) {
    const isMockWalletEnabled = 
      import.meta.env.VITE_MOCK_WALLET === 'true' || 
      (import.meta.env.DEV && new URLSearchParams(window.location.search).get('mockWallet') === '1');
    
    if (isMockWalletEnabled) {
      console.log('Setting up mock Ethereum provider for testing');
      window.ethereum = createMockEthereum({
        address: '0x742d35cc6e4d2bb3d4b8c85f53533f8f2f4d5b1f',
        chainId: '0xaa36a7' // Sepolia testnet
      });
    }
  }
}