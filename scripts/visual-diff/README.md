# visual-diff

리팩토링 전후 화면 회귀 확인 도구. 두 커밋을 각각 별도 git worktree에서 `next dev`로 띄우고, 같은 데이터와 같은 조작으로 PC(1440)와 모바일(390) fullPage 스크린샷을 찍어 픽셀 단위로 비교한다.

```bash
npm run visual-diff -- <base-ref>                    # base-ref vs HEAD, 전체 시나리오
npm run visual-diff -- 4c074cf5 --head 991acc1f      # 임의의 두 커밋 비교
npm run visual-diff -- HEAD~3 --only '^(m-inf|finance)'   # 시나리오 이름 정규식 필터
npm run visual-diff -- HEAD --dirty                  # 커밋 전 변경(HEAD + 작업 트리) vs HEAD
npm run visual-diff -- HEAD --dirty --path widgets --path 'app/(main)'   # 변경 범위를 pathspec으로 제한
npm run visual-diff -- --list                        # 시나리오 목록
```

- 결과는 `--out <dir>`(기본 `$TMPDIR/kista-visual-diff/<timestamp>`)에 남는다: `shots/{head,base}/*.png`, `report.json`, dev 서버 로그(`head.log`, `base.log`), `proxy.log`.
- 차이가 있으면(픽셀 차이, 크기 불일치, 최종 URL·상태코드 불일치, head에만 있는 콘솔 에러) exit 1.
- head와 base는 시나리오·뷰포트마다 병렬로 찍는다(같은 trading 모드). 시나리오 사이는 순차다 — fixture 모드가 전역 상태라서.

## 결과 한 장으로 보기 (`sheet.mjs`)

```bash
node scripts/visual-diff/sheet.mjs <out-dir>                                   # 차이 난 쌍만
node scripts/visual-diff/sheet.mjs <out-dir> --only '^m-inf-.*-pc$' --crop 300,560,1140,420   # 모드별 같은 영역 모아 보기
```

- 행마다 왼쪽이 head, 오른쪽이 base다. `<out-dir>/sheet.png`로 저장한다.
- `--only`는 `<시나리오>-<pc|mo>` 파일명 정규식이다. `--crop left,top,width,height`는 원본 픽셀 기준이고, `--width`(기본 600)는 한쪽 폭이다.
- 판정은 `run.mjs`의 픽셀 비교가 한다. 이 도구는 눈으로 훑어보는 용도다.

## 커밋 전 변경 비교 (`--dirty`)

- 실행 시작 시점에 메인 작업 트리의 커밋 안 된 변경을 `dirty.patch`로 한 번 떠서 head worktree에 `git apply`한다. 이후 메인 트리가 바뀌어도 이번 실행에는 반영되지 않는다.
- untracked 파일도 포함한다(`.gitignore` 대상 제외) — 새로 만든 컴포넌트가 빠지면 head가 컴파일되지 않기 때문이다. 다른 세션의 미커밋 변경이 섞이지 않게 `--path <pathspec>`(여러 번 가능)으로 범위를 좁힌다. 기본은 레포 전체다.
- 임시 index로 patch를 뜨므로 메인 index(다른 세션이 staged한 것 포함)는 건드리지 않는다.
- `--head`가 현재 HEAD가 아니면 거부한다. 범위 안에 변경이 없으면 중단한다. `report.json`의 `dirtyPatch`에 patch 경로가 남는다.
- `package.json` 의존성 변경은 반영되지 않는다(node_modules는 메인 트리 것을 복사).

## 전제와 안전장치

- 로컬 kista-api(:8080)와 kista-trading(:8081)이 local 프로파일로 떠 있어야 한다. 이 도구는 백엔드를 **기동하지 않는다**. 응답이 없으면 그대로 중단한다.
- 로컬 DB에는 실데이터가 있다. 프록시(:8180→8080, :8181→8081)는 GET/HEAD만 넘기고 쓰기 요청은 전부 403으로 막는다. 쓰기성 호출은 dev 토큰 발급(`POST /api/auth/dev-token`, `dev-admin-token`, 8080 직접 호출) 하나뿐이다.
- 포트 3100/3200/8180/8181 중 하나라도 이미 쓰이고 있으면 다른 세션이 이 도구를 돌리는 중으로 보고 중단한다. 남의 프로세스는 종료하지 않는다.
- 종료할 때는 이 도구가 띄운 `next dev` 프로세스 그룹만 끈다. 그 뒤 worktree 2개를 제거한다(Ctrl-C로 끊어도 같다).
- 메인 작업 트리에서 다른 세션의 `next dev`가 돌고 있어도 충돌하지 않는다(`.next` 잠금). head도 별도 worktree로 띄우기 때문이다.

## 데이터 (fixture)

기본은 dev 시드 실데이터다(kista-api `scripts/dev-seed/seed.sh`, 멱등). MOCK 계좌의 ACTIVE 전략은 preview·prices 등이 실제로 200을 준다. KIS 시드 전략은 PAUSED이고 preview가 503이다. fixture는 실데이터로 만들 수 없는 것만 채운다.

