# Order Cancel Planned + Placed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `PLANNED` and `PLACED` orders equally cancellable in the strategy detail UI and align the backend/API contract so individual and bulk cancellation both cover `PLANNED + PLACED`.

**Architecture:** Update the `kista-ui` strategy detail widget and order API comments to stop hiding `PLACED` cancellations, then update `kista-api` controller docs and service-facing tests so the contract matches the existing service behavior. Keep endpoint paths unchanged and validate the policy with focused UI and Java unit/web tests.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, Spring Boot, JUnit 5, Mockito

## Global Constraints

- Keep `DELETE /api/trading-cycles/{id}/execute` and `DELETE /api/orders/{orderId}` endpoint paths unchanged.
- Show individual cancel buttons for both `PLANNED` and `PLACED` orders in the `다음 주문` section.
- Treat bulk cancellation as same-day `PLANNED + PLACED` cancellation.
- Preserve best-effort handling for broker cancellation failures on `PLACED` orders.
- Follow TDD: add failing tests before changing production code.

---

### Task 1: Lock UI behavior with a focused OrderRows test

**Files:**
- Create: `widgets/strategy-detail/OrderRows.test.tsx`
- Modify: `widgets/strategy-detail/OrderRows.tsx`

**Interfaces:**
- Consumes: `OrderRows` props `{ orders, onCancelOne, cancellingId, cancelPending }`
- Produces: `OrderRows` renders `취소` button for rows with an `id` regardless of `PLANNED` vs `PLACED`

- [ ] Add a failing test for `PLACED` row cancel button visibility.
- [ ] Run `npm test -- widgets/strategy-detail/OrderRows.test.tsx` and confirm failure.
- [ ] Remove the `PLACED` hide condition in `OrderRows.tsx`.
- [ ] Re-run the same test and confirm pass.

### Task 2: Align kista-ui comments and copy with the new cancellation contract

**Files:**
- Modify: `entities/order/api/index.ts`
- Modify: `entities/order/model/types.ts`
- Modify: `widgets/strategy-detail/StrategyDetail.tsx`

**Interfaces:**
- Consumes: existing order preview and cancellation hooks
- Produces: comments and intent strings that describe cancellation as `PLANNED + PLACED`

- [ ] Update type comments and API comments to reflect same-day `PLANNED + PLACED` cancellation.
- [ ] Keep runtime behavior unchanged except for the already-tested button visibility.
- [ ] Run `npm run typecheck` in `kista-ui`.

### Task 3: Lock backend cancellation policy with service and controller tests

**Files:**
- Modify: `../kista-api/src/test/java/com/kista/application/service/trading/OrderCancelServiceTest.java`
- Modify: `../kista-api/src/test/java/com/kista/adapter/in/web/OrderCancelControllerTest.java`
- Modify: `../kista-api/src/test/java/com/kista/adapter/in/web/TradingCycleControllerTest.java`

**Interfaces:**
- Consumes: `OrderCancelService.cancelByCycle`, `OrderCancelService.cancelOrder`, `TradingExecutionUseCase`
- Produces: test coverage for `PLANNED` single cancel and mixed `PLANNED + PLACED` bulk cancel

- [ ] Add a failing unit test proving `cancelByCycle()` counts deleted `PLANNED` orders.
- [ ] Add a failing unit test proving `cancelOrder()` accepts `PLANNED` without broker cancellation.
- [ ] Update the web tests so their 409 expectation no longer encodes `PLACED only`.
- [ ] Run `./gradlew test --tests com.kista.application.service.trading.OrderCancelServiceTest --tests com.kista.adapter.in.web.OrderCancelControllerTest --tests com.kista.adapter.in.web.TradingCycleControllerTest` in `../kista-api` and confirm the new failures.

### Task 4: Align backend docs/comments with the tested policy

**Files:**
- Modify: `../kista-api/src/main/java/com/kista/adapter/in/web/OrderCancelController.java`
- Modify: `../kista-api/src/main/java/com/kista/adapter/in/web/TradingCycleController.java`
- Modify: `../kista-api/src/main/java/com/kista/domain/port/in/TradingExecutionUseCase.java`
- Modify: `../kista-api/src/main/java/com/kista/adapter/in/web/dto/NextOrdersResponse.java`

**Interfaces:**
- Consumes: existing cancellation flow
- Produces: public comments/OpenAPI summaries that describe `PLANNED + PLACED`

- [ ] Update comments and `@Operation` summaries to match the actual cancellation policy.
- [ ] Keep service logic intact unless a test exposes a real mismatch.
- [ ] Re-run the targeted backend tests and confirm pass.

### Task 5: Final verification and commit

**Files:**
- Modify: all changed files above

**Interfaces:**
- Consumes: updated UI and backend policy
- Produces: one coherent change set with verification evidence

- [ ] Run `npm run typecheck` in `kista-ui`.
- [ ] Run the targeted Vitest file for `OrderRows`.
- [ ] Run the targeted Gradle tests in `../kista-api`.
- [ ] Review `git diff`.
- [ ] Commit with a Korean message covering UI and API cancellation alignment.
