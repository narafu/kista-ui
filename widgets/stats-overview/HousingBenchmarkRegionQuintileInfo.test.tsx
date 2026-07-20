import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HousingBenchmarkRegionQuintileInfo } from './HousingBenchmarkRegionQuintileInfo'

describe('HousingBenchmarkRegionQuintileInfo', () => {
  it('서울 1~5분위의 대표 지역·특징을 모두 표시한다', () => {
    render(<HousingBenchmarkRegionQuintileInfo regionName="서울" />)

    expect(screen.getByText('서울 아파트 5분위 안내')).toBeInTheDocument()
    for (const quintile of [1, 2, 3, 4, 5]) {
      expect(screen.getByText(new RegExp(`^서울 ${quintile}분위`))).toBeInTheDocument()
    }
    expect(screen.getByText(/노원구, 도봉구, 강북구/)).toBeInTheDocument()
    expect(screen.getByText(/서초구, 강남구, 송파구, 용산구/)).toBeInTheDocument()
  })

  it('전국 지역 선택 시 전국 1~5분위 설명을 표시한다', () => {
    render(<HousingBenchmarkRegionQuintileInfo regionName="전국" />)

    expect(screen.getByText('전국 아파트 5분위 안내')).toBeInTheDocument()
    expect(screen.getByText(/강원 태백, 경북 안동/)).toBeInTheDocument()
    expect(screen.getByText(/대한민국 최상위 자본 집중지/)).toBeInTheDocument()
  })

  it('수도권 지역 선택 시 수도권 1~5분위 설명을 표시한다', () => {
    render(<HousingBenchmarkRegionQuintileInfo regionName="수도권" />)

    expect(screen.getByText('수도권 아파트 5분위 안내')).toBeInTheDocument()
    expect(screen.getByText(/동두천, 포천, 여주, 안성/)).toBeInTheDocument()
    expect(screen.getByText(/강남 3구와 용산을 필두로/)).toBeInTheDocument()
  })

  it('알 수 없는 지역명이면 서울 설명으로 대체한다', () => {
    render(<HousingBenchmarkRegionQuintileInfo regionName="부산" />)

    expect(screen.getByText('부산 아파트 5분위 안내')).toBeInTheDocument()
    expect(screen.getByText(/노원구, 도봉구, 강북구/)).toBeInTheDocument()
  })
})