- `../shared/seed.mjs`(a11y-check와 공용): 시나리오가 여는 계좌·전략 ID. 실행 시 로컬 API에서 MOCK·KIS 시드 계좌(`[시드] 모의계좌`·`[시드] KIS 계좌`)와 전략을 조회해 정하고(실패 시 기본값), `KISTA_DEV_SEED=<json>`을 주면 그 파일로 최상위 키 단위 덮어쓰기(동작 상세는 `../a11y-check/README.md` "전제와 안전장치").
- `fixtures/trading.mjs`: preview·previews의 인위적 분기를 모드별로 응답한다(`deficit`/`uncertain`/`executed`/`skip`/`empty`). 시나리오의 `mode`로 고르고, 기본값 `real`은 실데이터를 그대로 통과시킨다.
  - `crypto`: 로컬 DB에 없는 UPBIT 코인 계좌(id `00000000-0000-4000-8000-0000000c0170`)와 코인 DCA 전략을 합성하고, MOCK 계좌에 주식 DCA 전략 1건을 덧붙인다. 코인 계좌에 주식 전용 조회(portfolio·margin·prices·daily-trades)가 오면 400을 돌려주고 `CRYPTO_GATE_VIOLATION <path>`를 프록시 `log`(`proxy.log`)에 남긴다. 시나리오가 아니라 프록시를 직접 띄워 쓴다(`startProxy({ route })` + `setMode('crypto')`). 브라우저 쪽은 `/api/runtime-config` 응답의 `brokers.UPBIT.enabled`·`strategies.DCA.enabled`를 `page.route`로 true로 바꿔야 한다.
- `fixtures/api.mjs`: kista-api(8080) 응답 중 로컬 DB에 없는 것만 덮는다. 지금은 P 매매표(`/api/admin/privacy-trade-bases`, 로컬 DB 0건) 3건뿐이고, 나머지는 실데이터를 그대로 통과시킨다. 서버 컴포넌트 prefetch(`apiFetch`)는 브라우저를 거치지 않아 `page.route`로 못 바꾸므로 이쪽에 둔다.
- 브라우저에서만 부르는 응답은 시나리오의 `setup`에서 `page.route`로 덮는다. 전역 fixture와 달리 그 시나리오에만 적용된다(예: KIS 시드 계좌 예수금 조회는 503이라 `create-strategy-balance*`가 USD 예수금을 채운다).
- PRIVACY 전략은 로컬 DB에 없어 PRIVACY 전략 상세 시나리오가 없다(예전 `detail-privacy`는 없는 ID를 열고 있어 삭제했다).
- kista-api 실데이터 중 `etf-series`는 09:00 KST cron에서만 수집되므로, 수집 전이면 ETF 벤치마크 탭이 "데이터 부족" 상태로만 비교된다.
- 프록시는 실행 동안 upstream의 성공 응답(SSE 제외)을 메모이즈한다(URL·인증 헤더 기준). 진행 중인 요청도 공유하므로, head와 base가 병렬로 같은 데이터를 요청해도 실시간 가격이나 preview가 달라져 가짜 diff가 생기지 않는다.

## 시나리오 추가

`scenarios.mjs`에 `{ name, path, admin?, steps?, mode?, clock?, guest?, cookies?, setup? }`를 추가한다.

- `steps`에는 열기·탭 전환·선택만 넣는다. 제출/저장 버튼은 누르지 않는다.
- `clock: true`는 브라우저 시계를 평일로 고정한다. 주말에 돌리면 휴장일 배너가 부족 배너를 가린다.
- `guest: true`는 `kista-token` 없이 비회원으로 연다(`dashboard-guest`).
- `cookies`는 추가 쿠키다. warm-up도 같은 쿠키로 연다. `proxy.ts`는 `kista-user-status`·`kista-user-role` 쿠키가 둘 다 있으면 `/me` 대신 그 값을 쓰므로, dev 사용자(ACTIVE)로 대기·반려 화면을 연다(`pending`·`rejected`).
- `setup(page)`는 `goto` 전에 실행한다. 브라우저 요청을 `page.route`로 덮을 때 쓴다. 예: `pending`은 상태 SSE가 ACTIVE를 보내면 `/dashboard`로 이동하므로 `/api/auth/status-stream`을 204로 닫는다.
- 사용 비율 게이지(`PercentGauge`)는 KIS 계좌로 연다(`create-strategy-balance*`·`create-strategy-gauge-*`). MOCK 계좌는 사용자 설정과 무관하게 잔고 확인이 꺼져 예수금 입력칸만 나온다.
- step이 실패해도 양쪽이 같은 상태로 찍혀 diff 0이 나온다. 실패는 `report.json`의 `errs`에 `NAV ...`로 남으니 새 시나리오는 이것도 확인한다.
- PC 표와 모바일 카드를 함께 렌더하고 한쪽을 CSS로 숨기는 화면은 `:visible` locator로 누른다. `.first()`만 쓰면 숨은 쪽이 잡힌다.
- diff 0은 안정성만 보여준다. 양쪽이 똑같이 리다이렉트되거나 엉뚱한 상태여도 0이다. 새 시나리오는 `report.json`의 최종 URL·상태코드와 PNG를 직접 확인한다.

## 결과 해석

- `clock` 시나리오에서는 시계 고정 때문에 hydration 에러가 head와 base 양쪽에 난다. 양쪽에 다 있으면 회귀가 아니다.
- fullPage 캡처에서 사이드바가 밀리거나 모바일 하단 내비가 겹치는 것은 고정 요소 때문에 생기는 캡처 현상이다(양쪽 동일).
- `ERR_CONNECTION_REFUSED`, `SIZE` 불일치, `proxy.log`의 `fetch failed`가 보이면 먼저 실행 도중 백엔드나 dev 서버가 재기동됐는지 확인한다. 동시 세션이 재기동하는 경우가 있다. 그런 경우면 `--only`로 해당 시나리오만 다시 찍는다.
