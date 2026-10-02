import nextPlugin from '@next/eslint-plugin-next'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

// react-doctor(`npm run doctor`)는 ESLint 플러그인을 배포하지 않지만, 코드의
// `eslint-disable react-doctor/*` 주석을 억제 지시로 읽는다. ESLint가 그 주석을
// "rule not found"로 막지 않도록 어떤 규칙명이든 no-op으로 응답하는 stub을 등록한다.
const noopRule = { create: () => ({}) }
const reactDoctorStub = {
  rules: new Proxy({}, { get: (_, name) => (typeof name === 'string' ? noopRule : undefined) }),
}

export default tseslint.config(
  nextPlugin.configs['core-web-vitals'],
  {
    plugins: { 'react-doctor': reactDoctorStub },
    // stub은 아무것도 보고하지 않아 react-doctor 주석이 전부 "unused directive"로 잡히고,
    // `eslint --fix`가 그 주석을 지워버린다 — 규칙 단위로 끌 수 없어 전역으로 끈다.
    linterOptions: { reportUnusedDisableDirectives: 'off' },
  },
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  ...tseslint.configs.recommended,
  {
    // shadcn 자동생성 파일 — 직접 수정 금지, false positive 스캔 제외
    ignores: ['node_modules/**', '.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'components/ui/**'],
  },
)
