import nextPlugin from '@next/eslint-plugin-next'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  nextPlugin.configs['core-web-vitals'],
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
