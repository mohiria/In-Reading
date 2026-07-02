import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

// Regularizes store screenshots to EXACTLY 1280×800 (Chrome Web Store requires
// 1280×800 or 640×400; Edge recommends 1280×800). Uses fit:'contain' + white pad so
// nothing is cropped — a 1272×792 capture becomes 1280×800 with a hairline border.
// Reads originals only, never overwrites them; outputs to <dir>/store-1280x800/.

const TARGET_W = 1280
const TARGET_H = 800
const EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp'])

const inputDir = path.resolve(process.argv[2] || 'docs/images')
const outputDir = path.join(inputDir, 'store-1280x800')

async function run() {
  if (!fs.existsSync(inputDir)) {
    console.error(`Input dir not found: ${inputDir}`)
    process.exit(1)
  }
  fs.mkdirSync(outputDir, { recursive: true })

  const files = fs.readdirSync(inputDir).filter(f => EXTS.has(path.extname(f).toLowerCase()))
  if (!files.length) {
    console.log(`No images in ${inputDir}`)
    return
  }

  for (const file of files) {
    const src = path.join(inputDir, file)
    const out = path.join(outputDir, path.parse(file).name + '.png')
    const meta = await sharp(src).metadata()
    await sharp(src)
      .resize(TARGET_W, TARGET_H, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(out)
    console.log(`✓ ${file.padEnd(28)} ${meta.width}×${meta.height} → ${TARGET_W}×${TARGET_H}`)
  }

  console.log(`\nDone. ${files.length} image(s) → ${outputDir}`)
}

run().catch(err => { console.error(err); process.exit(1) })
