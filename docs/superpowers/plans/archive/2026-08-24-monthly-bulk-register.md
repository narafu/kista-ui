# 월별 가계부 일괄 등록 + 등록 알림 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 지난달 자산/수입/소비/저축 기록을 임의의 대상 월로 한 번에 복제 등록하는 화면을 만들고, 이번 달 가계부 등록이 없으면 월말에 FCM으로 알려주는 기능을 추가한다.

**Architecture:** kista-api에 기존 `AssetSnapshotUseCase`/`FinanceTransactionUseCase`를 재사용하는 배치 등록 엔드포인트 1개, 월말 등록 여부 확인 스케줄러 1개, 신규 알림 타입 1개를 추가한다. kista-ui에 소스월→대상월 프리뷰 페이지 1개, 가계부 설정탭 진입 버튼, 설정 페이지 알림 토글을 추가한다.

**Tech Stack:** kista-api = Java 21 · Spring Boot 3 · Hexagonal. kista-ui = Next.js 16 · TypeScript · React Query · shadcn/ui.

**저장소:** `kista-api`와 `kista-ui`는 독립 git 저장소다(`C:\Users\USER\workspace\kista\kista-api`, `C:\Users\USER\workspace\kista\kista-ui`). 각 태스크 시작 전 명시된 디렉토리로 이동해서 작업하고, 그 저장소에서 개별 커밋한다.

---

## Task Group A — kista-api: 배치 등록 엔드포인트

### Task A1: BulkFinanceRegister 도메인 커맨드/DTO

**저장소:** `C:\Users\USER\workspace\kista\kista-api`

**Files:**
- Create: `src/main/java/kistaapi/domain/model/finance/BulkFinanceRegisterCommand.java`
- Create: `src/main/java/kistaapi/adapter/in/web/dto/BulkFinanceRegisterRequest.java`
- Create: `src/main/java/kistaapi/adapter/in/web/dto/BulkFinanceRegisterResponse.java`
- Reference (읽기 전용, 필드 shape 참고): `domain/model/finance/AssetSnapshotCommand.java`, `domain/model/finance/FinanceTransactionCommand.java`, `adapter/in/web/dto/AssetSnapshotRequest.java`, `adapter/in/web/dto/FinanceTransactionRequest.java`
- Reference (배치 요청 wrapper 패턴): `adapter/in/web/dto/AdminManualTradeCorrectionRequest.java`

- [ ] **Step 1: 요청 DTO 작성**

`AssetSnapshotRequest`/`FinanceTransactionRequest`와 동일한 필드 shape를 그대로 List로 감싼다 (신규 검증 규칙을 만들지 않고 기존 DTO의 `@NotNull`/`@PositiveOrZero` 애노테이션을 그대로 복사한다):

```java
package kistaapi.adapter.in.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import kistaapi.domain.model.finance.AssetClass;
import kistaapi.domain.model.finance.Market;

import java.time.LocalDate;
import java.util.List;

public record BulkFinanceRegisterRequest(
    @Valid List<AssetItem> assets,
    @Valid List<TransactionItem> transactions
) {
    public record AssetItem(
        @NotNull String categoryId,
        String accountId,
        @NotNull LocalDate entryDate,
        @NotNull AssetClass assetClass,
        @NotNull Market market,
        String strategy,
        String memo,
        @PositiveOrZero long amount
    ) {}

    public record TransactionItem(
        @NotNull String categoryId,
        @NotNull LocalDate transactionDate,
        @PositiveOrZero long amount,
        String memo
    ) {}
}
```

- [ ] **Step 2: 응답 DTO 작성**

성공/실패를 항목별로 구분해 반환한다(한 항목 실패가 전체를 롤백시키지 않도록 서비스 레벨에서 개별 try/catch — Step A2에서 구현):

```java
package kistaapi.adapter.in.web.dto;

import java.util.List;

public record BulkFinanceRegisterResponse(
    int assetSuccessCount,
    int transactionSuccessCount,
    List<String> failures
) {}
```

- [ ] **Step 3: 커맨드 레코드 작성**

`AssetSnapshotCommand`/`FinanceTransactionCommand`를 그대로 재사용할 수 있는지 먼저 확인한다(둘 다 이미 `categoryId, accountId, entryDate, assetClass, market, strategy, memo, amount` / `categoryId, transactionDate, amount, memo` 필드를 갖고 있으면 별도 Command 클래스가 필요 없다 — 컨트롤러에서 DTO → 기존 Command로 바로 매핑). 실제 필드가 다르면(예: `AssetSnapshotCommand`가 `userId`를 포함) 그 차이만 흡수하는 매핑 메서드를 컨트롤러에 추가한다. 별도 `BulkFinanceRegisterCommand` 클래스는 만들지 않는다 — YAGNI, 기존 Command 2종을 그대로 재사용.

- [ ] **Step 4: 컴파일 확인**

Run: `cd /d/src/kyobo 아님, 실제 경로는` — 대신 `bash gradlew compileJava` (작업 디렉토리는 `C:\Users\USER\workspace\kista\kista-api`)
Expected: BUILD SUCCESSFUL

- [ ] **Step 5: Commit**

```bash
git add src/main/java/kistaapi/adapter/in/web/dto/BulkFinanceRegisterRequest.java src/main/java/kistaapi/adapter/in/web/dto/BulkFinanceRegisterResponse.java
git commit -m "feat(finance): 가계부 일괄 등록 요청/응답 DTO 추가"
```

---

### Task A2: BulkFinanceRegisterService + UseCase + Controller

**저장소:** `C:\Users\USER\workspace\kista\kista-api`

**Files:**
- Create: `src/main/java/kistaapi/domain/port/in/BulkFinanceRegisterUseCase.java`
- Create: `src/main/java/kistaapi/application/service/finance/BulkFinanceRegisterService.java`
- Create: `src/main/java/kistaapi/adapter/in/web/FinanceBulkController.java`
- Test: `src/test/java/kistaapi/application/service/finance/BulkFinanceRegisterServiceTest.java`
- Reference (loop + 단일 @Transactional 패턴): `application/service/admin/AdminTradeCorrectionService.java:51-70`
- Reference (기존 유스케이스 시그니처): `domain/port/in/AssetSnapshotUseCase.java`, `domain/port/in/FinanceTransactionUseCase.java`

- [ ] **Step 1: UseCase 인터페이스 작성**

```java
package kistaapi.domain.port.in;

import kistaapi.adapter.in.web.dto.BulkFinanceRegisterRequest;
import kistaapi.adapter.in.web.dto.BulkFinanceRegisterResponse;

import java.util.UUID;

public interface BulkFinanceRegisterUseCase {
    BulkFinanceRegisterResponse register(UUID userId, UUID groupId, BulkFinanceRegisterRequest request);
}
```

(DTO를 포트 시그니처에 직접 쓰는 건 원칙적으로 지양하지만, 이 배치 엔드포인트는 순수 pass-through라 중간 Command 계층을 추가하면 동일한 필드를 두 번 선언하는 보일러플레이트만 늘어난다 — YAGNI. 기존 `AssetSnapshotUseCase.create(UUID userId, UUID groupId, AssetSnapshotCommand command)` 시그니처를 열어서 DTO가 아니라 Command를 쓰는 패턴이면 그것을 따르고, 이 UseCase도 동일하게 `List<AssetSnapshotCommand>`/`List<FinanceTransactionCommand>`를 받도록 맞춘다 — 실제 기존 시그니처를 먼저 확인 후 결정.)

