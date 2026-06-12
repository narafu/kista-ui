---
name: fsd-scaffold
description: FSD 계층에 새 슬라이스를 생성. 사용법: /fsd-scaffold <layer> <sliceName> (예: /fsd-scaffold entities order, /fsd-scaffold features account/edit-account)
---

인자를 파싱하세요: 첫 번째는 레이어(entities|features|widgets), 두 번째는 슬라이스명.

프로젝트 루트: `/d/src/study/kista/kista-ui`

## entities 생성

다음 4개 파일을 생성하세요:

**`entities/{slice}/model/types.ts`**
```ts
export interface {PascalCase}Response {
  id: number
}
```

**`entities/{slice}/api/index.ts`**
```ts
import { clientFetch, apiFetch } from '@shared/lib/api-client'

export async function list{PascalCase}s(token?: string) {
  if (token) return apiFetch<{PascalCase}Response[]>('/{slice}s', {}, token)
  return clientFetch<{PascalCase}Response[]>('/{slice}s')
}
```

**`entities/{slice}/hooks/index.ts`**
```ts
import { useQuery } from '@tanstack/react-query'
import { list{PascalCase}s } from '../api'

export function use{PascalCase}sQuery() {
  return useQuery({
    queryKey: ['{slice}s'],
    queryFn: () => list{PascalCase}s(),
  })
}
```

**`entities/{slice}/index.ts`**
```ts
export * from './model/types'
export * from './api'
export * from './hooks'
```

## features 생성

슬라이스명이 `domain/slice-name` 형태일 때:

**`features/{domain}/{slice-name}/{SliceName}.tsx`**
```tsx
'use client'

export function {SliceName}() {
  return <div>{SliceName}</div>
}
```

**`features/{domain}/{slice-name}/index.ts`**
```ts
export { {SliceName} } from './{SliceName}'
```

## widgets 생성

**`widgets/{slice}/{SliceName}.tsx`**
```tsx
export function {SliceName}() {
  return <div>{SliceName}</div>
}
```

**`widgets/{slice}/index.ts`**
```ts
export { {SliceName} } from './{SliceName}'
```

---

생성 후 반드시 확인:
- import는 반드시 FSD alias(`@entities/*`, `@features/*`, `@shared/*`) 사용
- 동일 계층 cross-import 금지 (entities끼리, features끼리)
- `index.ts`를 통해서만 외부 접근 허용
