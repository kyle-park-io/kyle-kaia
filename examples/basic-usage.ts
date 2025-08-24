import { WalletAdapter, WalletProvider, WalletConnectionStatus } from '../src';
import { formatEther } from 'ethers';

/**
 * 기본 사용 예제
 */
async function basicUsageExample(): Promise<void> {
  // 지갑 어댑터 생성
  const walletAdapter = new WalletAdapter();

  try {
    // 1. 사용 가능한 지갑 확인
    const availableWallets = walletAdapter.getAvailableWallets();
    console.log('사용 가능한 지갑:', availableWallets);

    if (availableWallets.length === 0) {
      console.log('사용 가능한 지갑이 없습니다.');
      return;
    }

    // 2. 지갑 선택 및 연결 (Kaikas 우선, MetaMask 대안)
    let selectedProvider = WalletProvider.KAIKAS;
    if (availableWallets.includes(WalletProvider.KAIKAS)) {
      selectedProvider = WalletProvider.KAIKAS;
    } else if (availableWallets.includes(WalletProvider.METAMASK)) {
      selectedProvider = WalletProvider.METAMASK;
    }

    if (availableWallets.includes(selectedProvider)) {
      const wallet = walletAdapter.selectWallet(selectedProvider);
      console.log(`${selectedProvider} 지갑을 선택했습니다.`);

      // 연결 전 상태 확인
      console.log('연결 전 상태:', wallet.getState());

      // 지갑 연결
      const account = await wallet.connect();
      console.log('연결된 계정:', account);

      // 연결 후 상태 확인
      console.log('연결 후 상태:', wallet.getState());

      // 3. 네트워크 정보 조회
      const network = await wallet.getNetwork();
      console.log('현재 네트워크:', network);

      // 4. 잔액 조회
      const balanceWei = await wallet.getBalance();
      const balanceKaia = formatEther(balanceWei);
      console.log('계정 잔액:', balanceKaia, 'KAIA');

      // 5. 메시지 서명 (예제)
      try {
        const message = 'Hello, Kaia Blockchain!';
        const signature = await wallet.signMessage(message);
        console.log('서명 결과:', signature);
      } catch (error) {
        console.log('메시지 서명 실패:', error);
      }

      // 6. 트랜잭션 전송 (예제 - 실제로는 실행하지 않음)
      /*
      const txResult = await wallet.sendTransaction({
        to: '0x742d35Cc6634C0532925a3b8D0Ac9E0C4E0f5c2',
        value: '1000000000000000000', // 1 KAIA
      });
      console.log('트랜잭션 결과:', txResult);
      */

      // 7. 이벤트 리스너 등록
      wallet.on('accountsChanged', accounts => {
        console.log('계정 변경됨:', accounts);
      });

      wallet.on('chainChanged', chainId => {
        console.log('네트워크 변경됨:', chainId);
      });

      wallet.on('disconnect', () => {
        console.log('지갑 연결 해제됨');
      });

      // 8. 연결 해제
      setTimeout(async () => {
        await wallet.disconnect();
        console.log('지갑 연결 해제 완료');
      }, 5000);
    } else {
      console.log(
        '사용 가능한 지갑이 없습니다. Kaikas 또는 MetaMask를 설치해주세요.'
      );
    }
  } catch (error) {
    console.error('오류 발생:', error);
  }
}

/**
 * 자동 연결 예제
 */
async function autoConnectExample(): Promise<void> {
  const walletAdapter = new WalletAdapter();

  try {
    console.log('자동 연결 시도 중...');
    const wallet = await walletAdapter.autoConnect();

    if (wallet) {
      console.log('자동 연결 성공!');
      console.log('현재 지갑:', wallet.getState());

      const account = await wallet.getAccount();
      console.log('연결된 계정:', account);
    } else {
      console.log('자동 연결 실패 - 사용 가능한 지갑이 없습니다.');
    }
  } catch (error) {
    console.error('자동 연결 오류:', error);
  }
}

/**
 * 다중 지갑 상태 모니터링 예제
 */
async function multiWalletMonitoringExample(): Promise<void> {
  const walletAdapter = new WalletAdapter();

  // 모든 지갑 상태 조회
  const walletStates = walletAdapter.getWalletStates();
  console.log('모든 지갑 상태:', walletStates);

  // 주기적으로 상태 확인
  const interval = setInterval(() => {
    const currentStates = walletAdapter.getWalletStates();

    for (const [provider, state] of Object.entries(currentStates)) {
      if (state.status === WalletConnectionStatus.CONNECTED) {
        console.log(`${provider} 지갑이 연결되어 있습니다.`);
        console.log(`계정: ${state.account?.address}`);
        console.log(`네트워크: ${state.network?.name}`);
      }
    }
  }, 3000);

  // 10초 후 모니터링 중단
  setTimeout(() => {
    clearInterval(interval);
    console.log('모니터링 중단');
  }, 10000);
}

// 브라우저 환경에서 실행
if (typeof window !== 'undefined') {
  // 페이지 로드 후 실행
  window.addEventListener('load', () => {
    console.log('=== Kaia 지갑 모듈 예제 시작 ===');

    // 기본 사용 예제 실행
    basicUsageExample();

    // 자동 연결 예제 (5초 후)
    setTimeout(autoConnectExample, 5000);

    // 다중 지갑 모니터링 예제 (10초 후)
    setTimeout(multiWalletMonitoringExample, 10000);
  });
}

export { basicUsageExample, autoConnectExample, multiWalletMonitoringExample };
