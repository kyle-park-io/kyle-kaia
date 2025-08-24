/**
 * 지갑 연결 상태
 */
export enum WalletConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

/**
 * 지갑 제공자 타입
 */
export enum WalletProvider {
  KAIKAS = 'kaikas',
  METAMASK = 'metamask',
  WALLET_CONNECT = 'walletconnect',
}

/**
 * 계정 정보
 */
export interface Account {
  address: string;
  balance: string;
}

/**
 * 네트워크 정보
 */
export interface Network {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorerUrl?: string;
}

/**
 * 트랜잭션 파라미터
 */
export interface TransactionParams {
  to: string;
  value?: string;
  data?: string;
  gas?: string;
  gasPrice?: string;
}

/**
 * 트랜잭션 결과
 */
export interface TransactionResult {
  hash: string;
  blockNumber?: number;
  gasUsed?: string;
}

/**
 * 지갑 상태
 */
export interface WalletState {
  status: WalletConnectionStatus;
  account: Account | null;
  network: Network | null;
  provider: WalletProvider | null;
  error: string | null;
}

/**
 * 지갑 이벤트 타입
 */
export interface WalletEvents {
  accountsChanged: (accounts: string[]) => void;
  chainChanged: (chainId: string) => void;
  connect: (account: Account) => void;
  disconnect: () => void;
  error: (error: Error) => void;
}
