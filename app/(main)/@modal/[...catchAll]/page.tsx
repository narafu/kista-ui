// 소프트 네비게이션에서는 매칭되지 않은 parallel slot이 직전 상태를 유지한다(default.tsx는 하드 네비게이션에만 쓰인다).
// 모달 안 링크(PageHeader eyebrow 등)로 인터셉트되지 않는 경로로 이동했을 때 모달이 남지 않도록 비운다.
export default function CatchAll() {
  return null
}
