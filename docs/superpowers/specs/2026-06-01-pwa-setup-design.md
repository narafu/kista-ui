# PWA 구성 설계

**날짜**: 2026-06-01  
**목표**: iOS 홈 화면 추가 시 푸시 알림 수신 가능하도록 kista-ui를 PWA로 구성

---

## 배경

iOS에서는 일반 브라우저 모드(Chrome, Safari 포함)에서 Web Push가 불가능하다. iOS 16.4+의 Safari에서 홈 화면에 추가한 PWA 앱만 Web Push를 수신할 수 있다. 현재 kista-ui에는 PWA 필수 구성요소(manifest, 아이콘)가 없어 이 경로가 막혀 있다.

---

## 범위

- `public/` 아이콘 3종 생성 (sips 활용)
- `app/manifest.ts` 신규 작성
- `app/layout.tsx` iOS 메타태그 + 테마 색상 추가
- 기존 `firebase-messaging-sw.js` 재활용 (별도 수정 없음)

---

## 아이콘

`sips`로 기존 `public/logo.png` (256×139)를 가공.  
배경색 `#FCEFE8` (rose-50), 로고를 중앙 배치한 정사각형으로 생성.

| 파일 | 크기 | 용도 |
|------|------|------|
| `public/icon-192.png` | 192×192 | PWA 표준 (Android Chrome 홈 화면) |
| `public/icon-512.png` | 512×512 | PWA 고해상도 (스플래시 화면 등) |
| `public/apple-touch-icon.png` | 180×180 | iOS 홈 화면 아이콘 |

생성 방법 (sips):
```bash
# 512×512: 로고를 340px 폭으로 리샘플 후 패딩
sips --resampleWidth 340 logo.png --out /tmp/logo_lg.png
sips --padToHeightWidth 512 512 /tmp/logo_lg.png --padColor FCEFE8 --out public/icon-512.png

# 192×192: 로고를 128px 폭으로 리샘플 후 패딩
sips --resampleWidth 128 logo.png --out /tmp/logo_md.png
sips --padToHeightWidth 192 192 /tmp/logo_md.png --padColor FCEFE8 --out public/icon-192.png

# 180×180 (apple-touch-icon): 120px 폭
sips --resampleWidth 120 logo.png --out /tmp/logo_sm.png
sips --padToHeightWidth 180 180 /tmp/logo_sm.png --padColor FCEFE8 --out public/apple-touch-icon.png
```

---

## Web App Manifest (`app/manifest.ts`)

Next.js App Router 방식. `/manifest.webmanifest`로 자동 서빙.

```typescript
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KISTA',
    short_name: 'KISTA',
    description: '한국투자증권 KIS API 기반 해외주식 자동 분할매매',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#FCEFE8',
    theme_color: '#B66951',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  }
}
```

---

## iOS 메타태그 (`app/layout.tsx`)

Next.js `metadata` 객체에 추가. iOS Safari에서 홈 화면 추가 시 앱처럼 동작하게 함.

```typescript
export const metadata: Metadata = {
  title: 'KISTA',
  description: '...',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'KISTA',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}
```

`<link rel="apple-touch-icon" href="/apple-touch-icon.png" />` 는 Next.js `icons.apple` 필드로 추가.

---

## 서비스워커

기존 `public/firebase-messaging-sw.js` 재활용. 별도 수정 없음.  
`lib/fcm.ts`의 `navigator.serviceWorker.register('/firebase-messaging-sw.js')` 경로 그대로 유지.

---

## 검증

1. Vercel 배포 후 iPhone Safari에서 `kista-ui.vercel.app` 접속
2. 공유 버튼 → "홈 화면에 추가" → 설치
3. 홈 화면 아이콘 확인 (로즈골드 배경 + 로고)
4. 앱 실행 → 설정 → 알림 → 푸시 알림 선택
5. 알림 권한 팝업 → 허용
6. Render(kista-api) 로그에서 `POST /api/fcm/tokens` 확인
