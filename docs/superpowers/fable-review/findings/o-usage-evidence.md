# 사용 흔적 근거 (운영, 읽기 전용)

- 조회 일시: 2026-11-13 15:28 KST (UTC 06:28) ~
- 접속: `ssh kista-server` (OCI kista-api-server) -> `docker exec kista-postgres psql -U kista -d kistadb` (`SET default_transaction_read_only=on` + SELECT만). 운영 DB 맞음(로컬 아님).
- 개인정보·원값 없이 집계만 기록. 삭제 행(deleted_at)은 별도 표기, 활성 집계는 deleted_at IS NULL 기준(명시한 곳).
- 규모 주의: 운영은 사실상 **사용자 2명**(ACTIVE/ADMIN 1 + ACTIVE/USER 1)의 개인용 환경. 아래 "사용자 수 1~2"는 기능 미사용이 아니라 모수 한계다.

## 1. 규모

| 항목 | 값 | SQL |
|---|---|---|
| 사용자 status/role | ACTIVE/ADMIN 1, ACTIVE/USER 1, PENDING 0, REJECTED 0, 삭제 0 | `SELECT status\|\|'/'\|\|role, count(*) FROM users GROUP BY 1` |
| 가입일 범위 | 2026-06-15 ~ 06-18 (이후 가입 없음) | `min/max(created_at) FROM users` |
| refresh_token 발급 기준 활성 사용자 | 최근 30일 2명, 90일 2명 (토큰 행 6개, 최근 2026-11-13) | `count(DISTINCT user_id) filter(created_at>now()-interval '30 days') FROM refresh_tokens` |
| 알림 채널 설정 | FCM 1명, ALL 1명 / 텔레그램 chat+bot 설정 1명 | `SELECT notification_channel,count(*) FROM users GROUP BY 1` |

## 2. 기능별 데이터 존재

| 기능 | 건수 | 사용자 수 | 최근 | SQL 요지 |
|---|---|---|---|---|
| 계좌 BINANCE / KIS / MERITZ / MOCK / TOSS / UPBIT | 1 / 1 / 3 / 1 / 1 / 1 | 각 1명(동일 사용자 추정 불가, 브로커별 distinct 1) | 2026-10-24(MERITZ·BINANCE), 10-18 UPBIT, 08-09 MOCK, 06-15 KIS·TOSS | `trading.accounts GROUP BY broker` |
| 전략 DCA / INFINITE / PRIVACY / VR (모두 ACTIVE) | 각 2 | 각 1명 | 2026-11-04 (VR 11-02) | `trading.strategy GROUP BY type,status` |
| DCA 규칙 / 조건 | 31 / 19 (버전 14개) | - | 2026-11-06 | `strategy_dca_rule`, `strategy_dca_condition` |
| DCA 실행 이력 | ORDERED 70, SKIPPED 20 | - | 2026-11-13 | `trading.dca_execution` |
| 사이클 | 98 (종료 31, soft-delete 87) | - | 2026-11-06 | `trading.strategy_cycle` |
| VR 사이클 | 42 | - | 2026-11-02 | `strategy_cycle_vr` |
| PRIVACY 기준값 | 378 | - | 감사로그 기준 2026-10-30 갱신 | `trading_ref.privacy_trade_bases` |
| 주문 | 3,543 (체결 639, 최근 30일 1,140) | - | 2026-11-13 | `trading.orders` |
| 투자금 추가(INJECT) | 6 | - | 2026-11-13 | `cycle_capital_event GROUP BY kind` |
| 투자금 인출 | 0 (kind에 INJECT만 존재) | - | - | 같은 쿼리 |
| 백테스트 실행 기록 | 테이블 없음(저장 안 함) | - | - | `\dt` 목록에 없음 |
| 배치 | trading-open / trading-close 모두 | - | 2026-11-13 | `trading_batch_run` |
| 가계부 거래내역 | 804 (삭제 88) | 2 | 2026-11-11 | `finance.finance_transactions` |
| 가계부 자산 기록 | 1,056 (삭제 202) | 1 | 2026-11-10 | `finance_asset_snapshots` |
| 재무계좌 | 32 (삭제 4) | 1 | 2026-10-08 | `finance_accounts` |
| 카테고리 | 75 (삭제 11) | 1 | 2026-09-07 | `finance_categories` |
| 예산 | 37 | 1 | 2026-09-02 | `finance_budgets` |
| 월 마감 | 21 | 1 | 2026-11-01 | `finance_monthly_closings` |
| 그룹 / 멤버 | 3 (삭제 2) / 4 (삭제 2) | 2 | 2026-08-22 | `finance_groups`, `finance_group_members` |
| 초대 코드 | 4 (ACCEPTED 2, DECLINED 1, PENDING 1) | 초대한 사용자 1 | 2026-08-22 | `finance_group_invitations` |
| FCM 토큰 | 2 (WEB만) | 1 | - | `fcm_device_tokens` |
| 알림 설정 | TRADING_ALERT on 1, MARKET_ALERT off 1 | - | - | `user_notification_prefs` |
| 전략 제안 설정 | 2행 (1명 빈 값, 1명 4종 전체) | - | - | `user_settings` |
| 관리자 감사로그 | 37: RUNTIME_SETTINGS_UPDATE 20, PRIVACY_BASE_UPDATE 11, ORDER_CORRECTION 2, USER_APPROVE 1, PRIVACY_BASE_CREATE 1, STRATEGY_PAUSE 1, STRATEGY_RESUME 1 | - | 2026-10-30 | `audit_logs GROUP BY action` |
| app_error_logs | 전체 568, 최근 30일 96 | - | 2026-11-13 | `app_error_logs` |

