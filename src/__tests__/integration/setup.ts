/**
 * 통합 테스트 설정 파일
 *
 * 이 파일은 통합 테스트 실행 전에 필요한 설정을 수행합니다.
 */

// Node.js 환경에서 fetch API 사용을 위한 polyfill
import { fetch } from 'undici';

// 전역 fetch 설정
if (!global.fetch) {
  global.fetch = fetch as any;
}

// 전역 타임아웃 설정
jest.setTimeout(60000); // 60초

// 네트워크 연결 테스트를 위한 전역 변수
declare global {
  var KAIA_MAINNET_RPC: string;
  var KAIA_TESTNET_RPC: string;
  var INTEGRATION_TEST_MODE: boolean;
}

// Kaia 네트워크 RPC 엔드포인트
global.KAIA_MAINNET_RPC = 'https://public-en.node.kaia.io';
global.KAIA_TESTNET_RPC = 'https://public-en-kairos.node.kaia.io';
global.INTEGRATION_TEST_MODE = true;

// 네트워크 연결 상태 확인
beforeAll(async () => {
  console.log('🔗 통합 테스트 환경 설정 중...');

  // 메인넷 연결 테스트
  try {
    const response = await fetch(global.KAIA_MAINNET_RPC, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'kaia_blockNumber',
        params: [],
      }),
    });

    const data = (await response.json()) as any;
    if (data.result) {
      const blockNumber = parseInt(data.result, 16);
      console.log(`✅ Kaia 메인넷 연결 성공 (블록: ${blockNumber})`);
    }
  } catch (error) {
    console.warn('⚠️ Kaia 메인넷 연결 실패:', error);
  }

  // 테스트넷 연결 테스트
  try {
    const response = await fetch(global.KAIA_TESTNET_RPC, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'kaia_blockNumber',
        params: [],
      }),
    });

    const data = (await response.json()) as any;
    if (data.result) {
      const blockNumber = parseInt(data.result, 16);
      console.log(`✅ Kaia 테스트넷 연결 성공 (블록: ${blockNumber})`);
    }
  } catch (error) {
    console.warn('⚠️ Kaia 테스트넷 연결 실패:', error);
  }

  console.log('🚀 통합 테스트 준비 완료\n');
});

// 테스트 완료 후 정리
afterAll(() => {
  console.log('\n✨ 통합 테스트 완료');
});

// 각 테스트 파일 실행 전 로깅
beforeEach(() => {
  const testName = expect.getState().currentTestName;
  if (testName) {
    console.log(`🧪 실행 중: ${testName}`);
  }
});

// 네트워크 오류 처리를 위한 유틸리티 함수들
export const networkUtils = {
  /**
   * 네트워크 연결 재시도
   */
  async retryNetworkCall<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        console.warn(`네트워크 호출 실패 (${i + 1}/${maxRetries}):`, error);

        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  },

  /**
   * RPC 호출 헬퍼
   */
  async rpcCall(
    rpcUrl: string,
    method: string,
    params: any[] = []
  ): Promise<any> {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Math.floor(Math.random() * 1000),
        method,
        params,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    if (data.error) {
      throw new Error(`RPC Error: ${data.error.message}`);
    }

    return data.result;
  },

  /**
   * 주소 유효성 검사
   */
  isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  },

  /**
   * 트랜잭션 해시 유효성 검사
   */
  isValidTxHash(hash: string): boolean {
    return /^0x[a-fA-F0-9]{64}$/.test(hash);
  },

  /**
   * 블록 해시 유효성 검사
   */
  isValidBlockHash(hash: string): boolean {
    return /^0x[a-fA-F0-9]{64}$/.test(hash);
  },
};

// 테스트 데이터 상수
export const TEST_DATA = {
  // 실제 Kaia 메인넷 주소들
  ADDRESSES: {
    KAIA_FOUNDATION: '0x716f89D9bc333286c79DB4eCA1016DD27B58b9B4',
    GOVERNANCE_COUNCIL: '0x52d41ca72af615a1ac3301b0a93efa222ecc7541',
    ACTIVE_USER: '0x5c74070fdea071359b86082bd9f9b3deaafbe32b',
    CONTRACT: '0x19Aac5f612f524B754CA7e7c41cbFa2E981A4432',
    EMPTY: '0x0000000000000000000000000000000000000001',
  },

  // 네트워크 정보
  NETWORKS: {
    MAINNET: {
      chainId: 8217,
      name: 'Kaia Mainnet',
      rpc: 'https://public-en.node.kaia.io',
    },
    TESTNET: {
      chainId: 1001,
      name: 'Kaia Testnet Kairos',
      rpc: 'https://public-en-kairos.node.kaia.io',
    },
  },

  // 테스트용 값들
  VALUES: {
    ONE_KAIA_IN_WEI: '1000000000000000000',
    HALF_KAIA_IN_WEI: '500000000000000000',
    MIN_GAS_LIMIT: 21000,
    TYPICAL_GAS_PRICE: '25000000000', // 25 Gwei
  },
};

// 환경 변수 검사
if (process.env.NODE_ENV !== 'test') {
  console.warn(
    '⚠️ 통합 테스트는 NODE_ENV=test 환경에서 실행하는 것을 권장합니다.'
  );
}

// 인터넷 연결 확인
export const checkInternetConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch('https://www.google.com', {
      method: 'HEAD',
    });
    return true;
  } catch {
    return false;
  }
};

console.log('📋 통합 테스트 설정 로드 완료');