- [ ] **Step 2: 실패 테스트 작성 (일부 항목 실패해도 나머지는 등록됨을 검증)**

```java
package kistaapi.application.service.finance;

import kistaapi.adapter.in.web.dto.BulkFinanceRegisterRequest;
import kistaapi.adapter.in.web.dto.BulkFinanceRegisterResponse;
import kistaapi.domain.port.in.AssetSnapshotUseCase;
import kistaapi.domain.port.in.FinanceTransactionUseCase;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class BulkFinanceRegisterServiceTest {

    @Test
    void 항목_하나가_실패해도_나머지는_등록된다() {
        AssetSnapshotUseCase assetSnapshotUseCase = mock(AssetSnapshotUseCase.class);
        FinanceTransactionUseCase transactionUseCase = mock(FinanceTransactionUseCase.class);
        BulkFinanceRegisterService service =
            new BulkFinanceRegisterService(assetSnapshotUseCase, transactionUseCase);

        UUID userId = UUID.randomUUID();
        UUID groupId = UUID.randomUUID();

        var asset1 = new BulkFinanceRegisterRequest.AssetItem(
            "cat-1", null, LocalDate.of(2026, 8, 1),
            kistaapi.domain.model.finance.AssetClass.CASH,
            kistaapi.domain.model.finance.Market.KR, null, "메모1", 1000L);
        var asset2 = new BulkFinanceRegisterRequest.AssetItem(
            "cat-2", null, LocalDate.of(2026, 8, 1),
            kistaapi.domain.model.finance.AssetClass.CASH,
            kistaapi.domain.model.finance.Market.KR, null, "메모2", 2000L);

        doThrow(new IllegalArgumentException("카테고리 없음"))
            .when(assetSnapshotUseCase).create(eq(userId), eq(groupId), argThat(c -> c.memo().equals("메모1")));

        var request = new BulkFinanceRegisterRequest(List.of(asset1, asset2), List.of());

        BulkFinanceRegisterResponse response = service.register(userId, groupId, request);

        assertThat(response.assetSuccessCount()).isEqualTo(1);
        assertThat(response.failures()).hasSize(1);
        verify(assetSnapshotUseCase, times(1)).create(eq(userId), eq(groupId), argThat(c -> c.memo().equals("메모2")));
    }
}
```

주의: 위 테스트는 `AssetSnapshotUseCase.create`의 실제 시그니처(`Command` 타입, 메서드명)를 Step 1에서 확인한 실제 시그니처로 맞춰 써야 한다 — 컴파일 전 `domain/port/in/AssetSnapshotUseCase.java` 실제 내용을 Read로 확인.

- [ ] **Step 3: 테스트 실행 → 실패 확인**

Run: `bash gradlew test --tests "kistaapi.application.service.finance.BulkFinanceRegisterServiceTest"`
Expected: FAIL (BulkFinanceRegisterService 없음, 컴파일 에러)

- [ ] **Step 4: 서비스 구현**

`AdminTradeCorrectionService`의 "한 트랜잭션 안에서 리스트를 순회하며 개별 처리" 패턴을 따르되, 개별 항목 실패가 전체 트랜잭션을 롤백하지 않도록 각 `create()` 호출을 try/catch로 감싼다(전체를 하나의 `@Transactional`로 묶으면 한 항목 예외가 전체 롤백을 유발하므로, 이 배치는 **항목별 독립 처리**가 요구사항이다 — `AdminTradeCorrectionService`와 다른 지점이니 그대로 복붙하지 말 것):

```java
package kistaapi.application.service.finance;

import kistaapi.adapter.in.web.dto.BulkFinanceRegisterRequest;
import kistaapi.adapter.in.web.dto.BulkFinanceRegisterResponse;
import kistaapi.domain.port.in.AssetSnapshotUseCase;
import kistaapi.domain.port.in.BulkFinanceRegisterUseCase;
import kistaapi.domain.port.in.FinanceTransactionUseCase;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
class BulkFinanceRegisterService implements BulkFinanceRegisterUseCase {

    private final AssetSnapshotUseCase assetSnapshotUseCase;
    private final FinanceTransactionUseCase financeTransactionUseCase;

    BulkFinanceRegisterService(AssetSnapshotUseCase assetSnapshotUseCase, FinanceTransactionUseCase financeTransactionUseCase) {
        this.assetSnapshotUseCase = assetSnapshotUseCase;
        this.financeTransactionUseCase = financeTransactionUseCase;
    }

    @Override
    public BulkFinanceRegisterResponse register(UUID userId, UUID groupId, BulkFinanceRegisterRequest request) {
        List<String> failures = new ArrayList<>();
        int assetSuccess = 0;
        int txSuccess = 0;

        for (var item : request.assets()) {
            try {
                // 실제 AssetSnapshotCommand 생성자/필드는 Task A1 Step 3에서 확인한 실제 시그니처로 교체
                assetSnapshotUseCase.create(userId, groupId, toAssetCommand(item));
                assetSuccess++;
            } catch (Exception e) {
                failures.add("자산(" + item.memo() + "): " + e.getMessage());
            }
        }

        for (var item : request.transactions()) {
            try {
                financeTransactionUseCase.create(userId, groupId, toTransactionCommand(item));
                txSuccess++;
            } catch (Exception e) {
                failures.add("거래(" + item.memo() + "): " + e.getMessage());
            }
        }

        return new BulkFinanceRegisterResponse(assetSuccess, txSuccess, failures);
    }

    // toAssetCommand / toTransactionCommand: Task A1에서 확정한 실제 Command 레코드 생성자에 맞춰 구현
}
```

- [ ] **Step 5: 테스트 실행 → 통과 확인**

Run: `bash gradlew test --tests "kistaapi.application.service.finance.BulkFinanceRegisterServiceTest"`
Expected: PASS

- [ ] **Step 6: 컨트롤러 작성**

기존 `AssetSnapshotController`의 `groupId` 쿼리 파라미터 + 인증 사용자 주입 패턴을 그대로 따른다(실제 인증 주입 방식은 `AssetSnapshotController.create` 실제 코드를 Read로 확인 후 동일하게):

```java
package kistaapi.adapter.in.web;

import kistaapi.adapter.in.web.dto.BulkFinanceRegisterRequest;
import kistaapi.adapter.in.web.dto.BulkFinanceRegisterResponse;
import kistaapi.domain.port.in.BulkFinanceRegisterUseCase;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/finance/bulk-register")
class FinanceBulkController {

    private final BulkFinanceRegisterUseCase useCase;

    FinanceBulkController(BulkFinanceRegisterUseCase useCase) {
        this.useCase = useCase;
    }

    @PostMapping
    BulkFinanceRegisterResponse register(
        @AuthenticationPrincipal /* 실제 principal 타입은 AssetSnapshotController와 동일하게 맞춘다 */ Object principal,
        @RequestParam(required = false) UUID groupId,
        @RequestBody @Valid BulkFinanceRegisterRequest request
    ) {
        UUID userId = /* AssetSnapshotController와 동일한 방식으로 principal에서 추출 */ null;
        return useCase.register(userId, groupId, request);
    }
}
```

