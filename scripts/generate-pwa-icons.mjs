#!/usr/bin/env node
import sharp from 'sharp'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const sizes = [192, 512]
const svgPath = join(__dirname, '../public/newsdeck-icon.svg')

async function generateIcons() {
  const svgBuffer = readFileSync(svgPath)

  for (const size of sizes) {
    const outputPath = join(__dirname, `../public/icon-${size}.png`)

    await sharp(svgBuffer)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(outputPath)

    console.log(`✅ Generated ${size}x${size} icon: icon-${size}.png`)
  }
}

generateIcons().catch(console.error)
