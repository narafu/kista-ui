# features/finance/save-transaction

@../../../docs/agents/finance-group-share.md

- **`finance/save-transaction`**: 수입/소비/저축 탭의 거래내역 CRUD. `TransactionFormDialog`(create/edit 겸용, `AssetForm`과 동일하게 네이티브 `useState`+계단식 카테고리 Select)는 **라우트가 아니라 다이얼로그**다 — 거래내역 단건 GET이 없어 라우트 진입 시 id만으로 조회가 불가능하고, 목록 캐시에 이미 데이터가 있는 다이얼로그가 더 단순하기 때문. `NewTransactionButton`은 `NewAssetButton`(라우트 이동)과 달리 자체 `open` state로 다이얼로그를 열고 닫는 완전히 자기 완결적인 컴포넌트다 — **다이얼로그는 `open && <TransactionFormDialog .../>`처럼 조건부로만 마운트한다**(상시 마운트하면 내부 `useState`가 다음 열림에도 초기화되지 않고 이전 입력값이 남는다, `CategoryManager`의 `formTarget` 패턴과 동일 이유). `TransactionFormDialog`의 `windowFrom`/`windowTo` prop은 호출부에 따라 의미가 다르다 — 등록은 "오늘 기준" 독립 창(하한 없음, 상한은 이번 달 말일 — 과거 연도 등록도 허용), 수정은 "지금 조회 중인" 12개월 창(자세한 이유는 `TransactionFormDialog` 주석 참고). 삭제 확인은 `finance/delete-transaction`이 아니라 `shared/ui/ConfirmDeleteDialog`(제목·설명 문구만 받는 범용 삭제 확인 다이얼로그)를 직접 쓴다