`@AuthenticationPrincipal`의 실제 타입과 `userId` 추출 방식은 `AssetSnapshotController.create` 메서드를 Read로 확인해 그대로 맞춘다 — 이 프로젝트의 인증 주입 컨벤션을 새로 만들지 않는다.

- [ ] **Step 7: 컴파일 + 테스트 확인**

Run: `bash gradlew compileJava test --tests "kistaapi.application.service.finance.*"`
Expected: BUILD SUCCESSFUL, PASS

- [ ] **Step 8: Commit**

```bash
git add src/main/java/kistaapi/domain/port/in/BulkFinanceRegisterUseCase.java src/main/java/kistaapi/application/service/finance/BulkFinanceRegisterService.java src/main/java/kistaapi/adapter/in/web/FinanceBulkController.java src/test/java/kistaapi/application/service/finance/BulkFinanceRegisterServiceTest.java
git commit -m "feat(finance): 자산·거래 일괄 등록 엔드포인트 추가 (POST /api/finance/bulk-register)"
```

---

## Task Group B — kista-ui: 일괄 등록 프리뷰 페이지

### Task B1: bulk-register API 함수 + 타입

**저장소:** `C:\Users\USER\workspace\kista\kista-ui`

**Files:**
- Modify: `entities/finance/model/types.ts` (요청/응답 타입 추가)
- Modify: `entities/finance/api/index.ts` (`bulkRegisterFinance` 함수 추가)
- Modify: `openapi.json` — kista-api Task Group A 배포/로컬 기동 후 `npm run fetch:spec && npm run gen:types` 로 재생성 (수동 편집 금지)
- Test: `entities/finance/api/index.test.ts`

- [ ] **Step 1: kista-api 로컬 기동 후 스펙 재생성**

Run (kista-api 디렉토리에서): `bash gradlew bootRun` (백그라운드) → kista-ui 디렉토리에서 `npm run fetch:spec && npm run gen:types`
Expected: `openapi.json`에 `/api/finance/bulk-register` 경로 추가, `shared/lib/api-types.ts`에 `BulkFinanceRegisterRequest`/`BulkFinanceRegisterResponse` 타입 생성

- [ ] **Step 2: 실패 테스트 작성**

```ts
// entities/finance/api/index.test.ts 에 추가
import { bulkRegisterFinance } from './index'
import { clientFetch } from '@shared/lib/api-client'

vi.mock('@shared/lib/api-client')

describe('bulkRegisterFinance', () => {
  it('POST /api/finance/bulk-register 로 배치 등록 요청을 보낸다', async () => {
    vi.mocked(clientFetch).mockResolvedValue({ assetSuccessCount: 1, transactionSuccessCount: 2, failures: [] })

    const result = await bulkRegisterFinance(
      { assets: [], transactions: [] },
      { groupId: 'group-1' }
    )

    expect(clientFetch).toHaveBeenCalledWith(
      '/api/finance/bulk-register?groupId=group-1',
      expect.objectContaining({ method: 'POST' })
    )
    expect(result.assetSuccessCount).toBe(1)
  })
})
```

- [ ] **Step 3: 테스트 실행 → 실패 확인**

Run: `npm run test:run -- entities/finance/api/index.test.ts`
Expected: FAIL (`bulkRegisterFinance` not exported)

- [ ] **Step 4: 타입 + 함수 구현**

`entities/finance/model/types.ts`에 추가 (openapi 생성 타입을 그대로 re-export하는 기존 패턴을 따른다 — 파일 상단에 이미 있는 `import type { components } from '@shared/lib/api-types'` 방식 확인 후 동일하게):

```ts
export type BulkFinanceRegisterRequest = components['schemas']['BulkFinanceRegisterRequest']
export type BulkFinanceRegisterResponse = components['schemas']['BulkFinanceRegisterResponse']
```

`entities/finance/api/index.ts`에 `createFinanceTransaction`과 동일한 `{ groupId, token }` 옵션 패턴으로 추가:

```ts
export async function bulkRegisterFinance(
  data: BulkFinanceRegisterRequest,
  { groupId, token }: { groupId?: string; token?: string } = {}
): Promise<BulkFinanceRegisterResponse> {
  const qs = groupId ? `?groupId=${groupId}` : ''
  return clientFetch<BulkFinanceRegisterResponse>(`/api/finance/bulk-register${qs}`, jsonBody('POST', data, token))
}
```

(`jsonBody` 헬퍼의 정확한 시그니처는 같은 파일의 `createFinanceTransaction` 실제 구현을 그대로 참고 — 재구현하지 않는다.)

- [ ] **Step 5: 테스트 실행 → 통과 확인**

Run: `npm run test:run -- entities/finance/api/index.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add entities/finance/model/types.ts entities/finance/api/index.ts entities/finance/api/index.test.ts openapi.json shared/lib/api-types.ts
git commit -m "feat(finance): 가계부 일괄 등록 API 함수 추가"
```

---

### Task B2: 소스월 데이터 조회 + 그룹핑 유틸

**저장소:** `C:\Users\USER\workspace\kista\kista-ui`

**Files:**
- Create: `entities/finance/lib/bulkRegisterPreview.ts`
- Test: `entities/finance/lib/bulkRegisterPreview.test.ts`

목적: 소스월의 자산 스냅샷 + 거래내역을 받아서, 카테고리 트리(`buildCategoryIndex`)로 타입(자산/수입/소비/저축)을 분류하고 미리보기 화면에서 쓸 편집 가능한 아이템 리스트로 변환한다.

- [ ] **Step 1: 실패 테스트 작성**

```ts
import { describe, it, expect } from 'vitest'
import { buildBulkRegisterItems } from './bulkRegisterPreview'

describe('buildBulkRegisterItems', () => {
  it('거래내역을 카테고리 타입(INCOME/EXPENSE/SAVING) 기준으로 분류한다', () => {
    const categories = [
      { id: 'cat-income', name: '월급', type: 'INCOME', parentId: null, children: [] },
      { id: 'cat-expense', name: '식비', type: 'EXPENSE', parentId: null, children: [] },
    ]
    const transactions = [
      { id: 't1', categoryId: 'cat-income', memo: '8월급', amount: 3650000, transactionDate: '2026-07-25' },
      { id: 't2', categoryId: 'cat-expense', memo: '생활비카드', amount: 480000, transactionDate: '2026-07-10' },
    ]

    const result = buildBulkRegisterItems({ transactions, assetSnapshots: [], categories })

    expect(result.income).toHaveLength(1)
    expect(result.expense).toHaveLength(1)
    expect(result.income[0]).toMatchObject({ categoryId: 'cat-income', memo: '8월급', amount: 3650000, included: true })
  })
})
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm run test:run -- entities/finance/lib/bulkRegisterPreview.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: 구현**

`entities/finance/lib/categoryIndex.ts`의 `buildCategoryIndex`(카테고리 id → 루트 타입 조회 함수) 실제 export를 확인 후 재사용한다 — 아래는 그 함수가 `categoryIndex.rootTypeOf(categoryId): 'ASSET'|'INCOME'|'EXPENSE'|'SAVING'` 형태라고 가정한 초안이며, 실제 함수 시그니처가 다르면 그에 맞춰 조정:

```ts
import { buildCategoryIndex } from './categoryIndex'
import type { FinanceCategory, FinanceTransaction, AssetSnapshot } from '../model/types'

