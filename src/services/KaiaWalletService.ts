import { EventEmitter } from 'events';
import { Web3Provider, Wallet as EthersExtWallet } from '@kaiachain/ethers-ext';
import { IWallet } from '../interfaces/IWallet';
import {
  Account,
  Network,
  TransactionParams,
  TransactionResult,
  WalletConnectionStatus,
  WalletProvider,
  WalletState,
  WalletEvents,
} from '../types/wallet.types';
import { getNetworkByChainId } from '../config/networks';

// Kaikas 및 MetaMask 지갑 타입 정의
declare global {
  interface Window {
    klaytn?: {
      enable(): Promise<string[]>;
      selectedAddress: string;
      networkVersion: string;
      isKaikas: boolean;
      on(event: string, callback: (...args: any[]) => void): void;
      removeListener(event: string, callback: (...args: any[]) => void): void;
      request(args: { method: string; params?: any[] }): Promise<any>;
    };
    ethereum?: {
      enable(): Promise<string[]>;
      selectedAddress: string;
      networkVersion: string;
      isMetaMask: boolean;
      on(event: string, callback: (...args: any[]) => void): void;
      removeListener(event: string, callback: (...args: any[]) => void): void;
      request(args: { method: string; params?: any[] }): Promise<any>;
    };
  }
}

/**
 * @kaiachain/ethers-ext를 사용한 Kaia 지갑 서비스
 */
export class KaiaWalletService extends EventEmitter implements IWallet {
  private state: WalletState = {
    status: WalletConnectionStatus.DISCONNECTED,
    account: null,
    network: null,
    provider: null,
    error: null,
  };

  private web3Provider: Web3Provider | null = null;
  private wallet: EthersExtWallet | null = null;

  constructor(private walletProvider: WalletProvider) {
    super();
    this.state.provider = walletProvider;
    this.setupEventListeners();
  }

  /**
   * 현재 상태 반환
   */
  getState(): WalletState {
    return { ...this.state };
  }

  /**
   * 상태 업데이트
   */
  private updateState(updates: Partial<WalletState>): void {
    this.state = { ...this.state, ...updates };
  }

  /**
   * 에러 처리
   */
  private handleError(error: Error): void {
    this.updateState({
      status: WalletConnectionStatus.ERROR,
      error: error.message,
    });
    this.emit('error', error);
  }

  /**
   * 지갑 사용 가능 여부 확인
   */
  isAvailable(): boolean {
    if (typeof window === 'undefined') return false;

    switch (this.walletProvider) {
      case WalletProvider.KAIKAS:
        return !!window.klaytn && window.klaytn.isKaikas;
      case WalletProvider.METAMASK:
        return !!window.ethereum && window.ethereum.isMetaMask;
      default:
        return false;
    }
  }

