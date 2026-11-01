# features/finance/manage-accounts

- **`finance/manage-accounts`**: `/finance` 설정 탭의 재무 계좌(은행/증권사/보험/거래소) CRUD — `entities/account`(한국투자증권 브로커 계좌)와는 다른 도메인이라 디렉토리·import를 절대 섞지 않는다. `AccountManager`가 목록에서 `accountNo`를 `maskAccountNo`(뒷 4자리만 노출)로 마스킹해 렌더하고, 수정 다이얼로그에서만 전체 값을 편집한다. 목록 상단 계좌타입 필터·정렬(이름/유형/등록순) Select는 계좌 수가 적어 서버 API 없이 클라이언트 `useMemo`로 처리한다. 계좌도 공유/귀속 대상이다(`useShareFinanceAccountMutation`/`useUnshareFinanceAccountMutation`) — 단 flat 목록이라도 unshare는 소유자 아닌 그룹 멤버도 실행 가능해(caller의 group-scope 목록에서 항목이 사라져야 함) create/update와 달리 `upsertById`가 아니라 다른 finance 리소스와 동일하게 `accountsRoot()` invalidate 방식을 쓴다. 계좌번호는 서버가 신규/수정 요청에 숫자만 허용(`@Pattern`, 기존 DB 데이터는 마이그레이션하지 않음) — `AccountFormDialog`가 입력 시 `digitsOnly`로 즉시 strip하고, 수정 모드 초기값도 `digitsOnly`로 정규화해 비숫자 legacy 값을 건드리지 않고 다른 필드만 고쳐도 400을 맞지 않게 한다

@../../../docs/agents/finance-group-share.md