export interface BulkRegisterItem {
  categoryId: string
  memo?: string
  amount: number
  included: boolean
  // 자산 전용
  assetClass?: string
  market?: string
  strategy?: string
  accountId?: string
}

export interface BulkRegisterItems {
  asset: BulkRegisterItem[]
  income: BulkRegisterItem[]
  expense: BulkRegisterItem[]
  saving: BulkRegisterItem[]
}

export function buildBulkRegisterItems({
  transactions,
  assetSnapshots,
  categories,
}: {
  transactions: FinanceTransaction[]
  assetSnapshots: AssetSnapshot[]
  categories: FinanceCategory[]
}): BulkRegisterItems {
  const index = buildCategoryIndex(categories)

  const result: BulkRegisterItems = { asset: [], income: [], expense: [], saving: [] }

  for (const tx of transactions) {
    const rootType = index.rootTypeOf(tx.categoryId)
    const item: BulkRegisterItem = { categoryId: tx.categoryId, memo: tx.memo, amount: tx.amount, included: true }
    if (rootType === 'INCOME') result.income.push(item)
    else if (rootType === 'EXPENSE') result.expense.push(item)
    else if (rootType === 'SAVING') result.saving.push(item)
  }

  for (const snap of assetSnapshots) {
    result.asset.push({
      categoryId: snap.categoryId,
      memo: snap.memo,
      amount: snap.amount,
      included: true,
      assetClass: snap.assetClass,
      market: snap.market,
      strategy: snap.strategy,
      accountId: snap.accountId,
    })
  }

  return result
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm run test:run -- entities/finance/lib/bulkRegisterPreview.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add entities/finance/lib/bulkRegisterPreview.ts entities/finance/lib/bulkRegisterPreview.test.ts
git commit -m "feat(finance): 일괄 등록 미리보기 아이템 그룹핑 유틸 추가"
```

---

### Task B3: 연/월 셀렉트 쌍 컴포넌트

**저장소:** `C:\Users\USER\workspace\kista\kista-ui`

**Files:**
- Create: `widgets/finance-bulk-register/YearMonthSelect.tsx`
- Test: `widgets/finance-bulk-register/YearMonthSelect.test.tsx`
- Reference: `widgets/asset-overview/AssetOverview.tsx` (연도 그룹핑 Select 패턴)

- [ ] **Step 1: 실패 테스트 작성**

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { YearMonthSelect } from './YearMonthSelect'

describe('YearMonthSelect', () => {
  it('연도와 월을 각각 선택하면 YYYY-MM 문자열로 onChange를 호출한다', () => {
    const onChange = vi.fn()
    render(<YearMonthSelect value="2026-07" onChange={onChange} />)

    fireEvent.click(screen.getByLabelText('월'))
    fireEvent.click(screen.getByText('8월'))

    expect(onChange).toHaveBeenCalledWith('2026-08')
  })
})
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm run test:run -- widgets/finance-bulk-register/YearMonthSelect.test.tsx`
Expected: FAIL

- [ ] **Step 3: 구현**

`shared/ui`의 `Select`/`SelectItem` primitive를 사용한다(정확한 import 경로는 `AssetForm.tsx` 상단 import 문 확인). 연도는 `value` 기준 ±3년 범위를 생성한다:

```tsx
'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Props {
  value: string // 'YYYY-MM'
  onChange: (value: string) => void
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

export function YearMonthSelect({ value, onChange }: Props) {
  const [year, month] = value.split('-').map(Number)
  const years = Array.from({ length: 7 }, (_, i) => year - 3 + i)

  const emit = (nextYear: number, nextMonth: number) => {
    onChange(`${nextYear}-${String(nextMonth).padStart(2, '0')}`)
  }

  return (
    <div className="flex gap-2">
      <Select value={String(year)} onValueChange={(v) => emit(Number(v), month)}>
        <SelectTrigger aria-label="연도" className="w-24"><SelectValue /></SelectTrigger>
        <SelectContent>
          {years.map((y) => <SelectItem key={y} value={String(y)}>{y}년</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={String(month)} onValueChange={(v) => emit(year, Number(v))}>
        <SelectTrigger aria-label="월" className="w-20"><SelectValue /></SelectTrigger>
        <SelectContent>
          {MONTHS.map((m) => <SelectItem key={m} value={String(m)}>{m}월</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}
```

`shared/ui`의 실제 Select 컴포넌트가 `items` prop 방식(widgets.md 문서: "Base UI Select는 items prop 사용")이면 그 컨벤션에 맞춰 `SelectItem` 자식 나열 대신 `items={years.map(...)}` 형태로 바꾼다 — `AssetForm.tsx`의 기존 Select 사용부를 그대로 참고해서 이 프로젝트 컨벤션에 맞춘다.

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm run test:run -- widgets/finance-bulk-register/YearMonthSelect.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add widgets/finance-bulk-register/YearMonthSelect.tsx widgets/finance-bulk-register/YearMonthSelect.test.tsx
git commit -m "feat(finance): 연/월 셀렉트 쌍 컴포넌트 추가"
```

---

### Task B4: BulkRegisterForm 위젯 (프리뷰 + 제출)

**저장소:** `C:\Users\USER\workspace\kista\kista-ui`

**Files:**
- Create: `widgets/finance-bulk-register/BulkRegisterForm.tsx`
- Test: `widgets/finance-bulk-register/BulkRegisterForm.test.tsx`
- Reference: 확정된 목업 UI — Artifact URL `https://claude.ai/code/artifact/bcdafcda-d637-4dc1-bae7-b927614f9642` (WebFetch로 실제 HTML/CSS 확인 가능. 원본 파일은 이 세션 로컬 scratchpad에만 있어 다른 세션에서 경로 접근 불가 — 반드시 URL로 열어서 마크업/클래스를 참고할 것)

이 태스크는 목업 화면을 실제 데이터로 채우는 작업이다. 상세 시각 디자인(토큰, 카드 스타일, 배지 등)은 이미 확정된 아티팩트를 그대로 코드로 옮긴다 — 새로 디자인하지 않는다.

**확정된 디자인 사양 (아티팩트에서 반영된 최종 결정, 브레인스토밍 중 여러 번 수정됨 — 아래가 최종본):**
- 섹션은 4개: 자산 → 수입 → 소비 → 저축 (예산은 이 화면에서 다루지 않음 — 이미 별도로 잘 되고 있다고 사용자가 확인함)
- "확인 필요" 같은 배지류는 전부 제거함 — 넣지 말 것
- 자산 필드/정렬: 카테고리 → 자산군 → 운용전략(투자 카테고리에만 값 존재, 나머진 "—") → 메모 → 금액. 정렬 기준은 카테고리 › 자산군 › 메모 › 금액 순(운용전략은 정렬 키가 아니라 표시 전용 컬럼)
- 수입/소비/저축 필드/정렬: 카테고리 → 메모 → 금액. 정렬 기준은 카테고리 › 메모 › 금액 순
- 자산 섹션은 소스월의 금액만 보여주면 됨(대상월 반영값 입력 필드 하나만 — "지난달 금액" 별도 컬럼 넣지 않음, 수입/소비/저축과 동일한 단일 입력 방식)
- 모든 행(자산/수입/소비/저축 전부)에 포함/제외 토글이 있어야 함 — 모바일은 각 행 우측 끝 동그란 스위치, PC 표는 "포함" 열
- **토글을 끈 항목은 대상월에 등록되지 않고, 그 다음 달 미리보기에도 자동으로 다시 나타나지 않는다** — 미리보기는 항상 "소스월에 실제로 등록된 데이터"를 조회해서 만들어지므로(신규 소스 조회 = `useFinanceTransactionsQuery`/필터된 자산 스냅샷), 한번 뺀 항목은 다시 등록하려면 개별 등록으로 넣어야 함. 이 동작은 별도 구현이 필요없고 "매번 실제 등록분만 조회한다"는 설계 자체로 자동 충족됨 — 잘못 이해해서 "제외 이력"을 따로 저장하는 우를 범하지 말 것
- PC 레이아웃은 2열 그리드: 왼쪽 = 자산(세로로 긺, 단독 배치), 오른쪽 열에 수입 → 소비 → 저축 카드를 이 순서로 위에서부터 쌓음
- 페이지 타이틀은 고정 문구가 아니라 `[연도Select][월Select] 기록으로 [연도Select][월Select] 모두 등록` 형태 — Task B3의 `YearMonthSelect`를 소스/타겟 각각에 배치. 기본값은 소스=지난달, 타겟=이번달(Task B4 구현의 `lastMonth(thisMonth())`/`thisMonth()`가 이미 이 기본값을 따름)

- [ ] **Step 1: 실패 테스트 작성 (핵심 동작만 — 렌더링 스타일은 스냅샷 대신 동작 테스트)**

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BulkRegisterForm } from './BulkRegisterForm'
import * as api from '@entities/finance/api'

