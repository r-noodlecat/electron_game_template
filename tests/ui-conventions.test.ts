import { describe, expect, it } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '..')
const GAME_DIR = path.join(ROOT, 'src', 'game')
const INDEX_CSS_PATH = path.join(GAME_DIR, 'index.css')

function collectFiles(dir: string, extension: string): string[] {
  const files: string[] = []

  if (!fs.existsSync(dir)) {
    return files
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, extension))
      continue
    }

    if (entry.isFile() && entry.name.endsWith(extension)) {
      files.push(fullPath)
    }
  }

  return files
}

function normalizeWhitespace(content: string): string {
  return content.replace(/\s+/g, ' ').trim()
}

describe('ui conventions enforcement', () => {
  const cssFiles = collectFiles(GAME_DIR, '.css')
  const tsxFiles = collectFiles(GAME_DIR, '.tsx')

  it('defines global scrollbar styling and shared overflow utilities', () => {
    const content = normalizeWhitespace(fs.readFileSync(INDEX_CSS_PATH, 'utf-8'))

    expect(
      content.includes('::-webkit-scrollbar {')
      && content.includes('::-webkit-scrollbar-thumb {')
      && content.includes('::-webkit-scrollbar-track {'),
      'src/game/index.css must define global scrollbar selectors',
    ).toBe(true)

    expect(
      content.includes('.ui-scroll-region {')
      && content.includes('overflow: auto;')
      && content.includes('scrollbar-gutter: stable both-edges;'),
      'src/game/index.css must define a shared .ui-scroll-region utility with overflow: auto',
    ).toBe(true)

    expect(
      content.includes('.ui-stable-slot {')
      && content.includes('min-block-size: 1.5rem;'),
      'src/game/index.css must define a shared .ui-stable-slot utility that reserves space',
    ).toBe(true)
  })

  it('does not allow overflow: scroll in renderer CSS', () => {
    const failures: string[] = []

    for (const file of cssFiles) {
      const content = normalizeWhitespace(fs.readFileSync(file, 'utf-8'))
      if (content.includes('overflow: scroll;') || content.includes('overflow-x: scroll;') || content.includes('overflow-y: scroll;')) {
        failures.push(`${path.relative(ROOT, file)} uses overflow: scroll; prefer overflow: auto`)
      }
    }

    expect(failures, failures.join('\n')).toHaveLength(0)
  })

  it('requires explicit comments for intentional layout shifts', () => {
    const failures: string[] = []
    const requiredMarker = 'layout-shift-intentional:'

    for (const file of [...tsxFiles, ...cssFiles]) {
      const content = fs.readFileSync(file, 'utf-8')
      const matches = [...content.matchAll(/layout-shift-intentional:([^\n\r]*)/g)]

      for (const match of matches) {
        if ((match[1] ?? '').trim().length === 0) {
          failures.push(`${path.relative(ROOT, file)} uses ${requiredMarker} without an explanation`)
        }
      }
    }

    expect(failures, failures.join('\n')).toHaveLength(0)
  })

  it('flags conditional helper UI that lacks a stable slot or explicit layout-shift note', () => {
    const failures: string[] = []

    for (const file of tsxFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      const normalized = normalizeWhitespace(content)
      const hasConditionalUi = /(\&\&|\?).{0,160}(helper|error|status|message|hint|details)/i.test(normalized)
      const hasStableSlot = normalized.includes('ui-stable-slot') || normalized.includes('data-ui-stable-slot')
      const hasIntentionalShiftNote = normalized.includes('layout-shift-intentional:')

      if (hasConditionalUi && !hasStableSlot && !hasIntentionalShiftNote) {
        failures.push(`${path.relative(ROOT, file)} has conditional helper UI without a stable slot or explicit layout-shift-intentional note`)
      }
    }

    expect(failures, failures.join('\n')).toHaveLength(0)
  })
})