  /**
   * 지갑 연결
   */
  async connect(): Promise<Account> {
    if (!this.isAvailable()) {
      throw new Error(`${this.walletProvider} 지갑이 설치되지 않았습니다.`);
    }

    try {
      this.updateState({ status: WalletConnectionStatus.CONNECTING });

      // Web3Provider 생성
      const provider = this.getProvider();
      this.web3Provider = new Web3Provider(provider);

      // 계정 연결 요청
      await provider.request({ method: 'eth_requestAccounts' });

      // 계정 정보 조회
      const accounts = await this.web3Provider.listAccounts();
      if (!accounts || accounts.length === 0) {
        throw new Error('계정을 찾을 수 없습니다.');
      }

      const address =
        typeof accounts[0] === 'string'
          ? accounts[0]
          : (accounts[0] as any).address;
      const balance = await this.getBalance(address);
      const account: Account = { address, balance };

      // 네트워크 정보 조회
      const network = await this.getNetwork();

      this.updateState({
        status: WalletConnectionStatus.CONNECTED,
        account,
        network,
        error: null,
      });

      this.emit('connect', account);
      return account;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * 지갑 연결 해제
   */
  async disconnect(): Promise<void> {
    this.web3Provider = null;
    this.wallet = null;
    this.updateState({
      status: WalletConnectionStatus.DISCONNECTED,
      account: null,
      network: null,
      error: null,
    });
    this.emit('disconnect');
  }

  /**
   * 계정 정보 조회
   */
  async getAccount(): Promise<Account | null> {
    if (!this.web3Provider) {
      return null;
    }

    try {
      const accounts = await this.web3Provider.listAccounts();
      if (!accounts || accounts.length === 0) {
        return null;
      }

      const address =
        typeof accounts[0] === 'string'
          ? accounts[0]
          : (accounts[0] as any).address;
      const balance = await this.getBalance(address);
      return { address, balance };
    } catch {
      return null;
    }
  }

  /**
   * 네트워크 정보 조회
   */
  async getNetwork(): Promise<Network | null> {
    if (!this.web3Provider) {
      return null;
    }

    try {
      const network = await this.web3Provider.getNetwork();
      return getNetworkByChainId(Number(network.chainId));
    } catch {
      return null;
    }
  }

  /**
   * 잔액 조회
   */
  async getBalance(address?: string): Promise<string> {
    if (!this.web3Provider) {
      throw new Error('지갑이 연결되지 않았습니다.');
    }

    try {
      let targetAddress = address;
      if (!targetAddress) {
        const accounts = await this.web3Provider.listAccounts();
        if (!accounts || accounts.length === 0) {
          throw new Error('계정을 찾을 수 없습니다.');
        }
        targetAddress =
          typeof accounts[0] === 'string'
            ? accounts[0]
            : (accounts[0] as any).address;
      }

      const balance = await this.web3Provider.getBalance(targetAddress!);
      // Wei에서 KLAY로 변환
      return balance.toString();
    } catch (error) {
      throw new Error(`잔액 조회 실패: ${(error as Error).message}`);
    }
  }

  /**
   * 트랜잭션 전송
   */
  async sendTransaction(params: TransactionParams): Promise<TransactionResult> {
    if (!this.web3Provider) {
      throw new Error('지갑이 연결되지 않았습니다.');
    }

    try {
      const signer = await this.web3Provider.getSigner();

      const txParams = {
        to: params.to,
        value: params.value || '0',
        data: params.data || '0x',
        gasLimit: params.gas,
        gasPrice: params.gasPrice,
      };

      const tx = await signer.sendTransaction(txParams);
      const receipt = await tx.wait();

      return {
        hash: tx.hash,
        blockNumber: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed?.toString(),
      };
    } catch (error) {
      throw new Error(`트랜잭션 전송 실패: ${(error as Error).message}`);
    }
  }

  /**
   * 메시지 서명
   */
  async signMessage(message: string): Promise<string> {
    if (!this.web3Provider) {
      throw new Error('지갑이 연결되지 않았습니다.');
    }

    try {
      const signer = await this.web3Provider.getSigner();
      return await signer.signMessage(message);
    } catch (error) {
      throw new Error(`메시지 서명 실패: ${(error as Error).message}`);
    }
  }

  /**
   * 네트워크 변경
   */
  async switchNetwork(chainId: number): Promise<void> {
    const provider = this.getProvider();
    const network = getNetworkByChainId(chainId);

    if (!network) {
      throw new Error(`지원하지 않는 네트워크입니다: ${chainId}`);
    }

    try {
      // 네트워크 변경 시도
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (switchError: any) {
      // 네트워크가 추가되지 않은 경우 추가 시도
      if (switchError.code === 4902) {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: `0x${chainId.toString(16)}`,
              chainName: network.name,
              rpcUrls: [network.rpcUrl],
              blockExplorerUrls: network.blockExplorerUrl
                ? [network.blockExplorerUrl]
                : undefined,
            },
          ],
        });
      } else {
        throw switchError;
      }
    }
  }

  /**
   * 이벤트 리스너 등록
   */
  on<K extends keyof WalletEvents>(event: K, listener: WalletEvents[K]): this {
    super.on(event as string, listener as (...args: any[]) => void);
    return this;
  }

  /**
   * 이벤트 리스너 제거
   */
  off<K extends keyof WalletEvents>(event: K, listener: WalletEvents[K]): this {
    super.off(event as string, listener as (...args: any[]) => void);
    return this;
  }

  /**
   * 지갑 제공자 객체 반환
   */
  private getProvider(): any {
    switch (this.walletProvider) {
      case WalletProvider.KAIKAS:
        return window.klaytn;
      case WalletProvider.METAMASK:
        return window.ethereum;
      default:
        throw new Error(`지원하지 않는 지갑 제공자: ${this.walletProvider}`);
    }
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners(): void {
    if (!this.isAvailable()) return;

    const provider = this.getProvider();

    // 계정 변경 이벤트
    provider.on('accountsChanged', (accounts: string[]) => {
      this.emit('accountsChanged', accounts);
      if (accounts.length === 0) {
        this.disconnect();
      } else {
        this.getAccount().then(account => {
          if (account) {
            this.updateState({ account });
          }
        });
      }
    });

    // 네트워크 변경 이벤트
    provider.on('chainChanged', (chainId: string) => {
      this.emit('chainChanged', chainId);
      this.getNetwork().then(network => {
        this.updateState({ network });
      });
    });

    // 연결 해제 이벤트
    provider.on('disconnect', () => {
      this.disconnect();
    });
  }
}
