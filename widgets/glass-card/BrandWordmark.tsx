import Image from 'next/image'

/** 인증 화면군(pending·rejected 등) 좌상단 로고+워드마크 */
export function BrandWordmark() {
  return (
    <span className="flex items-center gap-2">
      <Image src="/logo.png" alt="KISTA" width={26} height={26} className="rounded" style={{ height: 26, width: 26 }} />
      <span className="display text-lg tracking-wide" style={{ color: 'var(--rose-700)' }}>
        KISTA
      </span>
    </span>
  )
}
