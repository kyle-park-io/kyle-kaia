import { KaiaWalletService } from '../services/KaiaWalletService';
import { WalletConnectionStatus, WalletProvider } from '../types/wallet.types';

// Mock @kaiachain/ethers-ext
jest.mock('@kaiachain/ethers-ext', () => ({
  Web3Provider: jest.fn().mockImplementation(() => ({
    listAccounts: jest.fn(),
    getNetwork: jest.fn(),
    getBalance: jest.fn(),
    getSigner: jest.fn(),
  })),
}));

// Mock window.kaia
const mockKaia = {
  enable: jest.fn(),
  selectedAddress: '0x1234567890123456789012345678901234567890',
  networkVersion: '8217',
  isKaikas: true,
  on: jest.fn(),
  removeListener: jest.fn(),
  request: jest.fn(),
};

// Mock window.ethereum
const mockEthereum = {
  enable: jest.fn(),
  selectedAddress: '0x1234567890123456789012345678901234567890',
  networkVersion: '8217',
  isMetaMask: true,
  on: jest.fn(),
  removeListener: jest.fn(),
  request: jest.fn(),
};

describe('KaiaWalletService', () => {
  let kaikasWalletService: KaiaWalletService;
  let metamaskWalletService: KaiaWalletService;

  beforeEach(() => {
    // Window 객체에 kaia와 ethereum 추가
    Object.defineProperty(window, 'kaia', {
      value: mockKaia,
      writable: true,
    });

    Object.defineProperty(window, 'ethereum', {
      value: mockEthereum,
      writable: true,
    });

    kaikasWalletService = new KaiaWalletService(WalletProvider.KAIKAS);
    metamaskWalletService = new KaiaWalletService(WalletProvider.METAMASK);
    jest.clearAllMocks();
  });

  describe('isAvailable', () => {
    it('Kaikas가 설치되어 있을 때 true를 반환해야 함', () => {
      expect(kaikasWalletService.isAvailable()).toBe(true);
    });

    it('MetaMask가 설치되어 있을 때 true를 반환해야 함', () => {
      expect(metamaskWalletService.isAvailable()).toBe(true);
    });

    it('Kaikas가 설치되어 있지 않을 때 false를 반환해야 함', () => {
      Object.defineProperty(window, 'kaia', {
        value: undefined,
        writable: true,
      });

      const newService = new KaiaWalletService(WalletProvider.KAIKAS);
      expect(newService.isAvailable()).toBe(false);
    });

    it('MetaMask가 설치되어 있지 않을 때 false를 반환해야 함', () => {
      Object.defineProperty(window, 'ethereum', {
        value: undefined,
        writable: true,
      });

      const newService = new KaiaWalletService(WalletProvider.METAMASK);
      expect(newService.isAvailable()).toBe(false);
    });
  });

  describe('connect', () => {
    it('Kaikas 지갑이 성공적으로 연결되어야 함', async () => {
      const mockAccounts = ['0x1234567890123456789012345678901234567890'];
      mockKaia.request.mockResolvedValue(mockAccounts);

      // Mock Web3Provider methods
      const mockWeb3Provider = require('@kaiachain/ethers-ext').Web3Provider;
      const mockInstance = {
        listAccounts: jest.fn().mockResolvedValue(mockAccounts),
        getNetwork: jest.fn().mockResolvedValue({ chainId: 8217n }),
        getBalance: jest
          .fn()
          .mockResolvedValue({ toString: () => '1000000000000000000' }),
      };
      mockWeb3Provider.mockImplementation(() => mockInstance);

      const account = await kaikasWalletService.connect();

      expect(account.address).toBe(mockAccounts[0]);
      expect(kaikasWalletService.getState().status).toBe(
        WalletConnectionStatus.CONNECTED
      );
    });

    it('지갑이 없을 때 에러가 발생해야 함', async () => {
      Object.defineProperty(window, 'kaia', {
        value: undefined,
        writable: true,
      });

      const newService = new KaiaWalletService(WalletProvider.KAIKAS);
      await expect(newService.connect()).rejects.toThrow(
        'kaikas 지갑이 설치되지 않았습니다.'
      );
    });
  });

  describe('getBalance', () => {
    it('잔액을 올바르게 조회해야 함', async () => {
      const mockBalance = { toString: () => '1000000000000000000' }; // 1 KAIA in Wei

      // Mock Web3Provider
      const mockWeb3Provider = require('@kaiachain/ethers-ext').Web3Provider;
      const mockInstance = {
        getBalance: jest.fn().mockResolvedValue(mockBalance),
        listAccounts: jest
          .fn()
          .mockResolvedValue(['0x1234567890123456789012345678901234567890']),
      };
      mockWeb3Provider.mockImplementation(() => mockInstance);

      // 먼저 연결
      kaikasWalletService['web3Provider'] = new mockWeb3Provider();

      const balance = await kaikasWalletService.getBalance(
        '0x1234567890123456789012345678901234567890'
      );

      expect(balance).toBe('1000000000000000000');
    });

    it('지갑이 연결되지 않았을 때 에러가 발생해야 함', async () => {
      await expect(kaikasWalletService.getBalance()).rejects.toThrow(
        '지갑이 연결되지 않았습니다.'
      );
    });
  });

  describe('sendTransaction', () => {
    it('트랜잭션을 성공적으로 전송해야 함', async () => {
      const mockHash = '0xabcdef1234567890';
      const mockReceipt = {
        blockNumber: 12345,
        gasUsed: { toString: () => '21000' },
      };

      // Mock Web3Provider와 Signer
      const mockSigner = {
        sendTransaction: jest.fn().mockResolvedValue({
          hash: mockHash,
          wait: jest.fn().mockResolvedValue(mockReceipt),
        }),
      };

      const mockWeb3Provider = require('@kaiachain/ethers-ext').Web3Provider;
      const mockInstance = {
        getSigner: jest.fn().mockResolvedValue(mockSigner),
      };
      mockWeb3Provider.mockImplementation(() => mockInstance);

      // 먼저 연결
      kaikasWalletService['web3Provider'] = new mockWeb3Provider();

      const result = await kaikasWalletService.sendTransaction({
        to: '0x9876543210987654321098765432109876543210',
        value: '1000000000000000000', // 1 KAIA
      });

      expect(result.hash).toBe(mockHash);
      expect(result.blockNumber).toBe(12345);
      expect(result.gasUsed).toBe('21000');
    });
  });

  describe('signMessage', () => {
    it('메시지를 성공적으로 서명해야 함', async () => {
      const mockSignature = '0xsignature123';
      const message = 'Hello, Kaia!';

      // Mock Signer
      const mockSigner = {
        signMessage: jest.fn().mockResolvedValue(mockSignature),
      };

      const mockWeb3Provider = require('@kaiachain/ethers-ext').Web3Provider;
      const mockInstance = {
        getSigner: jest.fn().mockResolvedValue(mockSigner),
      };
      mockWeb3Provider.mockImplementation(() => mockInstance);

      // 먼저 연결
      kaikasWalletService['web3Provider'] = new mockWeb3Provider();

      const signature = await kaikasWalletService.signMessage(message);

      expect(signature).toBe(mockSignature);
      expect(mockSigner.signMessage).toHaveBeenCalledWith(message);
    });
  });

  describe('disconnect', () => {
    it('연결을 해제해야 함', async () => {
      // 먼저 연결 상태로 설정
      kaikasWalletService['updateState']({
        status: WalletConnectionStatus.CONNECTED,
        account: { address: '0x123', balance: '1' },
      });

      // 연결 해제
      await kaikasWalletService.disconnect();

      const state = kaikasWalletService.getState();
      expect(state.status).toBe(WalletConnectionStatus.DISCONNECTED);
      expect(state.account).toBeNull();
    });
  });

  describe('switchNetwork', () => {
    it('네트워크 변경을 시도해야 함', async () => {
      const chainId = 1001; // Baobab testnet
      mockKaia.request.mockResolvedValue(null);

      await kaikasWalletService.switchNetwork(chainId);

      expect(mockKaia.request).toHaveBeenCalledWith({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x3e9' }], // 1001 in hex
      });
    });

    it('지원하지 않는 네트워크일 때 에러가 발생해야 함', async () => {
      const invalidChainId = 99999;

      await expect(
        kaikasWalletService.switchNetwork(invalidChainId)
      ).rejects.toThrow('지원하지 않는 네트워크입니다: 99999');
    });
  });
});
