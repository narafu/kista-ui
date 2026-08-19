import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SuggestionListEditor } from './SuggestionListEditor'

describe('SuggestionListEditor', () => {
  it('추가 버튼으로 새 값을 onChange에 추가한다', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SuggestionListEditor id="test" label="기관" values={['토스증권']} onChange={onChange} />)

    await user.type(screen.getByLabelText('기관 추가'), '카카오뱅크')
    await user.click(screen.getByLabelText('기관 추가 확정'))

    expect(onChange).toHaveBeenCalledWith(['토스증권', '카카오뱅크'])
  })

  it('Enter 키로도 값을 추가할 수 있다', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SuggestionListEditor id="test" label="기관" values={[]} onChange={onChange} />)

    await user.type(screen.getByLabelText('기관 추가'), '카카오뱅크{Enter}')

    expect(onChange).toHaveBeenCalledWith(['카카오뱅크'])
  })

  it('빈 값 추가는 거부하고 에러 문구를 보여준다', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SuggestionListEditor id="test" label="기관" values={[]} onChange={onChange} />)

    await user.click(screen.getByLabelText('기관 추가 확정'))

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('값을 입력하세요.')
  })

  it('이미 있는 값 추가는 거부하고 에러 문구를 보여준다', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SuggestionListEditor id="test" label="기관" values={['토스증권']} onChange={onChange} />)

    await user.type(screen.getByLabelText('기관 추가'), '토스증권')
    await user.click(screen.getByLabelText('기관 추가 확정'))

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('이미 추가된 값입니다.')
  })

  it('삭제 버튼으로 값을 제거한다', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SuggestionListEditor id="test" label="기관" values={['토스증권', '국민은행']} onChange={onChange} />)

    await user.click(screen.getByLabelText('토스증권 삭제'))

    expect(onChange).toHaveBeenCalledWith(['국민은행'])
  })

  it('값이 없으면 안내 문구를 보여준다', () => {
    render(<SuggestionListEditor id="test" label="기관" values={[]} onChange={vi.fn()} />)
    expect(screen.getByText('등록된 값이 없습니다.')).toBeInTheDocument()
  })
})
