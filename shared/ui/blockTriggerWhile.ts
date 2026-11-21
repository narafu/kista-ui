import type { MouseEvent } from 'react'

// `ConfirmDialog`의 `trigger`용 onClick — 처리 중이면 Base UI의 열기 핸들러를 막는다.
// `disabled`를 걸면 닫은 뒤 포커스가 트리거로 돌아오지 못하므로 `aria-disabled`와 함께 쓴다.
// render로 합쳐진 핸들러의 이벤트에만 preventBaseUIHandler가 붙는다(React 타입에는 없다)
export function blockTriggerWhile(blocked: boolean) {
  return (e: MouseEvent) => {
    if (blocked) (e as MouseEvent & { preventBaseUIHandler: () => void }).preventBaseUIHandler()
  }
}
