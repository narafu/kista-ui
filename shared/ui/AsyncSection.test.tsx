import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AsyncSection } from './AsyncSection'

const body = (rows: string[]) => <p>본문 {rows.length}</p>
const isEmpty = (rows: string[]) => rows.length === 0

describe('AsyncSection', () => {
  it('데이터가 없는 동안 로딩을 보인다', () => {
    render(<AsyncSection data={undefined as string[] | undefined}>{body}</AsyncSection>)
    expect(screen.getByText('불러오는 중…')).toBeInTheDocument()
  })

  it('chart 프리셋은 이름 있는 status 스켈레톤이다', () => {
    render(<AsyncSection data={undefined as string[] | undefined} skeleton="chart">{body}</AsyncSection>)
    expect(screen.getByRole('status', { name: '차트 불러오는 중' })).toBeInTheDocument()
  })

  it('데이터 없는 실패는 오류 문구를 보인다', () => {
    render(<AsyncSection data={undefined as string[] | undefined} isError errorMessage="목록을 불러오지 못했습니다.">{body}</AsyncSection>)
    expect(screen.getByText('목록을 불러오지 못했습니다.')).toBeInTheDocument()
  })

  it('이전 데이터가 있으면 실패해도 본문을 유지한다', () => {
    render(<AsyncSection data={['a']} isError errorMessage="실패">{body}</AsyncSection>)
    expect(screen.getByText('본문 1')).toBeInTheDocument()
    expect(screen.queryByText('실패')).not.toBeInTheDocument()
  })

  it('빈 데이터는 빈 문구, 값이 있으면 본문이다', () => {
    const { unmount } = render(<AsyncSection data={[] as string[]} isEmpty={isEmpty} empty="내역이 없습니다.">{body}</AsyncSection>)
    expect(screen.getByText('내역이 없습니다.')).toBeInTheDocument()
    unmount()
    render(<AsyncSection data={['a', 'b']} isEmpty={isEmpty} empty="내역이 없습니다.">{body}</AsyncSection>)
    expect(screen.getByText('본문 2')).toBeInTheDocument()
  })
})
