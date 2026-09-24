'use client'

import { useState } from 'react'

// 클라이언트에서 이미 조회된 전체 목록을 페이지 단위로 슬라이싱하는 공용 훅.
// AssetRecordList/FinanceRecordList/BudgetManager/AdminUsersTable/AdminPendingList/
// AdminTradesWorkbench에서 동일하게 반복되던 page/size state + totalPages/currentPage/paged
// 계산 + 페이지 크기 변경 시 1페이지 복귀를 추출.
export function useClientPagination<T>(items: T[], options: { initialSize?: number; initialPage?: number } = {}) {
  const { initialSize = 10, initialPage = 1 } = options
  const [page, setPage] = useState(initialPage)
  const [size, setSize] = useState(initialSize)

  const totalPages = Math.max(1, Math.ceil(items.length / size))
  const currentPage = Math.min(page, totalPages)
  const paged = items.slice((currentPage - 1) * size, currentPage * size)

  function handlePageSizeChange(nextSize: string) {
    setSize(Number(nextSize))
    setPage(1)
  }

  return { page: currentPage, setPage, size, totalPages, paged, handlePageSizeChange }
}
