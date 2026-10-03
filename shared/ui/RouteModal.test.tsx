import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RouteModal } from './RouteModal'

const mockBack = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mockBack }),
}))

describe('RouteModal', () => {
  beforeEach(() => {
    mockBack.mockClear()
  })

  it('renders a dialog role with aria-modal for assistive tech', () => {
    render(<RouteModal><p>content</p></RouteModal>)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('labels the dialog with the first h1 rendered inside', () => {
    render(<RouteModal><h1>전략 등록</h1></RouteModal>)

    expect(screen.getByRole('dialog', { name: '전략 등록' })).toBeInTheDocument()
  })

  it('describes the dialog with the PageHeader description', () => {
    render(<RouteModal><h1>전략 등록</h1><p data-slot="page-description">전략 종류와 매매 조건 설정</p></RouteModal>)

    expect(screen.getByRole('dialog')).toHaveAccessibleDescription('전략 종류와 매매 조건 설정')
  })

  it('links the h1 even when it renders after mount', async () => {
    const { rerender } = render(<RouteModal><p>loading</p></RouteModal>)
    rerender(<RouteModal><h1>자산 수정</h1></RouteModal>)

    expect(await screen.findByRole('dialog', { name: '자산 수정' })).toBeInTheDocument()
  })

  it('allows vertical touch panning on the mobile scroll container', () => {
    render(<RouteModal><p>content</p></RouteModal>)

    expect(screen.getByRole('dialog').parentElement).toHaveClass('touch-pan-y')
  })

  it('closes on Escape keydown', () => {
    render(<RouteModal><p>content</p></RouteModal>)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(mockBack).toHaveBeenCalledTimes(1)
  })

  it('closes when clicking the backdrop', () => {
    render(<RouteModal><p>content</p></RouteModal>)

    fireEvent.click(screen.getByRole('dialog').parentElement as HTMLElement)

    expect(mockBack).toHaveBeenCalledTimes(1)
  })

  it('closes when clicking the close button', () => {
    render(<RouteModal><p>content</p></RouteModal>)

    fireEvent.click(screen.getByRole('button', { name: '닫기' }))

    expect(mockBack).toHaveBeenCalledTimes(1)
  })

  it('포커스가 모달 밖 포털 요소(하위 확인창 등)에 있으면 Escape로 라우트를 닫지 않는다', () => {
    const portal = document.createElement('button')
    document.body.appendChild(portal)
    render(<RouteModal><h1>예산 관리</h1></RouteModal>)

    portal.focus()
    fireEvent.keyDown(portal, { key: 'Escape' })

    expect(mockBack).not.toHaveBeenCalled()
    portal.remove()
  })

  it('다른 오버레이(확인창·Select 목록)가 열려 있으면 포커스 위치와 무관하게 Escape로 라우트를 닫지 않는다', () => {
    // 하위 팝업이 열린 직후엔 포커스가 아직 모달 안 트리거에 남아 있을 수 있다(초기 포커스 이동이 비동기)
    const overlay = document.createElement('div')
    overlay.setAttribute('role', 'alertdialog')
    document.body.appendChild(overlay)
    render(<RouteModal><h1>예산 관리</h1></RouteModal>)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(mockBack).not.toHaveBeenCalled()
    overlay.remove()
  })

  it('닫힌 채 숨겨져 남아 있는 목록(base-ui Select forceMount)은 열린 오버레이로 보지 않는다', () => {
    // base-ui Select는 값이 한 번 바뀌면 닫힌 뒤에도 [hidden] 포지셔너 안에 listbox를 남겨 둔다
    const positioner = document.createElement('div')
    positioner.hidden = true
    const listbox = document.createElement('div')
    listbox.setAttribute('role', 'listbox')
    positioner.appendChild(listbox)
    document.body.appendChild(positioner)
    render(<RouteModal><h1>예산 관리</h1></RouteModal>)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(mockBack).toHaveBeenCalledTimes(1)
    positioner.remove()
  })
})