app_error_logs 최근 30일 error_type 상위(본문 미기재): MOBILE_NAV_VIEWPORT_SHIFT 51, MOBILE_NAV_VIEWPORT_MISMATCH 21, ResourceAccessException 7, RuntimeException 6, ChunkLoadError 4, InvalidDataAccessApiUsageException 2, NotFoundError 2, TypeError 2, BadRequest 1. context 키는 pathname 등(경로 집계는 3절 참조).

## 3. 화면 사용 흔적

- 조회: `docker logs --since 720h <kista-ui>` 4줄(GET/POST 경로 로그 0건), `docker logs --since 720h kista-infra-caddy-1` 82줄(access 로그 없음, health check·admin·reverse_proxy warn뿐). **경로 로그 없음 -> 요청 경로 집계 불가.**
- 대체 근거(편향 있음): app_error_logs 최근 30일 중 context.pathname이 있는 80건의 경로 분포. 에러(주로 모바일 네비 뷰포트 진단)가 발생한 화면만 잡히므로 "그 화면이 열렸다"는 하한 증거일 뿐, 미등장이 미사용을 뜻하지 않는다.

| 경로(ID는 {id} 치환) | 에러로그 건수(30일) |
|---|---|
| /dashboard | 17 |
| /accounts/{id}/strategies/{id} | 16 |
| /accounts/{id}/strategies/{id}/edit | 10 |
| /finance | 9 |
| /accounts/{id} | 7 |
| /accounts | 6 |
| /finance/income | 5 |
| /finance/expense | 4 |
| /finance/budgets/expense | 3 |
| /finance/bulk-register | 2 |
| /stats | 1 |

SQL: `SELECT regexp_replace(context::jsonb->>'pathname','[0-9a-f]{8}-[0-9a-f-]{20,}','{id}','g'), count(*) FROM app_error_logs WHERE created_at>now()-interval '30 days' AND context::jsonb ? 'pathname' GROUP BY 1 ORDER BY 2 DESC`

## 4. 사용 0으로 보이는 기능 (근거 수준 구분)

화면 경로 전체(`find app -name page.tsx`, 33개): accounts, accounts/[id], accounts/[id]/edit, accounts/[id]/strategies/[sid](+edit, reconfigure-vr, new), accounts/new, admin(+accounts, logs, pending, privacy-trades, settings, trades, users), dashboard, finance(+[id]/edit, budgets/[type], bulk-register, expense, income, new, saving, settings), login, pending, rejected, settings, stats(+backtest, benchmark), strategies.

**데이터 근거 0건**
- 투자금 인출: cycle_capital_event에 INJECT 외 kind 없음(0건).
- 백테스트 결과 저장: 테이블 자체가 없음 (실행 기록 측정 불가, 계산형 화면일 가능성).
- 사용자 승인 대기(PENDING)·거절(REJECTED) 상태 사용자 0명 (가입 이후 승인 흐름은 6월 이후 미발생; 감사로그 USER_APPROVE 1건, USER_REJECT 0건).
- 가계부 예산·카테고리는 최근 생성 9월 이후 신규 없음(정체, 0은 아님).
- MARKET_ALERT 알림: 설정 1건이 off, on 0명.
- FCM 토큰: WEB 플랫폼만(타 플랫폼 0).

**사용자 1명 이하(모수가 2명이라 신호가 약함)**: 브로커별 계좌 전부, 전략 type 전부, 가계부 자산 기록·재무계좌·카테고리·예산·월 마감·초대 코드, FCM, 텔레그램.

**화면 경로 측정 불가**: 접근 로그가 없어 30일 요청 0인 화면을 확정할 수 없다. 에러로그 경로에 한 번도 안 나온 화면(위 표 외 전부)은 "미확인"이며 미사용 증거가 아니다. 관리자 화면은 감사로그(관리자 조치 37건, 최근 2026-10-30)로 admin/settings·privacy-trades·trades 사용 흔적이 있다.

## 한계

- 운영은 2명뿐이라 "사용자 수 1" 기준 미사용 판정은 과대하다.
- 요청 접근 로그 부재가 최대 공백. 필요하면 Caddy access log 활성화 또는 UI 쪽 페이지뷰 계측 필요(여기서는 변경하지 않음).