vi.mock('@entities/finance/api')

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('BulkRegisterForm', () => {
  it('행의 제외 토글을 끄면 확정 시 해당 항목이 요청에서 빠진다', async () => {
    vi.mocked(api.listFinanceTransactions).mockResolvedValue([
      { id: 't1', categoryId: 'cat-income', memo: '월급', amount: 3650000, transactionDate: '2026-07-25' },
    ])
    vi.mocked(api.listAssetSnapshots).mockResolvedValue([])
    vi.mocked(api.bulkRegisterFinance).mockResolvedValue({ assetSuccessCount: 0, transactionSuccessCount: 0, failures: [] })

    renderWithClient(<BulkRegisterForm defaultSourceMonth="2026-07" defaultTargetMonth="2026-08" />)

    await waitFor(() => screen.getByText('월급'))
    fireEvent.click(screen.getByRole('switch', { name: /월급 포함/ }))
    fireEvent.click(screen.getByRole('button', { name: /확정/ }))

    await waitFor(() => {
      expect(api.bulkRegisterFinance).toHaveBeenCalledWith(
        expect.objectContaining({ transactions: [] }),
        expect.anything()
      )
    })
  })
})
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm run test:run -- widgets/finance-bulk-register/BulkRegisterForm.test.tsx`
Expected: FAIL

- [ ] **Step 3: 구현**

핵심 로직 골격 (스타일은 확정 아티팩트의 마크업/클래스를 Tailwind 클래스로 옮겨 적용 — 아래는 상태/데이터 흐름 골격만):

```tsx
'use client'

import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { YearMonthSelect } from './YearMonthSelect'
import { buildBulkRegisterItems, type BulkRegisterItem } from '@entities/finance/lib/bulkRegisterPreview'
import { bulkRegisterFinance } from '@entities/finance/api'
import { useFinanceTransactionsQuery, useAssetSnapshotsQuery, useFinanceCategoriesQuery } from '@entities/finance/hooks/useFinanceQueries'
import { financeKeys } from '@entities/finance/model/queryKeys'
import { Button } from '@/components/ui/button'

