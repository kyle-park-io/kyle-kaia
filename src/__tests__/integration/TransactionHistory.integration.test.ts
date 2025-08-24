import { Web3Provider } from '@kaiachain/ethers-ext';
import { formatEther } from 'ethers';

/**
 * 실제 Kaia 네트워크의 트랜잭션 데이터를 사용한 통합 테스트
 *
 * 이 테스트는 실제 Kaia 메인넷의 트랜잭션 데이터를 조회하고 검증합니다.
 */

// 실제 Kaia 메인넷 트랜잭션 해시들 (공개 데이터)
const REAL_TRANSACTIONS = {
  // 실제 존재하는 트랜잭션들 (예시 - 실제 해시로 교체 필요)
  GENESIS_BLOCK_TX:
    '0x0000000000000000000000000000000000000000000000000000000000000000',
  // 일반적인 KAIA 전송 트랜잭션
  KAIA_TRANSFER:
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  // 스마트 컨트랙트 실행 트랜잭션
  CONTRACT_CALL:
    '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
};

// 실제 Kaia 주소들 (실제 네트워크에서 조회한 유효한 주소들)
const REAL_ADDRESSES = {
  // 실제 활성 주소들 (잔액 보유)
  FOUNDATION_ADDRESS: '0x358b4c984a4aa4ee1f14752f29c2b751a2299e23', // 840+ KAIA
  GOVERNANCE_ADDRESS: '0x8488003afc7347126bf0c91fe21aae228bcf04b2', // 5+ KAIA
  // 일반 사용자 주소 (활성 주소)
  ACTIVE_USER_ADDRESS: '0x88a5dc8858f0df1fb28c3a94fd58ae5930cb2c76',
  // 컨트랙트 주소
  CONTRACT_ADDRESS: '0xf93b0d3e03422416b787e850c51f7be47ab481e5',
};

