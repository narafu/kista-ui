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

  const urlHref = (p: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set(pageParam, String(p))
    return `?${params.toString()}`
  }

  // onPageChange 제공 시 콜백 모드(href="#" + preventDefault), 미제공 시 URL 링크 모드.
  const linkProps = (p: number, disabled = false) => onPageChange
    ? { href: '#', onClick: (e: React.MouseEvent) => { e.preventDefault(); if (!disabled) onPageChange(p) } }
    : { href: urlHref(p), onClick: (e: React.MouseEvent) => { if (disabled) e.preventDefault() } }

  const pages = buildPageNumbers(page, totalPages)
  const prevDisabled = page === 1
  const nextDisabled = page === totalPages

  return (
    <Pagination className="mt-4 justify-end">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            text="이전"
            className={prevDisabled ? 'pointer-events-none opacity-40' : ''}
            {...linkProps(page - 1, prevDisabled)}
          />
        </PaginationItem>
        {pagesWithKeys(pages).map(({ key, p }) =>
          p === '...' ? (
            <PaginationItem key={key}><PaginationEllipsis /></PaginationItem>
          ) : (
            <PaginationItem key={key}>
              <PaginationLink isActive={p === page} {...linkProps(p)}>{p}</PaginationLink>
            </PaginationItem>
          )
        )}
        <PaginationItem>
          <PaginationNext
            text="다음"
            className={nextDisabled ? 'pointer-events-none opacity-40' : ''}
            {...linkProps(page + 1, nextDisabled)}
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
  return pages.map((p, i) => ({ key: p === '...' ? `ellipsis-${i}` : String(p), p }))
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
