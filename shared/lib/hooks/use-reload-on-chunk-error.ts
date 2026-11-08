'use client'

import { useEffect } from 'react'

const RELOAD_KEY = 'kista:chunk-reload-at'
const RELOAD_WINDOW_MS = 30_000
// 오류 리포트(keepalive fetch)가 나갈 시간을 준 뒤 새로고침한다
const RELOAD_DELAY_MS = 500
// ChunkLoadError 외에 Turbopack·Safari·Firefox는 동적 import 실패를 TypeError 등 다른 이름으로 던진다
const CHUNK_ERROR_MESSAGE = /Loading chunk|Failed to load chunk|dynamically imported module|Importing a module script/i

function isChunkLoadError(error: Error | undefined) {
  return !!error && (error.name === 'ChunkLoadError' || CHUNK_ERROR_MESSAGE.test(error.message))
}

// 배포로 청크 파일명이 바뀌면 열려 있던 탭이 옛 청크를 요청해 오류가 난다 — 새로고침하면 새 빌드를 받아 해결된다.
// 새로고침 직후에도 오류 화면이 다시 마운트되므로 30초 안에는 한 번만 시도해 무한 새로고침을 막는다.
export function useReloadOnChunkError(error: Error | undefined) {
  useEffect(() => {
    if (!isChunkLoadError(error)) return
    try {
      const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0)
      if (Date.now() - last < RELOAD_WINDOW_MS) return
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
    } catch {
      return // sessionStorage 접근 불가(프라이빗 모드 등)면 루프 방어를 못 하므로 자동 새로고침을 하지 않는다
    }
    const timer = setTimeout(() => window.location.reload(), RELOAD_DELAY_MS)
    return () => clearTimeout(timer)
  }, [error])
}
