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

- `../shared/seed.mjs`(a11y-check와 공용): 시나리오가 여는 계좌·전략 ID. 로컬 시드가 다르면 `KISTA_DEV_SEED=<json>`으로 최상위 키 단위 덮어쓰기.
- `fixtures/trading.mjs`: preview·previews의 인위적 분기를 모드별로 응답한다(`deficit`/`uncertain`/`executed`/`skip`/`empty`). 시나리오의 `mode`로 고르고, 기본값 `real`은 실데이터를 그대로 통과시킨다.
- kista-api(8080)는 fixture 없이 실데이터를 그대로 통과시킨다. `etf-series`는 09:00 KST cron에서만 수집되므로, 수집 전이면 ETF 벤치마크 탭이 "데이터 부족" 상태로만 비교된다.
- 프록시는 실행 동안 upstream의 성공 응답(SSE 제외)을 메모이즈한다(URL·인증 헤더 기준). 진행 중인 요청도 공유하므로, head와 base가 병렬로 같은 데이터를 요청해도 실시간 가격이나 preview가 달라져 가짜 diff가 생기지 않는다.

## 시나리오 추가

`scenarios.mjs`에 `{ name, path, admin?, steps?, mode?, clock? }`를 추가한다.

- `steps`에는 열기·탭 전환·선택만 넣는다. 제출/저장 버튼은 누르지 않는다.
- `clock: true`는 브라우저 시계를 평일로 고정한다. 주말에 돌리면 휴장일 배너가 부족 배너를 가린다.

## 결과 해석

- `clock` 시나리오에서는 시계 고정 때문에 hydration 에러가 head와 base 양쪽에 난다. 양쪽에 다 있으면 회귀가 아니다.
- fullPage 캡처에서 사이드바가 밀리거나 모바일 하단 내비가 겹치는 것은 고정 요소 때문에 생기는 캡처 현상이다(양쪽 동일).
- `ERR_CONNECTION_REFUSED`, `SIZE` 불일치, `proxy.log`의 `fetch failed`가 보이면 먼저 실행 도중 백엔드나 dev 서버가 재기동됐는지 확인한다. 동시 세션이 재기동하는 경우가 있다. 그런 경우면 `--only`로 해당 시나리오만 다시 찍는다.
