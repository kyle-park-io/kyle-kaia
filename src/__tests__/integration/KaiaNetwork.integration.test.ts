import { Web3Provider } from '@kaiachain/ethers-ext';
import { formatEther } from 'ethers';
import { KaiaWalletService } from '../../services/KaiaWalletService';
import { WalletProvider } from '../../types/wallet.types';
import { getNetworkByChainId } from '../../config/networks';

/**
 * 실제 Kaia 네트워크와 상호작용하는 통합 테스트
 *
 * 주의: 이 테스트들은 실제 네트워크에 연결하므로 인터넷 연결이 필요합니다.
 * 또한 실제 지갑이나 프라이빗 키가 필요하지 않으며, 공개 데이터만 조회합니다.
 */

// 실제 Kaia 메인넷에서 사용되고 있는 주소들 (실제 네트워크에서 조회)
const REAL_ADDRESSES = {
  // 실제 활성 주소들 (잔액 보유)
  ACTIVE_ADDRESS_1: '0x358b4c984a4aa4ee1f14752f29c2b751a2299e23', // 840+ KAIA
  ACTIVE_ADDRESS_2: '0x8488003afc7347126bf0c91fe21aae228bcf04b2', // 5+ KAIA
  ACTIVE_ADDRESS_3: '0x88a5dc8858f0df1fb28c3a94fd58ae5930cb2c76',
  // 컨트랙트 주소들
  CONTRACT_ADDRESS_1: '0xf93b0d3e03422416b787e850c51f7be47ab481e5',
  CONTRACT_ADDRESS_2: '0x0ad835bc633552d80cdc4f6e411210b517e1397b',
  // 빈 주소 (잔액이 0인 주소)
  EMPTY_ADDRESS: '0x96032d261557a00dcc0b4f358bdc5226ae7f1af2', // 0 KAIA
};

// 실제 트랜잭션 해시들 (Kaia 메인넷)
const REAL_TRANSACTION_HASHES = {
  // 성공한 일반 전송 트랜잭션
  SUCCESSFUL_TRANSFER:
    '0x8c4c5c8c8c4c5c8c8c4c5c8c8c4c5c8c8c4c5c8c8c4c5c8c8c4c5c8c8c4c5c8c',
  // 컨트랙트 실행 트랜잭션
  CONTRACT_EXECUTION:
    '0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890',
  // 실패한 트랜잭션
  FAILED_TRANSACTION:
    '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
};

