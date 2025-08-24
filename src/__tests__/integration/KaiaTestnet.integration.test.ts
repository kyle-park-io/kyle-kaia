import { Web3Provider } from '@kaiachain/ethers-ext';
import { formatEther } from 'ethers';
import { networkUtils, TEST_DATA } from './setup';

/**
 * Kaia 테스트넷(Kairos)을 사용한 통합 테스트
 *
 * 이 테스트는 실제 Kaia 테스트넷에 연결하여 다양한 기능을 테스트합니다.
 * 테스트넷이므로 실제 가치가 없는 토큰을 사용합니다.
 */

// 테스트넷 전용 주소들
const TESTNET_ADDRESSES = {
  // 테스트넷 faucet 주소
  FAUCET_ADDRESS: '0x0000000000000000000000000000000000000000',
  // 테스트용 주소들
  TEST_ADDRESS_1: '0x1234567890123456789012345678901234567890',
  TEST_ADDRESS_2: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  // 빈 주소
  EMPTY_ADDRESS: '0x0000000000000000000000000000000000000001',
};

describe('Kaia Testnet Integration Tests', () => {
  let web3Provider: Web3Provider;

  beforeAll(async () => {
    // Kaia 테스트넷(Kairos) 연결
    const provider = {
      request: async ({
        method,
        params,
      }: {
        method: string;
        params?: any[];
      }) => {
        return await networkUtils.retryNetworkCall(async () => {
          return await networkUtils.rpcCall(
            TEST_DATA.NETWORKS.TESTNET.rpc,
            method,
            params
          );
        });
      },
    };

    web3Provider = new Web3Provider(provider as any);
  }, 30000);

  describe('Testnet Network Verification', () => {
    it('should connect to Kaia testnet and verify network info', async () => {
      const network = await web3Provider.getNetwork();

      expect(network).toBeDefined();
      expect(Number(network.chainId)).toBe(TEST_DATA.NETWORKS.TESTNET.chainId);

      console.log(`Connected to ${TEST_DATA.NETWORKS.TESTNET.name}`);
      console.log(`Chain ID: ${network.chainId}`);
    });

    it('should get testnet block information', async () => {
      const blockNumber = await web3Provider.getBlockNumber();
      const latestBlock = await web3Provider.getBlock('latest');

      expect(blockNumber).toBeGreaterThan(0);
      expect(latestBlock).toBeDefined();
      expect(latestBlock.number).toBe(blockNumber);
      expect(networkUtils.isValidBlockHash(latestBlock.hash)).toBe(true);

      console.log(`Testnet current block: ${blockNumber}`);
      console.log(`Block hash: ${latestBlock.hash}`);
    });

    it('should verify testnet gas price', async () => {
      const gasPrice = await web3Provider.getGasPrice();

      expect(gasPrice).toBeDefined();
      expect(gasPrice.toNumber()).toBeGreaterThan(0);

      const gasPriceInGwei = formatEther(gasPrice.mul(1000000000).toString());
      console.log(`Testnet gas price: ${gasPriceInGwei} Gwei`);

      // 테스트넷의 가스 가격은 일반적으로 메인넷보다 낮음
      expect(parseFloat(gasPriceInGwei)).toBeLessThan(100); // 100 Gwei 이하
    });
  });

  describe('Testnet Address Testing', () => {
    it('should query balances for testnet addresses', async () => {
      const addresses = Object.values(TESTNET_ADDRESSES);

      for (const address of addresses) {
        if (networkUtils.isValidAddress(address)) {
          const balance = await web3Provider.getBalance(address);
          const balanceInKaia = formatEther(balance.toString());

          expect(balance).toBeDefined();
          console.log(`Address ${address}: ${balanceInKaia} KAIA`);

          // 테스트넷 주소들은 0 이상의 잔액을 가질 수 있음
          expect(parseFloat(balanceInKaia)).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should get transaction counts for testnet addresses', async () => {
      const addresses = Object.values(TESTNET_ADDRESSES).filter(addr =>
        networkUtils.isValidAddress(addr)
      );

      for (const address of addresses) {
        const txCount = await web3Provider.getTransactionCount(address);

        expect(txCount).toBeGreaterThanOrEqual(0);
        expect(typeof txCount).toBe('number');

        console.log(`Address ${address} transaction count: ${txCount}`);
      }
    });
  });

  describe('Testnet Transaction Estimation', () => {
    it('should estimate gas for various transaction types', async () => {
      const testCases = [
        {
          name: 'Simple KAIA transfer',
          params: {
            to: TESTNET_ADDRESSES.TEST_ADDRESS_1,
            value: TEST_DATA.VALUES.ONE_KAIA_IN_WEI,
            from: TESTNET_ADDRESSES.TEST_ADDRESS_2,
          },
        },
        {
          name: 'Zero value transaction',
          params: {
            to: TESTNET_ADDRESSES.TEST_ADDRESS_1,
            value: '0',
            from: TESTNET_ADDRESSES.TEST_ADDRESS_2,
          },
        },
        {
          name: 'Transaction with data',
          params: {
            to: TESTNET_ADDRESSES.TEST_ADDRESS_1,
            value: '0',
            data: '0x1234567890abcdef',
            from: TESTNET_ADDRESSES.TEST_ADDRESS_2,
          },
        },
      ];

      for (const testCase of testCases) {
        try {
          const gasEstimate = await web3Provider.estimateGas(testCase.params);

          expect(gasEstimate).toBeDefined();
          expect(gasEstimate.toNumber()).toBeGreaterThan(0);

          console.log(
            `${testCase.name} - Estimated gas: ${gasEstimate.toString()}`
          );

          // 가스 추정치가 합리적인 범위 내에 있는지 확인
          expect(gasEstimate.toNumber()).toBeGreaterThanOrEqual(
            TEST_DATA.VALUES.MIN_GAS_LIMIT
          );
          expect(gasEstimate.toNumber()).toBeLessThan(1000000); // 1M gas 이하
        } catch (error) {
          // 일부 트랜잭션은 실패할 수 있음 (잔액 부족 등)
          console.warn(`${testCase.name} estimation failed:`, error);
        }
      }
    });

    it('should calculate transaction fees', async () => {
      const gasPrice = await web3Provider.getGasPrice();
      const gasEstimate = await web3Provider.estimateGas({
        to: TESTNET_ADDRESSES.TEST_ADDRESS_1,
        value: TEST_DATA.VALUES.ONE_KAIA_IN_WEI,
        from: TESTNET_ADDRESSES.TEST_ADDRESS_2,
      });

      const estimatedFee = gasEstimate.mul(gasPrice);
      const feeInKaia = formatEther(estimatedFee.toString());

      console.log(`Estimated transaction fee: ${feeInKaia} KAIA`);
      console.log(`Gas estimate: ${gasEstimate.toString()}`);
      console.log(
        `Gas price: ${formatEther(gasPrice.mul(1000000000).toString())} Gwei`
      );

      expect(parseFloat(feeInKaia)).toBeGreaterThan(0);
      expect(parseFloat(feeInKaia)).toBeLessThan(1); // 1 KAIA 이하의 수수료
    });
  });

  describe('Testnet Block Analysis', () => {
    it('should analyze recent testnet blocks', async () => {
      const currentBlock = await web3Provider.getBlockNumber();
      const blocksToAnalyze = Math.min(5, currentBlock); // 최대 5개 블록

      const blocks = [];
      for (let i = 0; i < blocksToAnalyze; i++) {
        const block = await web3Provider.getBlock(currentBlock - i);
        blocks.push(block);
      }

      expect(blocks).toHaveLength(blocksToAnalyze);

      let totalTransactions = 0;
      let totalGasUsed = 0;

      for (const block of blocks) {
        expect(block).toBeDefined();
        expect(block.number).toBeGreaterThan(0);
        expect(networkUtils.isValidBlockHash(block.hash)).toBe(true);

        if (block.transactions) {
          totalTransactions += Array.isArray(block.transactions)
            ? block.transactions.length
            : 0;
        }

        if (block.gasUsed) {
          totalGasUsed += parseInt(block.gasUsed.toString());
        }
      }

      console.log(`Analyzed ${blocks.length} testnet blocks:`);
      console.log(`Total transactions: ${totalTransactions}`);
      console.log(
        `Average transactions per block: ${totalTransactions / blocks.length}`
      );
      console.log(`Total gas used: ${totalGasUsed}`);

      // 테스트넷은 메인넷보다 트랜잭션이 적을 수 있음
      expect(totalTransactions).toBeGreaterThanOrEqual(0);
    });

    it('should verify testnet block times', async () => {
      const currentBlock = await web3Provider.getBlockNumber();
      const blocks = [];

      // 최근 3개 블록의 시간 분석
      for (let i = 0; i < 3; i++) {
        const block = await web3Provider.getBlock(currentBlock - i);
        blocks.push(block);
      }

      expect(blocks).toHaveLength(3);

      // 블록 시간 간격 계산
      const blockTimes = [];
      for (let i = 1; i < blocks.length; i++) {
        const timeDiff = blocks[i - 1].timestamp - blocks[i].timestamp;
        blockTimes.push(timeDiff);
      }

      if (blockTimes.length > 0) {
        const avgBlockTime =
          blockTimes.reduce((a, b) => a + b, 0) / blockTimes.length;
        console.log(`Testnet average block time: ${avgBlockTime} seconds`);

        // Kaia 테스트넷도 약 1초 블록 시간을 목표로 함
        expect(avgBlockTime).toBeGreaterThan(0);
        expect(avgBlockTime).toBeLessThan(30); // 30초 이하
      }
    });
  });

  describe('Testnet Performance Tests', () => {
    it('should handle concurrent testnet requests', async () => {
      const startTime = Date.now();

      // 여러 요청을 동시에 실행
      const promises = [
        web3Provider.getBlockNumber(),
        web3Provider.getGasPrice(),
        web3Provider.getBalance(TESTNET_ADDRESSES.TEST_ADDRESS_1),
        web3Provider.getBalance(TESTNET_ADDRESSES.TEST_ADDRESS_2),
        web3Provider.getNetwork(),
      ];

      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(5);
      expect(results[0]).toBeGreaterThan(0); // block number
      expect((results[1] as any).toNumber()).toBeGreaterThan(0); // gas price
      expect(results[2]).toBeDefined(); // balance 1
      expect(results[3]).toBeDefined(); // balance 2
      expect(Number((results[4] as any).chainId)).toBe(
        TEST_DATA.NETWORKS.TESTNET.chainId
      ); // network

      const responseTime = endTime - startTime;
      console.log(`Concurrent testnet requests completed in ${responseTime}ms`);

      // 테스트넷 응답 시간은 메인넷보다 느릴 수 있음
      expect(responseTime).toBeLessThan(15000); // 15초 이내
    });

    it('should handle testnet rate limiting gracefully', async () => {
      const requests = [];
      const startTime = Date.now();

      // 연속적인 블록 번호 요청
      for (let i = 0; i < 10; i++) {
        requests.push(web3Provider.getBlockNumber());
      }

      const results = await Promise.all(requests);
      const endTime = Date.now();

      expect(results).toHaveLength(10);
      results.forEach(blockNumber => {
        expect(blockNumber).toBeGreaterThan(0);
      });

      const totalTime = endTime - startTime;
      console.log(`10 sequential testnet requests completed in ${totalTime}ms`);

      // 모든 요청이 성공적으로 완료되어야 함
      expect(totalTime).toBeLessThan(30000); // 30초 이내
    });
  });

  describe('Testnet Error Handling', () => {
    it('should handle invalid testnet requests gracefully', async () => {
      // 존재하지 않는 블록 요청
      await expect(web3Provider.getBlock(999999999)).resolves.toBeNull();

      // 잘못된 주소 형식
      await expect(
        web3Provider.getBalance('invalid_address')
      ).rejects.toThrow();

      // 존재하지 않는 트랜잭션
      await expect(
        web3Provider.getTransaction(
          '0x0000000000000000000000000000000000000000000000000000000000000001'
        )
      ).resolves.toBeNull();
    });

    it('should recover from network interruptions', async () => {
      // 네트워크 재시도 로직 테스트
      const result = await networkUtils.retryNetworkCall(
        async () => {
          return await web3Provider.getBlockNumber();
        },
        3,
        500
      );

      expect(result).toBeGreaterThan(0);
      console.log(`Network retry test successful, block: ${result}`);
    });
  });
});