function monthBounds(month: string) {
  const [y, m] = month.split('-').map(Number)
  const from = `${month}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const to = `${month}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

function lastMonth(month: string) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function thisMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

interface Props {
  defaultSourceMonth?: string
  defaultTargetMonth?: string
}

export function BulkRegisterForm({ defaultSourceMonth, defaultTargetMonth }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [sourceMonth, setSourceMonth] = useState(defaultSourceMonth ?? lastMonth(thisMonth()))
  const [targetMonth, setTargetMonth] = useState(defaultTargetMonth ?? thisMonth())

  const { from, to } = monthBounds(sourceMonth)
  const { data: transactions = [] } = useFinanceTransactionsQuery(from, to)
  const { data: assetSnapshots = [] } = useAssetSnapshotsQuery() // 클라이언트에서 entryDate 접두사로 sourceMonth 필터
  const { data: categories = [] } = useFinanceCategoriesQuery('ALL') // 실제 지원 인자는 useFinanceCategoriesQuery 실제 시그니처 확인

  const filteredSnapshots = useMemo(
    () => assetSnapshots.filter((s) => s.entryDate.startsWith(sourceMonth)),
    [assetSnapshots, sourceMonth]
  )

  const items = useMemo(
    () => buildBulkRegisterItems({ transactions, assetSnapshots: filteredSnapshots, categories }),
    [transactions, filteredSnapshots, categories]
  )

  const [edited, setEdited] = useState<Record<string, BulkRegisterItem>>({})

  const submit = async () => {
    const allItems = [...items.asset, ...items.income, ...items.expense, ...items.saving]
      .map((item, i) => edited[`${item.categoryId}-${i}`] ?? item)
      .filter((item) => item.included)

    const assets = allItems.filter((i) => 'assetClass' in i && i.assetClass).map((i) => ({
      categoryId: i.categoryId, accountId: i.accountId, entryDate: `${targetMonth}-01`,
      assetClass: i.assetClass!, market: i.market!, strategy: i.strategy, memo: i.memo, amount: i.amount,
    }))
    const transactionItems = allItems.filter((i) => !('assetClass' in i && i.assetClass)).map((i) => ({
      categoryId: i.categoryId, transactionDate: `${targetMonth}-01`, amount: i.amount, memo: i.memo,
    }))

    try {
      const result = await bulkRegisterFinance({ assets, transactions: transactionItems })
      await queryClient.invalidateQueries({ queryKey: financeKeys.all })
      toast.success(`${result.assetSuccessCount + result.transactionSuccessCount}건 등록했어요`)
      router.push('/finance')
    } catch {
      toast.error('일괄 등록에 실패했습니다')
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <YearMonthSelect value={sourceMonth} onChange={setSourceMonth} />
        <span>기록으로</span>
        <YearMonthSelect value={targetMonth} onChange={setTargetMonth} />
        <span>모두 등록</span>
      </div>
      {/* 자산/수입/소비/저축 섹션 렌더링 — 확정 아티팩트의 마크업을 그대로 이식, 각 행 toggle onChange 시 setEdited */}
      <Button onClick={submit}>이대로 확정하기</Button>
    </div>
  )
}
```

`useAssetSnapshotsQuery`/`useFinanceCategoriesQuery`의 정확한 이름과 인자는 `entities/finance/hooks/useFinanceQueries.ts` 실제 export를 Read로 확인 후 맞춘다. 섹션별 UI(카테고리 그룹 헤딩, 행 카드, 제외 토글 스위치, 하단 요약)는 확정된 목업 아티팩트의 HTML/CSS를 Tailwind 클래스 + `globals.css` 토큰(`--card`, `--accent`, `--status-ok` 등)으로 그대로 옮겨서 별도 컴포넌트(`BulkRegisterSection.tsx`, `BulkRegisterRow.tsx`)로 분리한다.

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm run test:run -- widgets/finance-bulk-register/BulkRegisterForm.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add widgets/finance-bulk-register/
git commit -m "feat(finance): 일괄 등록 프리뷰 폼 위젯 추가"
```

---

### Task B5: 라우트 페이지 + 진입 버튼

**저장소:** `C:\Users\USER\workspace\kista\kista-ui`

**Files:**
- Create: `app/(main)/finance/bulk-register/page.tsx`
- Modify: `widgets/asset-settings/AssetSettingsPanel.tsx` (최상단에 "모두 등록" 버튼 카드 추가)
- Test: `widgets/asset-settings/AssetSettingsPanel.test.tsx` (기존 파일에 케이스 추가)

- [ ] **Step 1: 라우트 페이지 작성**

```tsx
import type { Metadata } from 'next'
import { PageHeader } from '@widgets/page-header'
import { BulkRegisterForm } from '@widgets/finance-bulk-register/BulkRegisterForm'

export const metadata: Metadata = {
  title: '가계부 일괄 등록 | KISTA',
  description: '지난달 기록을 이번 달로 한 번에 등록합니다',
}

export default function BulkRegisterPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader eyebrow="가계부" eyebrowHref="/finance" title="한 번에 등록하기" />
      <BulkRegisterForm />
    </div>
  )
}
```

- [ ] **Step 2: AssetSettingsPanel에 버튼 추가 — 실패 테스트 먼저**

```tsx
// widgets/asset-settings/AssetSettingsPanel.test.tsx 에 추가
it('최상단에 모두 등록 버튼이 /finance/bulk-register 로 연결된다', () => {
  render(<AssetSettingsPanel />)
  const link = screen.getByRole('link', { name: /모두 등록/ })
  expect(link).toHaveAttribute('href', '/finance/bulk-register')
})
```

- [ ] **Step 3: 테스트 실행 → 실패 확인**

Run: `npm run test:run -- widgets/asset-settings/AssetSettingsPanel.test.tsx`
Expected: FAIL

- [ ] **Step 4: 구현**

`AssetSettingsPanel.tsx`의 `<div className="flex flex-col gap-[18px]">` 안, 기존 첫 번째 자식(`HideAmountsToggle` 등) 바로 위에 `Surface` 카드를 추가한다:

```tsx
<Surface className="p-6 flex items-center justify-between gap-4">
  <div>
    <div className="text-sm font-bold mb-0.5">한 번에 등록하기</div>
    <div className="text-sm text-muted-foreground">지난달 자산·수입·소비·저축 기록을 이번 달로 한 번에 채워요</div>
  </div>
  <Link href="/finance/bulk-register" className={cn(buttonVariants({ variant: 'default' }))}>모두 등록</Link>
</Surface>
```

`Surface`/`buttonVariants`/`cn` import는 파일 상단 기존 import 구성을 따른다.

- [ ] **Step 5: 테스트 실행 → 통과 확인**

Run: `npm run test:run -- widgets/asset-settings/AssetSettingsPanel.test.tsx`
Expected: PASS

- [ ] **Step 6: 타입체크**

Run: `npm run typecheck`
Expected: 에러 없음

- [ ] **Step 7: Commit**

```bash
git add app/(main)/finance/bulk-register/page.tsx widgets/asset-settings/AssetSettingsPanel.tsx widgets/asset-settings/AssetSettingsPanel.test.tsx
git commit -m "feat(finance): 일괄 등록 페이지 라우트 및 설정탭 진입 버튼 추가"
```

---

## Task Group C — 월말 가계부 등록 알림

### Task C1: kista-api — FINANCE_REMINDER 알림 타입 + FCM 발송

**저장소:** `C:\Users\USER\workspace\kista\kista-api`

**Files:**
- Modify: `src/main/java/kistaapi/domain/model/user/NotificationType.java` (enum 상수 추가)
- Modify: `src/main/java/kistaapi/domain/port/out/UserNotificationPort.java` (메서드 추가)
- Modify: `src/main/java/kistaapi/adapter/out/notify/FcmAdapter.java` (구현 추가)
- Modify: `src/main/java/kistaapi/adapter/out/notify/CompositeUserNotificationAdapter.java`, `TelegramUserNotificationAdapter.java` (구현 추가)
- Test: 기존 `FcmAdapterTest`류에 케이스 추가 (실제 테스트 파일 경로는 `FcmAdapter.java` 옆 확인)

- [ ] **Step 1: enum에 상수 추가**

```java
public enum NotificationType {
    TRADING_ALERT, MARKET_ALERT, FINANCE_REMINDER
}
```

- [ ] **Step 2: 포트에 메서드 추가**

```java
// UserNotificationPort.java
void notifyFinanceRegistrationReminder(UUID userId, String month); // month: "8월"처럼 사람이 읽는 표기
```

- [ ] **Step 3: FcmAdapter 구현 — 실패 테스트 먼저**

기존 `notifyMarketOpen` 테스트 옆에 동일 패턴으로 추가 (private `send(userId, title, body)` 재사용을 검증):

```java
@Test
void 가계부_미등록_알림을_전송한다() {
    // given: FcmDeviceTokenPort가 토큰 1개 반환하도록 stub (기존 notifyMarketOpen 테스트의 given 절 그대로 재사용)
    // when
    fcmAdapter.notifyFinanceRegistrationReminder(userId, "8월");
    // then: firebaseMessaging.sendEachForMulticast 가 title에 "8월"을 포함한 메시지로 호출됨을 검증
}
```

- [ ] **Step 4: 테스트 실행 → 실패 확인**

Run: `bash gradlew test --tests "*FcmAdapterTest*"`
Expected: FAIL

- [ ] **Step 5: 구현**

```java
// FcmAdapter.java 에 추가 — 기존 notifyMarketOpen(lines 89-91 부근)과 동일한 형태
@Override
public void notifyFinanceRegistrationReminder(UUID userId, String month) {
    send(userId, "가계부 등록을 아직 안 하셨어요",
        month + " 가계부(자산·수입·소비·저축) 등록이 아직 없어요. 지금 등록해보세요.");
}
```

`CompositeUserNotificationAdapter`/`TelegramUserNotificationAdapter`에도 인터페이스 구현 누락이 없도록 동일 메서드를 추가한다(Telegram 쪽은 기존 다른 알림 타입이 텔레그램에서 어떻게 처리되는지 — 무시/동일 발송 — 확인 후 동일하게 처리).

- [ ] **Step 6: 테스트 실행 → 통과 확인**

Run: `bash gradlew test --tests "*FcmAdapterTest*"`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/main/java/kistaapi/domain/model/user/NotificationType.java src/main/java/kistaapi/domain/port/out/UserNotificationPort.java src/main/java/kistaapi/adapter/out/notify/
git commit -m "feat(notify): 가계부 등록 알림(FINANCE_REMINDER) 타입 및 FCM 발송 추가"
```

---

### Task C2: kista-api — 월말 등록 여부 확인 스케줄러

**저장소:** `C:\Users\USER\workspace\kista\kista-api`

**Files:**
- Create: `src/main/java/kistaapi/application/service/finance/FinanceRegistrationReminderNotifier.java`
- Create: `src/main/java/kistaapi/adapter/in/schedule/FinanceRegistrationReminderScheduler.java`
- Test: `src/test/java/kistaapi/application/service/finance/FinanceRegistrationReminderNotifierTest.java`
- Reference: `application/service/trading/MarketEventNotifier.java` (대상 유저 필터링 + Semaphore 팬아웃 패턴), `adapter/in/schedule/TradingOpenScheduler.java` (`SchedulerLockService` 사용법)

- [ ] **Step 1: 먼저 Spring 버전의 cron `L`(월 마지막 날) 지원 여부 확인**

Run: `grep -n "spring-boot" build.gradle` 또는 `cat gradle/libs.versions.toml` 로 Spring Boot 버전 확인. Spring 6.x(Boot 3.x)는 `CronExpression`에 `L` 지원 — 확인 후 `cron = "0 0 21 L * *"`(매월 마지막 날 21시 KST) 사용. 미지원으로 확인되면 대안으로 매일 21시 실행 + `LocalDate.now().equals(YearMonth.now().atEndOfMonth())` 가드로 대체.

- [ ] **Step 2: 실패 테스트 작성**

```java
package kistaapi.application.service.finance;

import kistaapi.domain.model.user.NotificationType;
import kistaapi.domain.port.out.*;
import org.junit.jupiter.api.Test;

import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class FinanceRegistrationReminderNotifierTest {

    @Test
    void 이번달_등록이_없는_유저에게만_알림을_보낸다() {
        UserPort userPort = mock(UserPort.class);
        FinanceGroupPort financeGroupPort = mock(FinanceGroupPort.class);
        UserSettingsPort userSettingsPort = mock(UserSettingsPort.class);
        UserNotificationPort notificationPort = mock(UserNotificationPort.class);
        AssetSnapshotQueryPort assetSnapshotQueryPort = mock(AssetSnapshotQueryPort.class);
        FinanceTransactionQueryPort financeTransactionQueryPort = mock(FinanceTransactionQueryPort.class);

        UUID userWithData = UUID.randomUUID();
        UUID userWithoutData = UUID.randomUUID();
        when(userPort.findAllByStatus(any())).thenReturn(List.of(userWithData, userWithoutData));
        when(financeGroupPort.findCurrentGroupId(userWithData)).thenReturn(java.util.Optional.empty());
        when(financeGroupPort.findCurrentGroupId(userWithoutData)).thenReturn(java.util.Optional.empty());
        when(assetSnapshotQueryPort.existsForUserInRange(eq(userWithData), any(), any(), any())).thenReturn(true);
        when(assetSnapshotQueryPort.existsForUserInRange(eq(userWithoutData), any(), any(), any())).thenReturn(false);
        when(financeTransactionQueryPort.existsForUserInRange(eq(userWithoutData), any(), any(), any())).thenReturn(false);
        // userSettingsPort: 두 유저 모두 알림 활성 상태 stub

        var notifier = new FinanceRegistrationReminderNotifier(
            userPort, financeGroupPort, userSettingsPort, notificationPort,
            assetSnapshotQueryPort, financeTransactionQueryPort);

        notifier.notifyUsersWithoutThisMonthRegistration(YearMonth.of(2026, 8));

        verify(notificationPort, never()).notifyFinanceRegistrationReminder(eq(userWithData), any());
        verify(notificationPort, times(1)).notifyFinanceRegistrationReminder(eq(userWithoutData), any());
    }
}
```

주의: `AssetSnapshotQueryPort.existsForUserInRange`/`FinanceTransactionQueryPort.existsForUserInRange` 같은 조회 메서드가 기존 포트에 없으면 이 태스크에서 새로 추가한다(Step 4에서). `UserPort.findAllByStatus`의 실제 시그니처는 `MarketEventNotifier.java` 실제 코드를 Read로 확인 후 맞춘다.

- [ ] **Step 3: 테스트 실행 → 실패 확인**

Run: `bash gradlew test --tests "*FinanceRegistrationReminderNotifierTest*"`
Expected: FAIL

- [ ] **Step 4: 필요한 포트 메서드 추가**

기존 `AssetSnapshotPersistenceAdapter`/`FinanceTransactionPersistenceAdapter`(정확한 클래스명은 Task Group A 리서치에서 확인된 `adapter/out/persistence/finance/*`)에 `existsByUserAndDateRange`류 존재 여부 쿼리를 추가한다. 이미 유사 쿼리(리스트 조회 `findByFromTo`)가 있으면 `COUNT`가 아닌 `EXISTS` 전용 메서드를 새로 만들어 성능을 확보한다(스케줄러가 전체 유저를 순회하므로 매번 풀 리스트를 가져오면 안 됨).

- [ ] **Step 5: Notifier 구현**

`MarketEventNotifier`의 배치 로드 + `Semaphore(10)` 팬아웃 패턴을 그대로 따른다:

```java
package kistaapi.application.service.finance;

import kistaapi.domain.model.user.NotificationType;
import kistaapi.domain.port.out.*;
import org.springframework.stereotype.Service;

import java.time.YearMonth;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Semaphore;

@Service
public class FinanceRegistrationReminderNotifier {

    private final UserPort userPort;
    private final FinanceGroupPort financeGroupPort;
    private final UserSettingsPort userSettingsPort;
    private final UserNotificationPort notificationPort;
    private final AssetSnapshotQueryPort assetSnapshotQueryPort;
    private final FinanceTransactionQueryPort financeTransactionQueryPort;

    // 생성자 주입 — 필드 순서대로

    public void notifyUsersWithoutThisMonthRegistration(YearMonth month) {
        var from = month.atDay(1);
        var to = month.atEndOfMonth();

        List<UUID> activeUsers = userPort.findAllByStatus(kistaapi.domain.model.user.UserStatus.ACTIVE);
        var settings = userSettingsPort.findOrDefaultByUserIds(activeUsers);
        Semaphore limiter = new Semaphore(10);

        for (UUID userId : activeUsers) {
            if (!settings.get(userId).isNotificationEnabled(NotificationType.FINANCE_REMINDER)) continue;

            UUID groupId = financeGroupPort.findCurrentGroupId(userId).orElse(null);
            boolean hasData = assetSnapshotQueryPort.existsForUserInRange(userId, groupId, from, to)
                || financeTransactionQueryPort.existsForUserInRange(userId, groupId, from, to);
            if (hasData) continue;

            try {
                limiter.acquire();
                Thread.startVirtualThread(() -> {
                    try {
                        notificationPort.notifyFinanceRegistrationReminder(userId, month.getMonthValue() + "월");
                    } finally {
                        limiter.release();
                    }
                });
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
    }
}
```

`groupId`가 있으면(공유 그룹) "그룹 내 아무도 등록 안 함" 기준으로 체크할지, "이 유저 개인 등록 여부"로 체크할지는 제품 판단이 필요하다 — **Task 실행 전 사용자에게 확인**(그룹 공유 자산부에서 다른 구성원이 이미 등록했다면 알림이 불필요할 수 있음). 기본값은 "그룹 스코프(그룹 내 아무 데이터나 있으면 스킵)"로 구현하고 리뷰 시 이견이 있으면 조정한다.

- [ ] **Step 6: 테스트 실행 → 통과 확인**

Run: `bash gradlew test --tests "*FinanceRegistrationReminderNotifierTest*"`
Expected: PASS

- [ ] **Step 7: 스케줄러 작성**

```java
package kistaapi.adapter.in.schedule;

import kistaapi.application.service.finance.FinanceRegistrationReminderNotifier;
import kistaapi.domain.util.TimeZones;
import kistaapi.infrastructure.schedule.SchedulerLockService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.YearMonth;

@Component
@ConditionalOnProperty(prefix = "scheduler", name = "enabled", matchIfMissing = true)
class FinanceRegistrationReminderScheduler {

    private final FinanceRegistrationReminderNotifier notifier;
    private final SchedulerLockService lockService;

    FinanceRegistrationReminderScheduler(FinanceRegistrationReminderNotifier notifier, SchedulerLockService lockService) {
        this.notifier = notifier;
        this.lockService = lockService;
    }

    @Scheduled(cron = "0 0 21 L * *", zone = TimeZones.KST_ID)
    void run() {
        lockService.tryRun("finance-registration-reminder", java.time.Duration.ofMinutes(30),
            () -> notifier.notifyUsersWithoutThisMonthRegistration(YearMonth.now()));
    }
}
```

`SchedulerLockService.tryRun`의 정확한 시그니처는 `TradingOpenScheduler.java` 실제 코드를 Read로 확인 후 맞춘다. `cron = "0 0 21 L * *"`이 Step 1에서 미지원으로 확인됐다면 매일 21시 cron + 월말 가드로 교체.

- [ ] **Step 8: 컴파일 확인**

Run: `bash gradlew compileJava`
Expected: BUILD SUCCESSFUL

- [ ] **Step 9: Commit**

```bash
git add src/main/java/kistaapi/application/service/finance/FinanceRegistrationReminderNotifier.java src/main/java/kistaapi/adapter/in/schedule/FinanceRegistrationReminderScheduler.java src/test/java/kistaapi/application/service/finance/FinanceRegistrationReminderNotifierTest.java
git commit -m "feat(finance): 월말 가계부 미등록 알림 스케줄러 추가"
```

---

### Task C3: kista-ui — 설정 페이지 알림 토글

**저장소:** `C:\Users\USER\workspace\kista\kista-ui`

**Files:**
- Modify: `widgets/settings/SettingsPageContent.tsx:50-53` (장 시작/마감 알림 토글 바로 아래에 추가)
- Test: `widgets/settings/SettingsPageContent.test.tsx` (기존 파일에 케이스 추가 — 파일 없으면 확인 후 생성)

- [ ] **Step 1: 실패 테스트 작성**

```tsx
it('가계부 등록 알림 토글이 장 시작/마감 알림 아래에 노출된다', () => {
  render(<SettingsPageContent />, { wrapper: createQueryWrapper() })
  expect(screen.getByText('가계부 등록 알림')).toBeInTheDocument()
})
```

(기존 테스트 파일의 `createQueryWrapper`/mock 패턴을 그대로 따른다 — 파일 존재 여부와 기존 헬퍼명은 Read로 확인.)

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm run test:run -- widgets/settings/SettingsPageContent.test.tsx`
Expected: FAIL

- [ ] **Step 3: 구현**

```tsx
// SettingsPageContent.tsx:53 (장 시작/마감 알림 블록) 바로 아래에 추가
<div className="flex items-center gap-[14px] py-3 border-t border-border">
  <div className="flex-1"><div className="text-sm font-bold">가계부 등록 알림</div><div className="text-sm text-muted-foreground mt-0.5">이번 달 가계부 등록이 없으면 월말에 알려드려요</div></div>
  <TradingAlertToggle type="FINANCE_REMINDER" initialEnabled={user?.notificationPrefs?.['FINANCE_REMINDER'] ?? true} channel={notificationChannel} />
</div>
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm run test:run -- widgets/settings/SettingsPageContent.test.tsx`
Expected: PASS

- [ ] **Step 5: 타입체크**

Run: `npm run typecheck`
Expected: 에러 없음

- [ ] **Step 6: Commit**

```bash
git add widgets/settings/SettingsPageContent.tsx widgets/settings/SettingsPageContent.test.tsx
git commit -m "feat(settings): 가계부 등록 알림 토글 추가"
```

---

## 실행 전 확인 필요 사항 (Task 착수 전 사용자 컨펌)

1. **Task C2**: 공유 그룹 계정에서 "그룹 내 아무나 등록했으면 알림 스킵" vs "각 구성원 개별 등록 여부로 판단" — 기본값은 그룹 스코프로 구현 명시함, 다르게 원하면 알려달라.
2. **Task C2 cron**: Spring 6 cron의 `L`(마지막 날) 실제 지원 여부는 Step 1에서 직접 확인 후 결정 — 지원 안 하면 매일 21시+가드 방식으로 자동 전환.
3. **Task B4 amount override**: 목업에서 금액을 수정하면 그 값 그대로 저장하는지, 아니면 "수정했다"는 사실만 남기고 별도 승인 절차가 필요한지 — 계획은 전자(즉시 반영)로 가정.

---

## Self-Review 체크리스트

- [x] "이번달 안 되면 알림 → 설정 토글" → Task C1~C3
- [x] "설정탭 맨 위 모두 등록 버튼 → 목업 화면 이동" → Task B5
- [x] "연/월 셀렉트 2쌍, 기본값 지난달→이번달" → Task B3, B4
- [x] "제외 토글 끈 항목은 다음 달에도 자동 복귀 안 함" → Task B4는 매번 소스월 실제 등록분만 조회(`useFinanceTransactionsQuery`/필터된 `assetSnapshots`)하므로 별도 구현 불필요 — 데이터 자체가 "실제 등록된 것"만 소스가 되어 자동으로 이 요구사항을 만족한다
- [x] 자산 배치 등록 시 카테고리·자산군·메모·금액 필드 유지, 수입/소비/저축은 카테고리·메모·금액 → Task A1 DTO, Task B2 그룹핑
- [x] "확인 필요" 배지 제거, 운용전략 컬럼 추가, PC 2열(자산 단독/수입·소비·저축 스택) → Task B4 상단 "확정된 디자인 사양" 절 참고 (Artifact URL 포함, 다른 세션에서 이 계획서만 읽어도 재현 가능하도록 명시함)
