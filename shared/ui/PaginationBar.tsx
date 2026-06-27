'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

interface Props {
  page: number
  totalPages: number
  /** 제공 시 버튼 클릭으로 동작 (클라이언트 사이드 페이징). 미제공 시 URL ?page= 업데이트. */
  onPageChange?: (page: number) => void
  /** onPageChange 미사용 시 URL에 쓸 파라미터 이름 (기본: 'page') */
  pageParam?: string
}

function PaginationBarContent({ page, totalPages, onPageChange, pageParam = 'page' }: Props) {
  const searchParams = useSearchParams()

  if (totalPages <= 1) return null

  const href = (p: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set(pageParam, String(p))
    return `?${params.toString()}`
  }

  const pages = buildPageNumbers(page, totalPages)

  const prevDisabled = page === 1
  const nextDisabled = page === totalPages

  if (onPageChange) {
    return (
      <Pagination className="mt-4 justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              text="이전"
              onClick={(e) => { e.preventDefault(); if (!prevDisabled) onPageChange(page - 1) }}
              className={prevDisabled ? 'pointer-events-none opacity-40' : ''}
            />
          </PaginationItem>
          {pagesWithKeys(pages).map(({ key, p }) =>
            p === '...' ? (
              <PaginationItem key={key}><PaginationEllipsis /></PaginationItem>
            ) : (
              <PaginationItem key={key}>
                <PaginationLink href="#" isActive={p === page} onClick={(e) => { e.preventDefault(); onPageChange(p as number) }}>
                  {p}
                </PaginationLink>
              </PaginationItem>
            )
          )}
          <PaginationItem>
            <PaginationNext
              href="#"
              text="다음"
              onClick={(e) => { e.preventDefault(); if (!nextDisabled) onPageChange(page + 1) }}
              className={nextDisabled ? 'pointer-events-none opacity-40' : ''}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
  }

  return (
    <Pagination className="mt-4 justify-end">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={href(page - 1)}
            text="이전"
            onClick={(e) => { if (prevDisabled) e.preventDefault() }}
            className={prevDisabled ? 'pointer-events-none opacity-40' : ''}
          />
        </PaginationItem>
        {pagesWithKeys(pages).map(({ key, p }) =>
          p === '...' ? (
            <PaginationItem key={key}><PaginationEllipsis /></PaginationItem>
          ) : (
            <PaginationItem key={key}>
              <PaginationLink href={href(p as number)} isActive={p === page}>{p}</PaginationLink>
            </PaginationItem>
          )
        )}
        <PaginationItem>
          <PaginationNext
            href={href(page + 1)}
            text="다음"
            onClick={(e) => { if (nextDisabled) e.preventDefault() }}
            className={nextDisabled ? 'pointer-events-none opacity-40' : ''}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}

export function PaginationBar(props: Props) {
  return (
    <Suspense>
      <PaginationBarContent {...props} />
    </Suspense>
  )
}

function pagesWithKeys(pages: (number | '...')[]): { key: string; p: number | '...' }[] {
  const result: { key: string; p: number | '...' }[] = []
  let ellipsisCount = 0
  for (const p of pages) {
    result.push({ key: p === '...' ? `ellipsis-${++ellipsisCount}` : String(p), p })
  }
  return result
}

function buildPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | '...')[] = [1]
  if (current > 3) pages.push('...')
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}