describe('Transaction History Integration Tests', () => {
  let web3Provider: Web3Provider;

  beforeAll(async () => {
    // Kaia 메인넷 RPC 연결
    const kaiaMainnetRpc = 'https://public-en.node.kaia.io';

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
            id: Math.floor(Math.random() * 1000),
            method,
            params: params || [],
          }),
        });

        const data = await response.json();
        if (data.error) {
          throw new Error(`RPC Error: ${data.error.message}`);
        }
        return data.result;
      },
    };

    web3Provider = new Web3Provider(provider as any);
  }, 30000);

  describe('Real Transaction Analysis', () => {
    it('should analyze recent blocks for transaction patterns', async () => {
      const currentBlock = await web3Provider.getBlockNumber();
      const recentBlocks = [];

      // 최근 10개 블록 분석
      for (let i = 0; i < 10; i++) {
        const blockNumber = currentBlock - i;
        const block = await web3Provider.getBlock(blockNumber); // 트랜잭션 포함
        recentBlocks.push(block);
      }

      expect(recentBlocks).toHaveLength(10);

      let totalTransactions = 0;
      let totalGasUsed = 0;
      const transactionTypes = new Map<string, number>();

      for (const block of recentBlocks) {
        expect(block).toBeDefined();
        expect(block.number).toBeGreaterThan(0);
        expect(block.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);

        // 블록의 트랜잭션 수만 계산 (상세 분석은 생략)
        if (block.transactions) {
          totalTransactions += Array.isArray(block.transactions)
            ? block.transactions.length
            : 0;
        }

        if (block.gasUsed) {
          totalGasUsed += parseInt(block.gasUsed.toString());
        }
      }

      console.log(`Analyzed ${recentBlocks.length} recent blocks:`);
      console.log(`Total transactions: ${totalTransactions}`);
      console.log(
        `Average transactions per block: ${totalTransactions / recentBlocks.length}`
      );
      console.log(`Total gas used: ${totalGasUsed}`);
      console.log('Transaction analysis completed');

      expect(totalTransactions).toBeGreaterThanOrEqual(0);
    });

    it('should get transaction history for active addresses', async () => {
      const addresses = Object.values(REAL_ADDRESSES);

      for (const address of addresses) {
        // 트랜잭션 카운트 조회
        const txCount = await web3Provider.getTransactionCount(address);
        console.log(`Address ${address} has ${txCount} transactions`);

        expect(txCount).toBeGreaterThanOrEqual(0);
        expect(typeof txCount).toBe('number');

        // 잔액도 함께 조회
        const balance = await web3Provider.getBalance(address);
        const balanceInKaia = formatEther(balance.toString());
        console.log(`Address ${address} balance: ${balanceInKaia} KAIA`);
      }
    });
  });

  describe('Block Analysis Tests', () => {
    it('should analyze block composition and statistics', async () => {
      const currentBlock = await web3Provider.getBlockNumber();
      const block = await web3Provider.getBlock(currentBlock);

      expect(block).toBeDefined();
      expect(block.number).toBe(currentBlock);
      expect(block.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(block.parentHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(block.timestamp).toBeGreaterThan(0);

      console.log(`Block ${block.number} analysis:`);
      console.log(`Hash: ${block.hash}`);
      console.log(
        `Timestamp: ${new Date(block.timestamp * 1000).toISOString()}`
      );
      console.log(`Gas limit: ${block.gasLimit?.toString()}`);
      console.log(`Gas used: ${block.gasUsed?.toString()}`);

      if (block.transactions) {
        console.log(
          `Transaction count: ${Array.isArray(block.transactions) ? block.transactions.length : 0}`
        );
      }

      // 블록 시간 검증 (Kaia는 약 1초 블록 시간)
      if (currentBlock > 1) {
        const previousBlock = await web3Provider.getBlock(currentBlock - 1);
        const blockTime = block.timestamp - previousBlock.timestamp;
        console.log(`Block time: ${blockTime} seconds`);

        expect(blockTime).toBeGreaterThan(0);
        expect(blockTime).toBeLessThan(10); // 10초 이하
      }
    });

    it('should verify block chain integrity', async () => {
      const currentBlock = await web3Provider.getBlockNumber();
      const blocks = [];

      // 연속된 5개 블록 조회
      for (let i = 0; i < 5; i++) {
        const block = await web3Provider.getBlock(currentBlock - i);
        blocks.push(block);
      }

      expect(blocks).toHaveLength(5);

      // 블록 체인 무결성 검증
      for (let i = 1; i < blocks.length; i++) {
        const currentBlockData = blocks[i - 1];
        const previousBlockData = blocks[i];

        // 현재 블록의 parentHash가 이전 블록의 hash와 일치하는지 확인
        expect(currentBlockData.parentHash).toBe(previousBlockData.hash);

        // 블록 번호가 순차적인지 확인
        expect(currentBlockData.number).toBe(previousBlockData.number + 1);

        // 타임스탬프가 증가하는지 확인
        expect(currentBlockData.timestamp).toBeGreaterThanOrEqual(
          previousBlockData.timestamp
        );
      }

      console.log('Block chain integrity verified for 5 consecutive blocks');
    });
  });

  describe('Network Health Monitoring', () => {
    it('should monitor network performance metrics', async () => {
      const startTime = Date.now();

      // 여러 네트워크 호출을 동시에 실행
      const [blockNumber, gasPrice, networkInfo, balance1, balance2] =
        await Promise.all([
          web3Provider.getBlockNumber(),
          web3Provider.getGasPrice(),
          web3Provider.getNetwork(),
          web3Provider.getBalance(REAL_ADDRESSES.FOUNDATION_ADDRESS),
          web3Provider.getBalance(REAL_ADDRESSES.GOVERNANCE_ADDRESS),
        ]);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      console.log(`Network performance metrics:`);
      console.log(`Response time for 5 concurrent calls: ${responseTime}ms`);
      console.log(`Current block: ${blockNumber}`);
      console.log(
        `Gas price: ${formatEther(gasPrice.mul(1000000000).toString())} Gwei`
      );
      console.log(`Network chain ID: ${networkInfo.chainId}`);

      // 성능 검증
      expect(responseTime).toBeLessThan(5000); // 5초 이내
      expect(blockNumber).toBeGreaterThan(0);
      expect(gasPrice.toNumber()).toBeGreaterThan(0);
      expect(Number(networkInfo.chainId)).toBe(8217);
    });

    it('should handle network errors gracefully', async () => {
      // 존재하지 않는 블록 번호 요청 (매우 큰 숫자)
      await expect(web3Provider.getBlock(999999999)).resolves.toBeNull();

      // 존재하지 않는 트랜잭션 해시
      await expect(
        web3Provider.getTransaction(
          '0x0000000000000000000000000000000000000000000000000000000000000001'
        )
      ).resolves.toBeNull();

      // 잘못된 주소 형식
      await expect(
        web3Provider.getBalance('invalid_address')
      ).rejects.toThrow();
    });
  });

  describe('Real-world Usage Patterns', () => {
    it('should simulate typical dApp usage patterns', async () => {
      // 1. 네트워크 정보 확인
      const network = await web3Provider.getNetwork();
      expect(Number(network.chainId)).toBe(8217);

      // 2. 현재 가스 가격 확인
      const gasPrice = await web3Provider.getGasPrice();
      expect(gasPrice.toNumber()).toBeGreaterThan(0);

      // 3. 사용자 잔액 확인
      const userBalance = await web3Provider.getBalance(
        REAL_ADDRESSES.ACTIVE_USER_ADDRESS
      );
      const balanceInKaia = formatEther(userBalance.toString());
      console.log(`User balance: ${balanceInKaia} KAIA`);

      // 4. 트랜잭션 수수료 추정
      const gasEstimate = await web3Provider.estimateGas({
        to: REAL_ADDRESSES.FOUNDATION_ADDRESS,
        value: '1000000000000000000', // 1 KAIA
        from: REAL_ADDRESSES.ACTIVE_USER_ADDRESS,
      });

      const estimatedFee = gasEstimate.mul(gasPrice);
      const feeInKaia = formatEther(estimatedFee.toString());
      console.log(`Estimated transaction fee: ${feeInKaia} KAIA`);

      expect(gasEstimate.toNumber()).toBeGreaterThan(0);
      expect(parseFloat(feeInKaia)).toBeGreaterThan(0);

      // 5. 블록 정보 조회
      const latestBlock = await web3Provider.getBlock('latest');
      expect(latestBlock.number).toBeGreaterThan(0);

      console.log('Typical dApp usage pattern simulation completed');
    });

    it('should test batch operations efficiency', async () => {
      const addresses = Object.values(REAL_ADDRESSES);
      const startTime = Date.now();

      // 배치 잔액 조회
      const balancePromises = addresses.map(address =>
        web3Provider.getBalance(address)
      );
      const balances = await Promise.all(balancePromises);

      // 배치 트랜잭션 카운트 조회
      const txCountPromises = addresses.map(address =>
        web3Provider.getTransactionCount(address)
      );
      const txCounts = await Promise.all(txCountPromises);

      const endTime = Date.now();
      const batchTime = endTime - startTime;

      console.log(`Batch operations completed in ${batchTime}ms`);
      console.log('Address analysis:');

      addresses.forEach((address, index) => {
        const balance = formatEther(balances[index].toString());
        const txCount = txCounts[index];
        console.log(`${address}: ${balance} KAIA, ${txCount} transactions`);
      });

      expect(balances).toHaveLength(addresses.length);
      expect(txCounts).toHaveLength(addresses.length);
      expect(batchTime).toBeLessThan(10000); // 10초 이내
    });
  });
});
