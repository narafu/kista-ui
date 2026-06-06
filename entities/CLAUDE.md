# entities/ — 도메인 모델 · API 함수 · React Query 훅

FSD 계층에서 가장 저수준 도메인 레이어. `shared/`만 import 가능. 동일 계층 cross-import 금지.

## 의존성 규칙

```
entities/{domain}  →  shared/
```

entities끼리 직접 참조 금지. 두 도메인을 조합해야 하면 `features/` 또는 `widgets/`에서 처리.

## 슬라이스 목록

| 슬라이스 | 역할 |
|---|---|
| `account` | 계좌 CRUD, KIS 연결 테스트, 증거금 조회 |
| `strategy` | 전략(TradingCycle) CRUD, 일시정지/재개 |
| `order` | 다음 주문 미리보기, 주문 취소 |
| `trade` | 거래 내역, 사이클 히스토리, 수익 통계, SSE 거래 알림 |
| `user` | 현재 사용자 조회, 로그아웃, 재신청, 회원 탈퇴, 설정 변경 |
| `market` | 시장 휴일, 마켓 세션 |
| `meta` | 전략 타입/종목 메타데이터 (MetaProvider 포함) |
| `fcm` | FCM 토큰 등록/해제 (FcmAutoRegister 포함) |
| `portfolio` | 포트폴리오 스냅샷, 손익 |
| `privacy` | PRIVACY 전략 기준 매매표 |
| `admin-stats` | 어드민 통계/감사로그/이상감지 |

## 슬라이스 내부 구조

```
entities/{domain}/
  api/index.ts       # apiFetch/clientFetch 기반 API 함수
  model/types.ts     # TypeScript 타입/인터페이스
  hooks/             # React Query useXxxQuery / useXxxMutation
  providers/         # Context Provider (meta, fcm, trade 한정)
  index.ts           # public re-export만 (내부 파일 직접 import 금지)
```

## 훅 작성 패턴

- **Server Component prop → initialData**: 서버가 내려준 prop을 `useXxxQuery(id, initialData)`로 연결 — 뮤테이션 후 `invalidateQueries`로 즉시 리페치. `AccountDetailTabs`/`AdminPendingList` 등이 이 패턴 사용.
- **삭제 후 페이지 이동**: `invalidateQueries` 대신 `removeQueries` 사용 — `invalidateQueries`는 캐시를 만료 표시만 해 이동 후 stale 데이터 잠깐 표시됨. `useDeleteAccountMutation` 참고.
- Query 훅: `useXxxQuery` — `queryKey`, `queryFn`, 필요 시 `initialData`/`staleTime`
- Mutation 훅: `useXxxMutation` — `onSuccess`에 `toast.success` + `queryClient.invalidateQueries`, `onError`에 `toast.error` **캡슐화 필수**
- 호출부에서 추가 동작이 필요하면 `mutation.mutate(data, { onSuccess: () => callback() })` 패턴 사용

```ts
// 예시
export function useDeleteAccountMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      toast.success('계좌가 삭제되었습니다')
    },
    onError: () => toast.error('삭제 실패'),
  })
}
```

## index.ts 규칙

각 슬라이스 최상단 `index.ts`가 public API. 외부에서 내부 파일 직접 import 금지.

```ts
// ❌ 금지
import { deleteAccount } from '@entities/account/api'
// ✅ 허용
import { deleteAccount } from '@entities/account'
```

## 주요 도메인별 quirk

상세 내용은 `lib/CLAUDE.md` 참고 (kista-api DTO 필드, KIS API quirk, queryKey 목록 등).

- **account**: `accountNo`는 8자리만. `kisAccountType`은 항상 `"01"`. `AccountResponse`에 strategyType 없음.
- **strategy**: 백엔드 이름은 `TradingCycle`. `normalizeStrategy()`로 DTO → Strategy 변환. `cycleSeedType`은 `?? 'NONE'` 기본값.
- **meta**: `MetaProvider`는 `(main)/layout.tsx`에서만 제공 → `(main)` 밖 `useMeta()` 호출 불가. `useMeta()`는 `findTicker(code)` 헬퍼 제공. `TickerMeta.targetProfitRate`는 `string` 타입 — 사용 시 `parseFloat()` 변환 필요.
- **trade/providers**: `TradeNotificationProvider` — SSE `/api/trades/stream` 구독, 체결 toast 표시. `(main)/layout.tsx`에 마운트.