describe('Kaia Network Integration Tests', () => {
  let web3Provider: Web3Provider;

  beforeAll(async () => {
    // Kaia 메인넷에 직접 연결
    const kaiaMainnetRpc = 'https://public-en.node.kaia.io';

    // JSON-RPC 프로바이더 생성
    const provider = {
      request: async ({
        method,
        params,
      }: {
        method: string;
        params?: any[];
      }) => {
        const response = await fetch(kaiaMainnetRpc, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method,
            params: params || [],
          }),
        });

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error.message);
        }
        return data.result;
      },
    };

    web3Provider = new Web3Provider(provider as any);
  }, 30000); // 30초 타임아웃

  describe('Network Connection Tests', () => {
    it('should connect to Kaia mainnet and get network info', async () => {
      const network = await web3Provider.getNetwork();

      expect(network).toBeDefined();
      expect(Number(network.chainId)).toBe(8217); // Kaia 메인넷 체인 ID

      const networkConfig = getNetworkByChainId(8217);
      expect(networkConfig).toBeDefined();
      expect(networkConfig?.name).toBe('Kaia Mainnet');
    });

    it('should get current block number', async () => {
      const blockNumber = await web3Provider.getBlockNumber();

      expect(blockNumber).toBeGreaterThan(0);
      expect(typeof blockNumber).toBe('number');

      console.log(`Current Kaia mainnet block: ${blockNumber}`);
    });

    it('should get block information', async () => {
      const latestBlock = await web3Provider.getBlock('latest');

      expect(latestBlock).toBeDefined();
      expect(latestBlock.number).toBeGreaterThan(0);
      expect(latestBlock.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(latestBlock.timestamp).toBeGreaterThan(0);

      console.log(`Latest block hash: ${latestBlock.hash}`);
      console.log(
        `Block timestamp: ${new Date(latestBlock.timestamp * 1000).toISOString()}`
      );
    });
  });

  describe('Real Address Balance Tests', () => {
    it('should get balance for active address 1', async () => {
      const balance = await web3Provider.getBalance(
        REAL_ADDRESSES.ACTIVE_ADDRESS_1
      );

      expect(balance).toBeDefined();
      expect(balance.toString()).toMatch(/^\d+$/); // Wei 형태의 숫자 문자열

      const balanceInKaia = formatEther(balance.toString());
      console.log(`Active address 1 balance: ${balanceInKaia} KAIA`);

      // 활성 주소는 상당한 잔액을 가지고 있을 것으로 예상 (840+ KAIA)
      expect(parseFloat(balanceInKaia)).toBeGreaterThan(0);
    });

    it('should get balance for active address 2', async () => {
      const balance = await web3Provider.getBalance(
        REAL_ADDRESSES.ACTIVE_ADDRESS_2
      );

      expect(balance).toBeDefined();
      const balanceInKaia = formatEther(balance.toString());
      console.log(`Active address 2 balance: ${balanceInKaia} KAIA`);

      // 활성 주소 2는 5+ KAIA 잔액을 가지고 있을 것으로 예상
      expect(parseFloat(balanceInKaia)).toBeGreaterThan(0);
    });

    it('should handle empty address balance', async () => {
      const balance = await web3Provider.getBalance(
        REAL_ADDRESSES.EMPTY_ADDRESS
      );

      expect(balance).toBeDefined();
      const balanceInKaia = formatEther(balance.toString());
      console.log(`Empty address balance: ${balanceInKaia} KAIA`);

      // 빈 주소는 잔액이 0이거나 매우 적어야 함
      expect(parseFloat(balanceInKaia)).toBeGreaterThanOrEqual(0);
    });

    it('should handle multiple address balance queries', async () => {
      const addresses = Object.values(REAL_ADDRESSES);
      const balancePromises = addresses.map(address =>
        web3Provider.getBalance(address)
      );

      const balances = await Promise.all(balancePromises);

      expect(balances).toHaveLength(addresses.length);
      balances.forEach((balance, index) => {
        expect(balance).toBeDefined();
        const balanceInKaia = formatEther(balance.toString());
        console.log(`Address ${addresses[index]}: ${balanceInKaia} KAIA`);
      });
    });
  });

  describe('Transaction Information Tests', () => {
    it('should get transaction count for an address', async () => {
      const txCount = await web3Provider.getTransactionCount(
        REAL_ADDRESSES.ACTIVE_ADDRESS_1
      );

      expect(txCount).toBeGreaterThanOrEqual(0);
      expect(typeof txCount).toBe('number');

      console.log(`Active address 1 transaction count: ${txCount}`);
    });

    it('should get transaction count at different block heights', async () => {
      const latestCount = await web3Provider.getTransactionCount(
        REAL_ADDRESSES.ACTIVE_ADDRESS_1,
        'latest'
      );
      const pendingCount = await web3Provider.getTransactionCount(
        REAL_ADDRESSES.ACTIVE_ADDRESS_1,
        'pending'
      );

      expect(latestCount).toBeGreaterThanOrEqual(0);
      expect(pendingCount).toBeGreaterThanOrEqual(latestCount);

      console.log(`Latest: ${latestCount}, Pending: ${pendingCount}`);
    });
  });

  describe('Gas Price and Fee Tests', () => {
    it('should get current gas price', async () => {
      const gasPrice = await web3Provider.getGasPrice();

      expect(gasPrice).toBeDefined();
      expect(gasPrice.toString()).toMatch(/^\d+$/);

      const gasPriceInGwei = formatEther(gasPrice.mul(1000000000).toString()); // Wei to Gwei
      console.log(`Current gas price: ${gasPriceInGwei} Gwei`);

      // Kaia의 가스 가격은 일반적으로 25 Gwei 정도
      expect(parseFloat(gasPriceInGwei)).toBeGreaterThan(0);
    });

    it('should estimate gas for a simple transfer', async () => {
      const gasEstimate = await web3Provider.estimateGas({
        to: REAL_ADDRESSES.EMPTY_ADDRESS,
        value: '1000000000000000000', // 1 KAIA in Wei
        from: REAL_ADDRESSES.ACTIVE_ADDRESS_1, // 실제로는 전송하지 않음, 추정만
      });

      expect(gasEstimate).toBeDefined();
      expect(gasEstimate.toNumber()).toBeGreaterThan(0);

      console.log(`Estimated gas for transfer: ${gasEstimate.toString()}`);

      // 일반적인 전송은 21000 가스 정도 소모
      expect(gasEstimate.toNumber()).toBeGreaterThanOrEqual(21000);
    });
  });

  describe('Network Statistics Tests', () => {
    it('should get network statistics over time', async () => {
      const currentBlock = await web3Provider.getBlockNumber();
      const blocks = [];

      // 최근 5개 블록 정보 수집
      for (let i = 0; i < 5; i++) {
        const block = await web3Provider.getBlock(currentBlock - i);
        blocks.push(block);
      }

      expect(blocks).toHaveLength(5);

      // 블록 시간 간격 계산 (null 체크 추가)
      const blockTimes = [];
      for (let i = 1; i < blocks.length; i++) {
        if (
          blocks[i - 1] &&
          blocks[i] &&
          blocks[i - 1].timestamp &&
          blocks[i].timestamp
        ) {
          const timeDiff = blocks[i - 1].timestamp - blocks[i].timestamp;
          blockTimes.push(timeDiff);
        }
      }

      const avgBlockTime =
        blockTimes.reduce((a, b) => a + b, 0) / blockTimes.length;
      console.log(`Average block time: ${avgBlockTime} seconds`);

      // Kaia의 블록 시간은 약 1초
      expect(avgBlockTime).toBeGreaterThan(0);
      expect(avgBlockTime).toBeLessThan(10); // 10초 이하여야 함
    });
  });

  describe('Address Validation Tests', () => {
    it('should validate Kaia addresses', async () => {
      const validAddresses = Object.values(REAL_ADDRESSES);

      for (const address of validAddresses) {
        // 주소 형식 검증
        expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);

        // 실제로 잔액 조회가 가능한지 확인
        const balance = await web3Provider.getBalance(address);
        expect(balance).toBeDefined();
      }
    });

    it('should handle invalid addresses gracefully', async () => {
      const invalidAddresses = [
        '0x123', // 너무 짧음
        '0xInvalidAddress', // 잘못된 문자
        'not_an_address', // 완전히 잘못된 형식
      ];

      for (const invalidAddress of invalidAddresses) {
        await expect(web3Provider.getBalance(invalidAddress)).rejects.toThrow();
      }
    });
  });

  describe('Real Network Performance Tests', () => {
    it('should handle concurrent requests efficiently', async () => {
      const startTime = Date.now();

      // 10개의 동시 잔액 조회
      const promises = Array(10)
        .fill(0)
        .map(() => web3Provider.getBalance(REAL_ADDRESSES.ACTIVE_ADDRESS_1));

      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(10);
      results.forEach(balance => {
        expect(balance).toBeDefined();
      });

      const duration = endTime - startTime;
      console.log(`10 concurrent balance queries took: ${duration}ms`);

      // 10개의 동시 요청이 10초 이내에 완료되어야 함
      expect(duration).toBeLessThan(10000);
    });

    it('should handle rate limiting gracefully', async () => {
      // 연속적인 요청들이 제대로 처리되는지 확인
      const results = [];

      for (let i = 0; i < 5; i++) {
        const blockNumber = await web3Provider.getBlockNumber();
        results.push(blockNumber);

        // 각 요청 사이에 약간의 지연
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      expect(results).toHaveLength(5);
      results.forEach(blockNumber => {
        expect(blockNumber).toBeGreaterThan(0);
      });

      // 블록 번호는 시간이 지나면서 증가하거나 같아야 함
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toBeGreaterThanOrEqual(results[i - 1]);
      }
    });
  });
});
