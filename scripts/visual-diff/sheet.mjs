// 결과 디렉토리의 스크린샷을 한 장으로 모아 눈으로 훑어보는 보조 도구 — 행마다 왼쪽 head, 오른쪽 base.
// 기본은 report.json에서 차이가 난 쌍만, --only로 시나리오 이름(-pc/-mo 포함 파일명) 정규식 선택.
// --crop left,top,width,height로 같은 영역만 잘라 모드별 카드 비교 등에 쓴다
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
// sharp는 next의 전이 의존성으로 설치돼 있다 — 별도 devDependency로 추가하지 않음
import sharp from 'sharp'

const { positionals, values: opts } = parseArgs({
  allowPositionals: true,
  options: { only: { type: 'string' }, crop: { type: 'string' }, width: { type: 'string', default: '600' } },
})
const usage = () => {
  console.error('usage: node scripts/visual-diff/sheet.mjs <out-dir> [--only <regex>] [--crop left,top,width,height] [--width 600]')
  process.exit(2)
}
if (positionals.length !== 1) usage()
const crop = opts.crop ? opts.crop.split(',').map(Number) : null
const [left, top, width, height] = crop ?? []
if (crop && !(crop.length === 4 && crop.every(Number.isInteger) && left >= 0 && top >= 0 && width > 0 && height > 0)) usage()
const W = Number(opts.width)
if (!Number.isInteger(W) || W <= 0) usage()

const outDir = path.resolve(positionals[0])
const reportFile = path.join(outDir, 'report.json')
if (!existsSync(reportFile)) {
  console.error(`${reportFile} 없음 — run.mjs 결과 디렉토리를 넘긴다`)
  process.exit(2)
}
const { report } = JSON.parse(readFileSync(reportFile, 'utf8'))
const only = opts.only ? new RegExp(opts.only) : null
const names = report
  .filter((l) => (only ? only.test(`${l.name}-${l.vp}`) : l.diff !== 0))
  .map((l) => `${l.name}-${l.vp}`)
if (!names.length) {
  console.log(only ? `--only '${opts.only}'에 맞는 쌍 없음` : '차이 난 쌍 없음 — --only로 골라서 만들 수 있다')
  process.exit(0)
}

const GAP = 8

// 크롭 영역이 이미지 밖으로 나가면(짧은 페이지) 남은 만큼만 자른다
async function load(file) {
  if (!existsSync(file)) {
    console.warn(`스크린샷 없음: ${file}`)
    return null
  }
  let img = sharp(file)
  if (crop) {
    const meta = await img.metadata()
    const h = Math.min(height, meta.height - top), w = Math.min(width, meta.width - left)
    if (h <= 0 || w <= 0) return null
    img = sharp(await img.extract({ left, top, width: w, height: h }).toBuffer())
  }
  const { data, info } = await img.resize({ width: W }).png().toBuffer({ resolveWithObject: true })
  return { input: data, height: info.height }
}

const composites = []
let y = 0
for (const name of names) {
  const [head, base] = await Promise.all(['head', 'base'].map((label) => load(path.join(outDir, 'shots', label, `${name}.png`))))
  if (head) composites.push({ input: head.input, left: 0, top: y })
  if (base) composites.push({ input: base.input, left: W + GAP, top: y })
  y += Math.max(head?.height ?? 0, base?.height ?? 0) + GAP
}

if (!composites.length) {
  console.error('그릴 이미지가 없다 — 스크린샷이 없거나 크롭 영역이 전부 이미지 밖이다')
  process.exit(1)
}
const file = path.join(outDir, 'sheet.png')
await sharp({ create: { width: W * 2 + GAP, height: Math.max(y - GAP, 1), channels: 3, background: '#888' } })
  .composite(composites)
  .png()
  .toFile(file)
console.log(`${names.length}쌍 → ${file} (왼쪽 head, 오른쪽 base)`)
