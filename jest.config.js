// 기본 Jest 설정
const baseConfig = {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/**/*.test.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};

export default {
  // 프로젝트별 설정
  projects: [
    {
      ...baseConfig,
      displayName: 'unit',
      testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
      testPathIgnorePatterns: ['<rootDir>/src/__tests__/integration/'],
    },
    {
      ...baseConfig,
      displayName: 'integration',
      testEnvironment: 'node', // 통합 테스트는 Node.js 환경에서 실행
      testMatch: ['<rootDir>/src/__tests__/integration/**/*.test.ts'],
      testTimeout: 60000, // 통합 테스트는 더 긴 타임아웃
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/integration/setup.ts'],
    },
  ],
};
