import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UrlRangeFilterBar } from './UrlRangeFilterBar'

const nav = vi.hoisted(() => ({
  push: vi.fn(),
  search: '',
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: nav.push }),
  usePathname: () => '/admin/trades',
  useSearchParams: () => new URLSearchParams(nav.search),
}))

function lastPushed() {
  const [url] = nav.push.mock.calls.at(-1) as [string]
  const [path, query] = url.split('?')
  return { path, params: new URLSearchParams(query) }
}

beforeEach(() => {
  nav.push.mockClear()
  nav.search = ''
})

describe('UrlRangeFilterBar 프리셋', () => {
  it('current와 같은 버튼만 aria-pressed true', () => {
    render(<UrlRangeFilterBar current="30d" />)

    expect(screen.getByRole('button', { name: '30일' })).toHaveAttribute('aria-pressed', 'true')
    for (const name of ['7일', '전체', '입력']) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'false')
    }
  })

  it('presets prop 지정 시 그 목록만 렌더', () => {
    render(<UrlRangeFilterBar current="7d" presets={['7d', 'all']} />)

    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['7일', '전체'])
  })

  it('클릭 시 range 설정, page=1, from/to 삭제, 기존 쿼리 유지', () => {
    nav.search = 'tab=a&page=3&from=2026-01-01&to=2026-01-31'
    render(<UrlRangeFilterBar current="7d" />)

    fireEvent.click(screen.getByRole('button', { name: '전체' }))

    const { path, params } = lastPushed()
    expect(path).toBe('/admin/trades')
    expect(params.get('range')).toBe('all')
    expect(params.get('page')).toBe('1')
    expect(params.get('tab')).toBe('a')
    expect(params.has('from')).toBe(false)
    expect(params.has('to')).toBe(false)
  })

  it('paramPrefix와 pageParamKeys 사용 시 접두 키로 push', () => {
    nav.search = 'range=7d&ap=4&audFrom=2026-01-01&audTo=2026-01-31'
    render(<UrlRangeFilterBar current="7d" paramPrefix="aud" pageParamKeys={['ap']} />)

    fireEvent.click(screen.getByRole('button', { name: '30일' }))

    const { params } = lastPushed()
    expect(params.get('audRange')).toBe('30d')
    expect(params.get('ap')).toBe('1')
    expect(params.has('audFrom')).toBe(false)
    expect(params.has('audTo')).toBe(false)
    expect(params.get('range')).toBe('7d')
    expect(params.has('page')).toBe(false)
  })
})

describe('UrlRangeFilterBar 직접 입력', () => {
  it('custom이 아니면 날짜 입력이 없다', () => {
    render(<UrlRangeFilterBar current="7d" />)

    expect(screen.queryByLabelText('시작 날짜')).not.toBeInTheDocument()
  })

  it('적용 클릭 시 range=custom&from&to로 push', () => {
    render(<UrlRangeFilterBar current="custom" from="2026-01-01" to="2026-01-31" />)

    fireEvent.change(screen.getByLabelText('종료 날짜'), { target: { value: '2026-02-10' } })
    fireEvent.click(screen.getByRole('button', { name: '적용' }))

    const { params } = lastPushed()
    expect(params.get('range')).toBe('custom')
    expect(params.get('from')).toBe('2026-01-01')
    expect(params.get('to')).toBe('2026-02-10')
    expect(params.get('page')).toBe('1')
  })

  it('from > to면 alert 표시, 적용 비활성, push 안 됨', () => {
    render(<UrlRangeFilterBar current="custom" from="2026-01-01" to="2026-01-31" />)

    fireEvent.change(screen.getByLabelText('시작 날짜'), { target: { value: '2026-03-01' } })

    expect(screen.getByRole('alert')).toHaveTextContent('시작 날짜가 종료 날짜보다 늦습니다.')
    const apply = screen.getByRole('button', { name: '적용' })
    expect(apply).toBeDisabled()
    fireEvent.click(apply)
    expect(nav.push).not.toHaveBeenCalled()
  })

  it('값이 비어 있으면 적용 비활성', () => {
    render(<UrlRangeFilterBar current="custom" from="2026-01-01" />)

    expect(screen.getByRole('button', { name: '적용' })).toBeDisabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('UrlRangeFilterBar key 리마운트', () => {
  it('from/to prop이 바뀌면 로컬 입력값이 새 값으로 교체된다', () => {
    const { rerender } = render(<UrlRangeFilterBar current="custom" from="2026-01-01" to="2026-01-31" />)
    fireEvent.change(screen.getByLabelText('시작 날짜'), { target: { value: '2026-01-15' } })

    rerender(<UrlRangeFilterBar current="custom" from="2026-02-01" to="2026-02-28" />)

    expect(screen.getByLabelText('시작 날짜')).toHaveValue('2026-02-01')
    expect(screen.getByLabelText('종료 날짜')).toHaveValue('2026-02-28')
  })

  it('from/to가 같고 다른 prop만 바뀌면 로컬 입력값 유지', () => {
    const { rerender } = render(<UrlRangeFilterBar current="custom" from="2026-01-01" to="2026-01-31" />)
    fireEvent.change(screen.getByLabelText('시작 날짜'), { target: { value: '2026-01-15' } })

    rerender(<UrlRangeFilterBar current="custom" from="2026-01-01" to="2026-01-31" paramPrefix="x" />)

    expect(screen.getByLabelText('시작 날짜')).toHaveValue('2026-01-15')
  })
})
