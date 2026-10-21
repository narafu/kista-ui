// 브라우저 탭 제목 접미사 SSOT — 각 화면 metadata.title에는 제목만 쓴다.
// title을 문자열로 지정한 중첩 layout은 하위 라우트로 template 상속을 끊으므로(Next.js resolve-metadata)
// 하위에 화면이 있는 layout은 { default, template: TITLE_TEMPLATE } 형태로 쓴다
export const TITLE_TEMPLATE = '%s | KISTA'
