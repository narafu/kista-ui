# features/finance/manage-strategy-suggestions

- **`finance/manage-strategy-suggestions`**: 자산 등록 폼 추천 목록 — 유저별 설정(`user_settings.strategy_suggestions`, `PUT /api/settings/strategy-suggestions`)이라 ADMIN 게이트 없이 모든 로그인 유저에게 노출된다. `/finance` 설정 탭(계좌관리 아래) 위치는 유지 — 자산 등록 폼 전용 값이라 일반 계정 설정(`/settings`)보다 finance 도메인에 두는 게 자연스럽다는 판단. 값은 `@entities/user`의 `useMeQuery().data.strategySuggestions`, 저장은 `useUpdateStrategySuggestionsMutation`이 `{suggestions}`만 PUT한다(엔드포인트가 이 필드 하나만 받는 부분 갱신). `SuggestionListEditor`(`shared/ui`) 조작마다 즉시 반영하는 UX는 유지
