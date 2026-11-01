# Admin Error Logs Page

**Date:** 2026-06-18
**Status:** Approved

## Summary

어드민 사이드바에 "오류 로그" 메뉴를 추가하고, `GET /api/admin/error-logs` 데이터를 조회하는 페이지를 구현한다.
현재 에러 로그는 DB에 저장되지만 UI에서 볼 수 있는 화면이 없어 운영 중 `fly logs` 또는 DB 직접 쿼리로만 확인 가능하다.

## Architecture

기존 `/admin/audit` 페이지 패턴을 그대로 따른다.

```
entities/user/
  model/types.ts       ← AppErrorLog 타입 추가
  api/                 ← listAdminErrorLogs() 추가
  index.ts             ← export 추가

app/(admin)/admin/error-logs/
  page.tsx             ← Server Component (데이터 fetch + 렌더링)
  loading.tsx          ← 스켈레톤

features/admin/error-logs/
  ErrorLogItem.tsx     ← 'use client' — stackTrace 접기/펼치기 상호작용

widgets/layout/
  AdminSidebar.tsx     ← "오류 로그" 메뉴 항목 추가
```

## Data Model

API 응답 (`GET /api/admin/error-logs?limit=100`, max 500):

```ts
type AppErrorLog = {
  id: string
  errorType: string          // 예외 클래스 단순명 (e.g. "KisApiException")
  message: string            // e.getMessage()
  stackTrace: string         // 전체 스택트레이스
  context: Record<string, string>  // 발생 위치 메타 (class name 등)
  createdAt: string          // ISO 8601
}
```

## Page Design

### 헤더
- 제목: "오류 로그"
- 부제: "최근 N건" (fetch 결과 길이 기준)

### 목록 (각 행 — ErrorLogItem)
- 상단: `errorType` 뱃지(rose 계열) + `createdAt` 우측 고정
- `message` 텍스트
- `context` 맵 — audit 로그 payload와 동일하게 `<pre>` JSON 표시 (비어있으면 생략)
- stackTrace — `<details>/<summary>` HTML 네이티브 또는 useState toggle로 접기/펼치기
  - 닫힌 상태: "스택트레이스 보기" 링크
  - 열린 상태: `<pre>` monospace 전체 표시

### 빈 상태
- "기록된 오류가 없습니다" 메시지

## Navigation

`AdminSidebar.tsx` NAV_ITEMS에 추가:
```
{ href: '/admin/error-logs', label: '오류 로그', icon: Bug }
```
위치: "감사 로그" 아래

## Scope

- 필터/검색 없음 (YAGNI — 건수가 많아지면 추후 추가)
- 삭제 기능 없음
- limit 파라미터 UI 노출 없음 (기본 100건 고정)
