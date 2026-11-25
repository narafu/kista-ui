import nextPlugin from '@next/eslint-plugin-next'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

// 런타임 소스 구조 규칙(docs/agents/shared.md "cache"·"metadata"). no-restricted-syntax는 config 객체끼리 병합되지 않고
// 뒤 객체가 덮어쓰므로, 파일 묶음마다 해당 selector를 모두 합쳐 건다.
const runtimeFiles = ['app/**', 'widgets/**', 'features/**', 'entities/**']
const nonRuntimeFiles = ['**/*.{test,spec,docs,fixture}.*', '**/{__fixtures__,__tests__,docs,fixtures,test,tests}/**']
const cacheSelectors = [
  { selector: 'Identifier[name=/^getCached(Accounts|Strategies|User)$/]', message: '가변 인증 데이터에 Next Data Cache 리더를 쓰지 않는다(docs/agents/shared.md "cache").' },
  { selector: "Property[key.name='initialDataUpdatedAt'][computed=false][value.value=0], Property[key.value='initialDataUpdatedAt'][value.value=0], Property[key.name='initialDataUpdatedAt'] > :matches(TSAsExpression, TSTypeAssertion).value > Literal.expression[value=0]", message: 'initialDataUpdatedAt: 0으로 hydration을 강제로 stale 처리하지 않는다.' },
]
const hookRefreshSelector = { selector: "CallExpression[callee.object.name='router'][callee.property.name='refresh']", message: 'entities hook에서 router.refresh()로 캐시 동기화를 대신하지 않는다(docs/agents/shared.md "router.refresh() 허용 범위").' }
const titleSuffixSelectors = [
  { selector: 'Literal[value=/\\| KISTA/], TemplateElement[value.raw=/\\| KISTA/]', message: '접미사 " | KISTA"는 root layout의 title.template이 붙인다(docs/agents/copy.md).' },
]
const nestedLayoutTitleSelector = { selector: "Property[key.name='title'][value.type=/^(Literal|TemplateLiteral)$/]", message: '중첩 layout은 title을 문자열로 쓰지 않는다 — 하위 라우트의 template 상속이 끊긴다.' }
const formatSelectors = [
  { selector: "CallExpression[callee.property.name=/^(toFixed|toLocaleString|toLocaleDateString|toLocaleTimeString)$/]", message: '숫자·날짜 표기는 shared/lib/format의 포매터를 쓴다(fmtDecimal, roundDecimal 등).' },
]
// 토큰은 @theme 이름 유틸리티로만 쓴다(text-status-error, rounded-xl, shadow-card) — 임의값 `-[var(--x)]`·`-(--x)`는 막는다
const tokenSelectors = [
  { selector: 'Literal[value=/-\\[var\\(--|-\\(--/], TemplateElement[value.raw=/-\\[var\\(--|-\\(--/]', message: '디자인 토큰은 이름 유틸리티로 쓴다(text-status-error, rounded-xl 등). 없으면 app/globals.css @theme에 별칭을 더한다.' },
]
const restrict = (...selectors) => ({ 'no-restricted-syntax': ['error', ...selectors] })

export default tseslint.config(
  nextPlugin.configs['core-web-vitals'],
  jsxA11y.flatConfigs.strict,
  {
    rules: {
      // AmountInput·RadioGroupItem은 내부에 <input>을 렌더링해 <label>로 감싸면 DOM 중첩으로 연결된다 — 규칙이 커스텀 컴포넌트를 컨트롤로 인식하지 못해 생기는 오탐 방지
      'jsx-a11y/label-has-associated-control': ['error', { controlComponents: ['AmountInput', 'RadioGroupItem'], depth: 4 }],
      // 가로 스크롤 표 컨테이너는 키보드로 스크롤할 수 있도록 role="region" + tabIndex={0}을 준다(axe scrollable-region-focusable)
      'jsx-a11y/no-noninteractive-tabindex': ['error', { tags: [], roles: ['tabpanel', 'region'] }],
    },
  },
  {
    // 쓸모없어진 eslint-disable 주석을 잡는다
    linterOptions: { reportUnusedDisableDirectives: 'error' },
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
    files: runtimeFiles,
    ignores: nonRuntimeFiles,
    rules: {
      ...restrict(...tokenSelectors, ...formatSelectors, ...cacheSelectors),
      'no-restricted-imports': ['error', {
        paths: [{ name: 'next/cache', importNames: ['unstable_cache', 'cacheTag'], message: '가변 인증 데이터에 persistent cache를 쓰지 않는다(docs/agents/shared.md "cache").' }],
      }],
    },
  },
  { files: ['entities/**/hooks/**'], ignores: nonRuntimeFiles, rules: restrict(...tokenSelectors, ...formatSelectors, ...cacheSelectors, hookRefreshSelector) },
  { files: ['app/**'], ignores: [...nonRuntimeFiles, 'app/layout.tsx'], rules: restrict(...tokenSelectors, ...formatSelectors, ...cacheSelectors, ...titleSuffixSelectors) },
  { files: ['app/**/layout.tsx'], ignores: [...nonRuntimeFiles, 'app/layout.tsx'], rules: restrict(...tokenSelectors, ...formatSelectors, ...cacheSelectors, ...titleSuffixSelectors, nestedLayoutTitleSelector) },
  { files: ['shared/**'], ignores: nonRuntimeFiles, rules: restrict(...tokenSelectors) },
  { files: ['shared/ui/**'], ignores: nonRuntimeFiles, rules: restrict(...tokenSelectors, ...formatSelectors) },
  {
    // shadcn 자동생성 파일 — 직접 수정 금지, false positive 스캔 제외
    ignores: ['node_modules/**', '.worktrees/**', '.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'components/ui/**'],
  },
)
