import {
  Account,
  Network,
  TransactionParams,
  TransactionResult,
  WalletState,
  WalletEvents,
} from '../types/wallet.types';

/**
 * 지갑 인터페이스
 */
export interface IWallet {
  /**
   * 현재 지갑 상태 조회
   */
  getState(): WalletState;

  /**
   * 지갑 연결
   */
  connect(): Promise<Account>;

  /**
   * 지갑 연결 해제
   */
  disconnect(): Promise<void>;

  /**
   * 계정 정보 조회
   */
  getAccount(): Promise<Account | null>;

  /**
   * 네트워크 정보 조회
   */
  getNetwork(): Promise<Network | null>;

  /**
   * 잔액 조회
   */
  getBalance(address?: string): Promise<string>;

  /**
   * 트랜잭션 전송
   */
  sendTransaction(params: TransactionParams): Promise<TransactionResult>;

  /**
   * 메시지 서명
   */
  signMessage(message: string): Promise<string>;

  /**
   * 네트워크 변경
   */
  switchNetwork(chainId: number): Promise<void>;

  /**
   * 이벤트 리스너 등록
   */
  on<K extends keyof WalletEvents>(event: K, listener: WalletEvents[K]): this;

  /**
   * 이벤트 리스너 제거
   */
  off<K extends keyof WalletEvents>(event: K, listener: WalletEvents[K]): this;

  /**
   * 지갑 사용 가능 여부 확인
   */
  isAvailable(): boolean;
}
