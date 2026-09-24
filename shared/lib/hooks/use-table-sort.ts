'use client'

import { useState } from 'react'

export type SortDirection = 'asc' | 'desc'

// 테이블 헤더 정렬(같은 컬럼 재클릭 시 방향 토글, 다른 컬럼 클릭 시 desc로 시작) 공용 훅.
// AssetRecordList/FinanceRecordList에서 동일하게 반복되던 handleSort 로직을 추출.
export function useTableSort<K extends string>(initialKey: K, initialDirection: SortDirection = 'desc') {
  const [sortKey, setSortKey] = useState<K>(initialKey)
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialDirection)

  function handleSort(key: K) {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection('desc')
    }
  }

  return { sortKey, sortDirection, handleSort }
}
