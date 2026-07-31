import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HousingBenchmarkRegionQuintileInfo } from './HousingBenchmarkRegionQuintileInfo'

describe('HousingBenchmarkRegionQuintileInfo', () => {
  it('선택한 분위의 대표 지역·특징만 표시한다', () => {
    render(<HousingBenchmarkRegionQuintileInfo regionName="서울" quintile={1} />)

    expect(screen.getByText('서울 아파트 1분위 안내')).toBeInTheDocument()
    expect(screen.getByText(/^서울 1분위/)).toBeInTheDocument()
    expect(screen.getByText(/노원구, 도봉구, 강북구/)).toBeInTheDocument()
    expect(screen.queryByText(/^서울 5분위/)).not.toBeInTheDocument()
    expect(screen.queryByText(/서초구, 강남구, 송파구, 용산구/)).not.toBeInTheDocument()
  })

  it('전국 + 3분위 선택 시 전국 3분위 설명만 표시한다', () => {
    render(<HousingBenchmarkRegionQuintileInfo regionName="전국" quintile={3} />)

    expect(screen.getByText('전국 아파트 3분위 안내')).toBeInTheDocument()
    expect(screen.getByText(/경기 중위권 \(수원, 용인, 고양 등\)/)).toBeInTheDocument()
    expect(screen.queryByText(/대한민국 최상위 자본 집중지/)).not.toBeInTheDocument()
  })

  it('수도권 + 5분위 선택 시 수도권 5분위 설명만 표시한다', () => {
    render(<HousingBenchmarkRegionQuintileInfo regionName="수도권" quintile={5} />)

    expect(screen.getByText('수도권 아파트 5분위 안내')).toBeInTheDocument()
    expect(screen.getByText(/강남 3구와 용산을 필두로/)).toBeInTheDocument()
    expect(screen.queryByText(/동두천, 포천, 여주, 안성/)).not.toBeInTheDocument()
  })

  it('알 수 없는 지역명이면 서울 설명으로 대체한다', () => {
    render(<HousingBenchmarkRegionQuintileInfo regionName="부산" quintile={1} />)

    expect(screen.getByText('부산 아파트 1분위 안내')).toBeInTheDocument()
    expect(screen.getByText(/노원구, 도봉구, 강북구/)).toBeInTheDocument()
  })
})
