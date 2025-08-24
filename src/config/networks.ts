import { Network } from '../types/wallet.types';

/**
 * Kaia 네트워크 설정
 */
export const KAIA_NETWORKS: Record<string, Network> = {
  mainnet: {
    chainId: 8217,
    name: 'Kaia Mainnet',
    rpcUrl: 'https://public-en.node.kaia.io',
    blockExplorerUrl: 'https://kaiascan.io',
  },
  testnet: {
    chainId: 1001,
    name: 'Kaia Testnet Kairos',
    rpcUrl: 'https://public-en-kairos.node.kaia.io',
    blockExplorerUrl: 'https://kairos.kaiascan.io',
  },
};

/**
 * 기본 네트워크
 */
export const DEFAULT_NETWORK = KAIA_NETWORKS.mainnet;

/**
 * 체인 ID로 네트워크 조회
 */
export function getNetworkByChainId(chainId: number): Network | null {
  return (
    Object.values(KAIA_NETWORKS).find(network => network.chainId === chainId) ||
    null
  );
}
