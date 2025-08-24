import { IWallet } from '../interfaces/IWallet';
import { WalletProvider, WalletState } from '../types/wallet.types';
import { KaiaWalletService } from '../services/KaiaWalletService';

/**
 * 지갑 어댑터 - 다양한 지갑 제공자를 통합 관리
 */
export class WalletAdapter {
  private wallets: Map<WalletProvider, IWallet> = new Map();
  private currentWallet: IWallet | null = null;

  constructor() {
    this.initializeWallets();
  }

  /**
   * 지갑 초기화
   */
  private initializeWallets(): void {
    // Kaikas 지갑 등록
    this.wallets.set(
      WalletProvider.KAIKAS,
      new KaiaWalletService(WalletProvider.KAIKAS)
    );

    // MetaMask 지갑 등록
    this.wallets.set(
      WalletProvider.METAMASK,
      new KaiaWalletService(WalletProvider.METAMASK)
    );

    // 추후 WalletConnect도 추가 가능
    // this.wallets.set(WalletProvider.WALLET_CONNECT, new WalletConnectService());
  }

  /**
   * 사용 가능한 지갑 목록 조회
   */
  getAvailableWallets(): WalletProvider[] {
    return Array.from(this.wallets.entries())
      .filter(([, wallet]) => wallet.isAvailable())
      .map(([provider]) => provider);
  }

  /**
   * 특정 지갑 선택
   */
  selectWallet(provider: WalletProvider): IWallet {
    const wallet = this.wallets.get(provider);
    if (!wallet) {
      throw new Error(`지원하지 않는 지갑입니다: ${provider}`);
    }

    if (!wallet.isAvailable()) {
      throw new Error(`${provider} 지갑을 사용할 수 없습니다.`);
    }

    this.currentWallet = wallet;
    return wallet;
  }

  /**
   * 현재 선택된 지갑 조회
   */
  getCurrentWallet(): IWallet | null {
    return this.currentWallet;
  }

  /**
   * 자동으로 사용 가능한 지갑 연결
   */
  async autoConnect(): Promise<IWallet | null> {
    const availableWallets = this.getAvailableWallets();

    if (availableWallets.length === 0) {
      return null;
    }

    // 우선순위: Kaikas > MetaMask > WalletConnect
    const priority = [
      WalletProvider.KAIKAS,
      WalletProvider.METAMASK,
      WalletProvider.WALLET_CONNECT,
    ];

    for (const provider of priority) {
      if (availableWallets.includes(provider)) {
        try {
          const wallet = this.selectWallet(provider);
          await wallet.connect();
          return wallet;
        } catch (error) {
          console.warn(`${provider} 연결 실패:`, error);
          continue;
        }
      }
    }

    return null;
  }

  /**
   * 모든 지갑 연결 해제
   */
  async disconnectAll(): Promise<void> {
    for (const wallet of this.wallets.values()) {
      try {
        const state = wallet.getState();
        if (state.status === 'connected') {
          await wallet.disconnect();
        }
      } catch (error) {
        console.warn('지갑 연결 해제 중 오류:', error);
      }
    }
    this.currentWallet = null;
  }

  /**
   * 지갑 상태 조회
   */
  getWalletStates(): Record<WalletProvider, WalletState> {
    const states: Record<string, WalletState> = {};

    for (const [provider, wallet] of this.wallets.entries()) {
      states[provider] = wallet.getState();
    }

    return states as Record<WalletProvider, WalletState>;
  }
}
