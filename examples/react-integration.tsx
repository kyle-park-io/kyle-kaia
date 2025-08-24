import React, { useState, useEffect, useCallback } from 'react';
import { formatEther, parseEther } from 'ethers';
import {
  WalletAdapter,
  WalletProvider,
  WalletConnectionStatus,
  Account,
  Network,
  IWallet,
} from '../src';

/**
 * React 컴포넌트에서 Kaia 지갑 사용 예제
 */
export const KaiaWalletComponent: React.FC = () => {
  const [walletAdapter] = useState(() => new WalletAdapter());
  const [currentWallet, setCurrentWallet] = useState<IWallet | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [network, setNetwork] = useState<Network | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [connectionStatus, setConnectionStatus] =
    useState<WalletConnectionStatus>(WalletConnectionStatus.DISCONNECTED);
  const [availableWallets, setAvailableWallets] = useState<WalletProvider[]>(
    []
  );
  const [error, setError] = useState<string | null>(null);

  // 사용 가능한 지갑 확인
  useEffect(() => {
    const wallets = walletAdapter.getAvailableWallets();
    setAvailableWallets(wallets);
  }, [walletAdapter]);

  // 지갑 상태 업데이트
  const updateWalletState = useCallback(async (wallet: IWallet) => {
    try {
      const state = wallet.getState();
      setConnectionStatus(state.status);
      setAccount(state.account);
      setNetwork(state.network);
      setError(state.error);

      if (state.account) {
        const balanceWei = await wallet.getBalance();
        const balanceKlay = formatEther(balanceWei);
        setBalance(balanceKlay);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  // 지갑 연결
  const connectWallet = useCallback(
    async (provider: WalletProvider) => {
      try {
        setError(null);
        const wallet = walletAdapter.selectWallet(provider);

        // 이벤트 리스너 등록
        wallet.on('connect', account => {
          setAccount(account);
          setConnectionStatus(WalletConnectionStatus.CONNECTED);
        });

        wallet.on('disconnect', () => {
          setAccount(null);
          setNetwork(null);
          setBalance('0');
          setConnectionStatus(WalletConnectionStatus.DISCONNECTED);
        });

        wallet.on('accountsChanged', async () => {
          await updateWalletState(wallet);
        });

        wallet.on('chainChanged', async () => {
          await updateWalletState(wallet);
        });

        wallet.on('error', error => {
          setError(error.message);
          setConnectionStatus(WalletConnectionStatus.ERROR);
        });

        // 연결 실행
        await wallet.connect();
        setCurrentWallet(wallet);
        await updateWalletState(wallet);
      } catch (err) {
        setError((err as Error).message);
        setConnectionStatus(WalletConnectionStatus.ERROR);
      }
    },
    [walletAdapter, updateWalletState]
  );

  // 지갑 연결 해제
  const disconnectWallet = useCallback(async () => {
    if (currentWallet) {
      try {
        await currentWallet.disconnect();
        setCurrentWallet(null);
      } catch (err) {
        setError((err as Error).message);
      }
    }
  }, [currentWallet]);

  // 트랜잭션 전송
  const sendTransaction = useCallback(
    async (to: string, amount: string) => {
      if (!currentWallet || !account) {
        setError('지갑이 연결되지 않았습니다.');
        return;
      }

      try {
        setError(null);
        const result = await currentWallet.sendTransaction({
          to,
          value: amount,
        });

        alert(`트랜잭션이 전송되었습니다. 해시: ${result.hash}`);

        // 잔액 업데이트
        const newBalanceWei = await currentWallet.getBalance();
        const newBalanceKlay = formatEther(newBalanceWei);
        setBalance(newBalanceKlay);
      } catch (err) {
        setError((err as Error).message);
      }
    },
    [currentWallet, account]
  );

  // 메시지 서명
  const signMessage = useCallback(
    async (message: string) => {
      if (!currentWallet) {
        setError('지갑이 연결되지 않았습니다.');
        return;
      }

      try {
        setError(null);
        const signature = await currentWallet.signMessage(message);
        alert(`서명 완료: ${signature}`);
      } catch (err) {
        setError((err as Error).message);
      }
    },
    [currentWallet]
  );

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Kaia 지갑 연동</h1>

      {/* 에러 표시 */}
      {error && (
        <div
          style={{
            color: 'red',
            backgroundColor: '#ffebee',
            padding: '10px',
            borderRadius: '4px',
            marginBottom: '20px',
          }}
        >
          오류: {error}
        </div>
      )}

      {/* 연결 상태 */}
      <div style={{ marginBottom: '20px' }}>
        <h3>연결 상태</h3>
        <p>
          상태: <strong>{connectionStatus}</strong>
        </p>
        {account && (
          <>
            <p>
              계정: <code>{account.address}</code>
            </p>
            <p>
              잔액: <strong>{balance} KLAY</strong>
            </p>
          </>
        )}
        {network && (
          <p>
            네트워크:{' '}
            <strong>
              {network.name} (Chain ID: {network.chainId})
            </strong>
          </p>
        )}
      </div>

      {/* 지갑 연결 버튼들 */}
      {connectionStatus === WalletConnectionStatus.DISCONNECTED && (
        <div style={{ marginBottom: '20px' }}>
          <h3>지갑 연결</h3>
          {availableWallets.length > 0 ? (
            availableWallets.map(provider => (
              <button
                key={provider}
                onClick={() => connectWallet(provider)}
                style={{
                  padding: '10px 20px',
                  margin: '5px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                {provider} 연결
              </button>
            ))
          ) : (
            <p>
              사용 가능한 지갑이 없습니다. Kaikas 또는 MetaMask를 설치해주세요.
            </p>
          )}
        </div>
      )}

      {/* 연결된 상태에서 사용 가능한 기능들 */}
      {connectionStatus === WalletConnectionStatus.CONNECTED && (
        <div>
          <h3>지갑 기능</h3>

          {/* 연결 해제 */}
          <button
            onClick={disconnectWallet}
            style={{
              padding: '10px 20px',
              margin: '5px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            연결 해제
          </button>

          {/* 메시지 서명 */}
          <button
            onClick={() => signMessage('Hello, Kaia!')}
            style={{
              padding: '10px 20px',
              margin: '5px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            메시지 서명
          </button>

          {/* 간단한 트랜잭션 폼 */}
          <div
            style={{
              marginTop: '20px',
              padding: '15px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
          >
            <h4>트랜잭션 전송</h4>
            <form
              onSubmit={e => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const to = formData.get('to') as string;
                const amount = formData.get('amount') as string;
                if (to && amount) {
                  // KLAY를 Wei로 변환
                  const amountInWei = parseEther(amount).toString();
                  sendTransaction(to, amountInWei);
                }
              }}
            >
              <div style={{ marginBottom: '10px' }}>
                <label>
                  받는 주소:
                  <input
                    type="text"
                    name="to"
                    placeholder="0x..."
                    style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                    required
                  />
                </label>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label>
                  금액 (KLAY):
                  <input
                    type="number"
                    name="amount"
                    step="0.001"
                    min="0"
                    placeholder="0.001"
                    style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                    required
                  />
                </label>
              </div>
              <button
                type="submit"
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#FF9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                전송
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KaiaWalletComponent;
