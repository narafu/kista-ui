# 계좌번호 공개 토글 전체 적용 설계

## 목표

계좌번호가 표시되는 모든 위치에 `RevealableValue` 토글을 적용한다.

## 현황

`RevealableValue` (눈 아이콘 버튼으로 마스킹↔전체번호 전환) 컴포넌트가 `widgets/revealable-value`에 존재하며, 현재 `StrategyDetail`에서만 사용 중이다.

## 적용 대상

| 파일 | 변경 내용 |
|---|---|
| `widgets/account-card/AccountCard.tsx` | 모바일(line 57)·PC(line 107) 두 곳 RevealableValue 교체 |
| `widgets/account-detail/AccountSummaryCard.tsx` | KpiCard value 내 RevealableValue 교체 |
| `widgets/strategy-card/StrategyCard.tsx` | `accountLabel?: string` → `accountLabel?: string \| ReactNode` |
| `widgets/all-strategies/AllStrategiesList.tsx` | accountMap을 accountNoMasked 대신 RevealableValue 노드 생성으로 변경 |
| `app/(main)/statistics/page.tsx` | span → RevealableValue 교체 |
| `app/(admin)/admin/accounts/page.tsx` | td 내 텍스트 → RevealableValue 교체 |
| `app/(admin)/admin/logs/page.tsx` | td 내 텍스트 → RevealableValue 교체 |

## 제외

- `features/account/edit-account/EditAccountForm.tsx`: readonly input의 `defaultValue`로 사용 — input 필드에 RevealableValue 토글 적용은 UX상 부적절하므로 제외

## 공통 패턴

```tsx
<RevealableValue
  value={account.accountNo ?? account.accountNoMasked}
  hiddenDisplay={account.accountNoMasked}
/>
```

- `accountNo`(전체번호)가 있으면 공개 시 전체번호 표시
- 없으면 `accountNoMasked` 그대로 표시
- Link 컴포넌트 내부에 위치할 때: RevealableValue 내부에서 `e.stopPropagation()` 처리 중 — 추가 작업 불필요

## StrategyCard props 변경

```tsx
// 변경 전
interface Props {
  accountLabel?: string
}

// 변경 후
import type { ReactNode } from 'react'
interface Props {
  accountLabel?: string | ReactNode
}
```

`AllStrategiesList`에서 accountMap 타입을 `Map<string, ReactNode>`로 변경하고 RevealableValue 노드를 생성해 전달한다.
