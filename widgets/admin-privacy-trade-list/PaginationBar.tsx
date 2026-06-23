'use client'

import { useRouter, useSearchParams } from 'next/navigation'
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
}

export function PaginationBar({ page, totalPages }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()

  if (totalPages <= 1) return null

  const href = (p: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(p))
    return `?${params.toString()}`
  }

  const pages = buildPageNumbers(page, totalPages)

  return (
    <Pagination className="mt-4 justify-end">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={href(page - 1)}
            text="이전"
            aria-disabled={page === 1}
            onClick={(e) => { if (page === 1) e.preventDefault() }}
            className={page === 1 ? 'pointer-events-none opacity-40' : ''}
          />
        </PaginationItem>

        {pages.map((p, i) =>
          p === '...' ? (
            <PaginationItem key={`ellipsis-${i}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <PaginationLink href={href(p)} isActive={p === page}>
                {p}
              </PaginationLink>
            </PaginationItem>
          )
        )}

        <PaginationItem>
          <PaginationNext
            href={href(page + 1)}
            text="다음"
            aria-disabled={page === totalPages}
            onClick={(e) => { if (page === totalPages) e.preventDefault() }}
            className={page === totalPages ? 'pointer-events-none opacity-40' : ''}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
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
