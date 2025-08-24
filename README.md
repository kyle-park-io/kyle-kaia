# Kaia 지갑 모듈

TypeScript로 구현된 Kaia 블록체인 지갑 통합 모듈입니다. `@kaiachain/ethers-ext`를 기반으로 하여 안정적이고 효율적인 지갑 연동을 제공합니다.

## 특징

- 🔒 **타입 안전성**: TypeScript로 완전히 구현
- ⚡ **공식 SDK 기반**: @kaiachain/ethers-ext 사용으로 안정성 보장
- 🔌 **다중 지갑 지원**: Kaikas, MetaMask 동시 지원
- 🧪 **테스트 완비**: Jest를 사용한 포괄적인 테스트 코드
- 📱 **React 친화적**: React 컴포넌트에서 쉽게 사용 가능
- 📦 **pnpm 지원**: 최신 패키지 매니저 지원

## 설치

```bash
# pnpm 사용 (권장)
pnpm add kaia-wallet-module

# npm 사용
npm install kaia-wallet-module

# yarn 사용
yarn add kaia-wallet-module
```

## 지원 지갑

- ✅ **Kaikas**: Kaia 네트워크 전용 지갑
- ✅ **MetaMask**: 이더리움 호환 지갑
- 🔄 **WalletConnect**: 추후 지원 예정

## 빠른 시작

### 기본 사용법

```typescript
import { WalletAdapter, WalletProvider } from 'kaia-wallet-module';
import { formatEther, parseEther } from 'ethers';

// 지갑 어댑터 생성
const walletAdapter = new WalletAdapter();

// 사용 가능한 지갑 확인
const availableWallets = walletAdapter.getAvailableWallets();
console.log('사용 가능한 지갑:', availableWallets);

// 지갑 연결 (Kaikas 또는 MetaMask)
const provider = availableWallets.includes(WalletProvider.KAIKAS)
  ? WalletProvider.KAIKAS
  : WalletProvider.METAMASK;

if (availableWallets.includes(provider)) {
  const wallet = walletAdapter.selectWallet(provider);

  // 연결
  const account = await wallet.connect();
  console.log('연결된 계정:', account);

  // 잔액 조회 (Wei를 KLAY로 변환)
  const balanceWei = await wallet.getBalance();
  const balanceKlay = formatEther(balanceWei);
  console.log('잔액:', balanceKlay, 'KLAY');

  // 트랜잭션 전송
  const result = await wallet.sendTransaction({
    to: '0x742d35Cc6634C0532925a3b8D0Ac9E0C4E0f5c2',
    value: parseEther('1.0').toString(), // 1 KLAY
  });
  console.log('트랜잭션 해시:', result.hash);
}
```

### 자동 연결

```typescript
// 사용 가능한 지갑 중 자동으로 연결
const wallet = await walletAdapter.autoConnect();
if (wallet) {
  console.log('자동 연결 성공!');
  const account = await wallet.getAccount();
  console.log('계정:', account);
}
```

### React에서 사용

```tsx
import React, { useState, useEffect } from 'react';
import { WalletAdapter, WalletProvider, Account } from 'kaia-wallet-module';

const MyComponent: React.FC = () => {
  const [walletAdapter] = useState(() => new WalletAdapter());
  const [account, setAccount] = useState<Account | null>(null);

  const connectWallet = async () => {
    try {
      const wallet = walletAdapter.selectWallet(WalletProvider.KAIKAS);
      const account = await wallet.connect();
      setAccount(account);
    } catch (error) {
      console.error('연결 실패:', error);
    }
  };

  return (
    <div>
      {account ? (
        <div>
          <p>연결된 계정: {account.address}</p>
          <p>잔액: {account.balance} KLAY</p>
        </div>
      ) : (
        <button onClick={connectWallet}>지갑 연결</button>
      )}
    </div>
  );
};
```

## API 문서

### WalletAdapter

지갑들을 통합 관리하는 어댑터 클래스입니다.

#### 메서드

- `getAvailableWallets()`: 사용 가능한 지갑 목록 반환
- `selectWallet(provider)`: 특정 지갑 선택
- `getCurrentWallet()`: 현재 선택된 지갑 반환
- `autoConnect()`: 자동으로 사용 가능한 지갑 연결
- `disconnectAll()`: 모든 지갑 연결 해제
- `getWalletStates()`: 모든 지갑의 상태 반환

### IWallet 인터페이스

모든 지갑 구현체가 따라야 하는 인터페이스입니다.

#### 메서드

- `connect()`: 지갑 연결
- `disconnect()`: 지갑 연결 해제
- `getAccount()`: 계정 정보 조회
- `getNetwork()`: 네트워크 정보 조회
- `getBalance(address?)`: 잔액 조회
- `sendTransaction(params)`: 트랜잭션 전송
- `signMessage(message)`: 메시지 서명
- `switchNetwork(chainId)`: 네트워크 변경
- `isAvailable()`: 지갑 사용 가능 여부 확인
- `on(event, listener)`: 이벤트 리스너 등록
- `off(event, listener)`: 이벤트 리스너 제거

### 타입 정의

```typescript
// 지갑 연결 상태
enum WalletConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

// 계정 정보
interface Account {
  address: string;
  balance: string;
}

// 네트워크 정보
interface Network {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorerUrl?: string;
}

// 트랜잭션 파라미터
interface TransactionParams {
  to: string;
  value?: string;
  data?: string;
  gas?: string;
  gasPrice?: string;
}
```

## 이벤트

지갑에서 발생하는 다양한 이벤트를 구독할 수 있습니다.

```typescript
wallet.on('connect', account => {
  console.log('지갑 연결됨:', account);
});

wallet.on('disconnect', () => {
  console.log('지갑 연결 해제됨');
});

wallet.on('accountsChanged', accounts => {
  console.log('계정 변경됨:', accounts);
});

wallet.on('chainChanged', chainId => {
  console.log('네트워크 변경됨:', chainId);
});

wallet.on('error', error => {
  console.error('지갑 오류:', error);
});
```

## 개발

### 설치

```bash
git clone <repository-url>
cd kaia-wallet-module
pnpm install
```

### 빌드

```bash
pnpm run build
```

### 테스트

```bash
pnpm test
pnpm run test:watch  # 감시 모드
```

### 린팅

```bash
pnpm run lint
```

## 네트워크 설정

### Kaia 메인넷

- Chain ID: 8217
- RPC URL: https://public-en.node.kaia.io
- Explorer: https://kaiascan.io

### Kaia 테스트넷 (Kairos)

- Chain ID: 1001
- RPC URL: https://public-en-kairos.node.kaia.io
- Explorer: https://kairos.kaiascan.io

## 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 라이선스

MIT License

## 지원

문제가 있거나 질문이 있으시면 GitHub Issues를 통해 문의해주세요.
