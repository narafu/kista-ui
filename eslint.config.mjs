import nextPlugin from '@next/eslint-plugin-next'
import jsxA11y from 'eslint-plugin-jsx-a11y'
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
  jsxA11y.flatConfigs.strict,
  {
    rules: {
      // UnitInput은 내부에 <input>을 렌더링해 <label>로 감싸면 DOM 중첩으로 연결된다 — 규칙이 커스텀 컴포넌트를 컨트롤로 인식하지 못해 생기는 오탐 방지
      'jsx-a11y/label-has-associated-control': ['error', { controlComponents: ['UnitInput'] }],
      // 가로 스크롤 표 컨테이너는 키보드로 스크롤할 수 있도록 role="region" + tabIndex={0}을 준다(axe scrollable-region-focusable)
      'jsx-a11y/no-noninteractive-tabindex': ['error', { tags: [], roles: ['tabpanel', 'region'] }],
    },
  },
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
    // `_` 접두는 의도된 미사용(mock 시그니처 인자, rest 구조분해로 필드 제외, 타입 단언용 type alias)
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },
  {
    // shadcn 자동생성 파일 — 직접 수정 금지, false positive 스캔 제외
    ignores: ['node_modules/**', '.worktrees/**', '.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'components/ui/**'],
  },
)
