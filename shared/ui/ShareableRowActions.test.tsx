import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ShareableRowActions } from './ShareableRowActions'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.ComponentProps<'a'>) => <a href={href} {...props}>{children}</a>,
}))

const baseProps = {
  canShare: false,
  hasGroupId: false,
  onShare: vi.fn(),
  onUnshare: vi.fn(),
  sharePending: false,
  unsharePending: false,
  onDelete: vi.fn(),
}

describe('ShareableRowActions', () => {
  it('onEdit이면 수정 버튼을 클릭 가능한 <button>으로 렌더한다', () => {
    render(<ShareableRowActions {...baseProps} onEdit={vi.fn()} />)
    const edit = screen.getByRole('button', { name: '수정' })
    expect(edit.tagName).toBe('BUTTON')
    expect(edit).not.toBeDisabled()
  })

  it('editHref면 수정 버튼을 <a>로 렌더한다', () => {
    render(<ShareableRowActions {...baseProps} editHref="/finance/1/edit" />)
    const edit = screen.getByRole('link', { name: '수정' })
    expect(edit).toHaveAttribute('href', '/finance/1/edit')
  })

  it('editHref + locked면 <a> 대신 비활성 <button>을 렌더한다(Link는 disabled를 표현할 수 없음)', () => {
    render(<ShareableRowActions {...baseProps} editHref="/finance/1/edit" locked lockTitle="마감된 달" />)
    expect(screen.queryByRole('link', { name: '수정' })).not.toBeInTheDocument()
    const edit = screen.getByRole('button', { name: '수정' })
    expect(edit).toBeDisabled()
    expect(edit).toHaveAttribute('title', '마감된 달')
  })

  it('onDuplicate/duplicateHref 둘 다 없으면 복제 버튼을 렌더하지 않는다', () => {
    render(<ShareableRowActions {...baseProps} onEdit={vi.fn()} />)
    expect(screen.queryByLabelText('복제')).not.toBeInTheDocument()
  })

  it('duplicateHref면 복제 버튼을 <a>로 렌더한다', () => {
    render(<ShareableRowActions {...baseProps} onEdit={vi.fn()} duplicateHref="/finance/new?duplicateFrom=1" />)
    expect(screen.getByRole('link', { name: '복제' })).toHaveAttribute('href', '/finance/new?duplicateFrom=1')
  })

  it('컴파일 타임에 onEdit/editHref를 동시에 넘기거나 둘 다 생략하면 타입 에러가 난다', () => {
    // @ts-expect-error — onEdit/editHref 중 정확히 하나만 허용(둘 다 생략)
    const missingBoth = <ShareableRowActions {...baseProps} />
    // @ts-expect-error — onEdit/editHref 중 정확히 하나만 허용(둘 다 전달)
    const both = <ShareableRowActions {...baseProps} onEdit={vi.fn()} editHref="/x" />
    expect(missingBoth).toBeDefined()
    expect(both).toBeDefined()
  })
})
