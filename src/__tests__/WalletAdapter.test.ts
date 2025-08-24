import { WalletAdapter } from '../adapters/WalletAdapter';
import { WalletProvider, WalletConnectionStatus } from '../types/wallet.types';

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

// Window 객체에 kaia과 ethereum 추가
Object.defineProperty(window, 'kaia', {
  value: mockKaia,
  writable: true,
});

Object.defineProperty(window, 'ethereum', {
  value: mockEthereum,
  writable: true,
});

describe('WalletAdapter', () => {
  let walletAdapter: WalletAdapter;

  beforeEach(() => {
    // Window 객체 재설정
    Object.defineProperty(window, 'kaia', {
      value: mockKaia,
      writable: true,
    });

    Object.defineProperty(window, 'ethereum', {
      value: mockEthereum,
      writable: true,
    });

    walletAdapter = new WalletAdapter();
    jest.clearAllMocks();
  });

  describe('getAvailableWallets', () => {
    it('Kaikas가 사용 가능할 때 목록에 포함되어야 함', () => {
      const availableWallets = walletAdapter.getAvailableWallets();
      expect(availableWallets).toContain(WalletProvider.KAIKAS);
    });

    it('MetaMask가 사용 가능할 때 목록에 포함되어야 함', () => {
      const availableWallets = walletAdapter.getAvailableWallets();
      expect(availableWallets).toContain(WalletProvider.METAMASK);
    });

    it('지갑이 사용 불가능할 때 목록에서 제외되어야 함', () => {
      // 모든 지갑 비활성화
      Object.defineProperty(window, 'kaia', {
        value: undefined,
        writable: true,
      });
      Object.defineProperty(window, 'ethereum', {
        value: undefined,
        writable: true,
      });

      const newAdapter = new WalletAdapter();
      const availableWallets = newAdapter.getAvailableWallets();
      expect(availableWallets).toHaveLength(0);
    });
  });

  describe('selectWallet', () => {
    it('유효한 지갑 제공자로 지갑을 선택할 수 있어야 함', () => {
      const wallet = walletAdapter.selectWallet(WalletProvider.KAIKAS);
      expect(wallet).toBeDefined();
      expect(walletAdapter.getCurrentWallet()).toBe(wallet);
    });

    it('지원하지 않는 지갑 제공자로 선택 시 에러가 발생해야 함', () => {
      expect(() => {
        walletAdapter.selectWallet('unsupported' as WalletProvider);
      }).toThrow('지원하지 않는 지갑입니다');
    });
  });

  describe('autoConnect', () => {
    it('사용 가능한 지갑이 있을 때 자동 연결되어야 함', async () => {
      // Mock Web3Provider
      const mockWeb3Provider = require('@kaiachain/ethers-ext').Web3Provider;
      const mockInstance = {
        listAccounts: jest
          .fn()
          .mockResolvedValue(['0x1234567890123456789012345678901234567890']),
        getNetwork: jest.fn().mockResolvedValue({ chainId: 8217n }),
        getBalance: jest
          .fn()
          .mockResolvedValue({ toString: () => '1000000000000000000' }),
      };
      mockWeb3Provider.mockImplementation(() => mockInstance);

      mockKaia.request.mockResolvedValue([
        '0x1234567890123456789012345678901234567890',
      ]);

      const wallet = await walletAdapter.autoConnect();
      expect(wallet).toBeDefined();
    });

    it('사용 가능한 지갑이 없을 때 null을 반환해야 함', async () => {
      // 모든 지갑 비활성화
      Object.defineProperty(window, 'kaia', {
        value: undefined,
        writable: true,
      });
      Object.defineProperty(window, 'ethereum', {
        value: undefined,
        writable: true,
      });

      const newAdapter = new WalletAdapter();
      const wallet = await newAdapter.autoConnect();
      expect(wallet).toBeNull();
    });
  });

  describe('getWalletStates', () => {
    it('모든 지갑의 상태를 반환해야 함', () => {
      const states = walletAdapter.getWalletStates();
      expect(states).toHaveProperty(WalletProvider.KAIKAS);
      expect(states[WalletProvider.KAIKAS]).toHaveProperty('status');
      expect(states[WalletProvider.KAIKAS].status).toBe(
        WalletConnectionStatus.DISCONNECTED
      );
    });
  });

  describe('disconnectAll', () => {
    it('모든 연결된 지갑을 해제해야 함', async () => {
      // 먼저 지갑 연결
      const mockWeb3Provider = require('@kaiachain/ethers-ext').Web3Provider;
      const mockInstance = {
        listAccounts: jest
          .fn()
          .mockResolvedValue(['0x1234567890123456789012345678901234567890']),
        getNetwork: jest.fn().mockResolvedValue({ chainId: 8217n }),
        getBalance: jest
          .fn()
          .mockResolvedValue({ toString: () => '1000000000000000000' }),
      };
      mockWeb3Provider.mockImplementation(() => mockInstance);

      mockKaia.request.mockResolvedValue([
        '0x1234567890123456789012345678901234567890',
      ]);

      await walletAdapter.autoConnect();

      // 연결 해제
      await walletAdapter.disconnectAll();

      expect(walletAdapter.getCurrentWallet()).toBeNull();
    });
  });
});
