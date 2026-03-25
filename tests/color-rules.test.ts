import { describe, expect, it } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '..')
const GAME_DIR = path.join(ROOT, 'src', 'game')
const INDEX_CSS_PATH = path.join(GAME_DIR, 'index.css')

function collectCssFiles(dir: string): string[] {
  const files: string[] = []

  if (!fs.existsSync(dir)) {
    return files
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectCssFiles(fullPath))
      continue
    }

    if (entry.isFile() && entry.name.endsWith('.css')) {
      files.push(fullPath)
    }
  }

  return files
}

function parseCssVariables(content: string): Map<string, string> {
  const result = new Map<string, string>()
  const variableRegex = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi

  let match: RegExpExecArray | null
  while ((match = variableRegex.exec(content)) !== null) {
    const token = match[1].trim()
    const value = match[2].trim().toLowerCase().replace(/\s+/g, ' ')
    result.set(token, value)
  }

  return result
}

const STATE_SUFFIXES = ['-hover', '-inactive', '-disabled'] as const
const VISUAL_STATE_SUFFIXES = ['', '-hover', '-inactive', '-disabled'] as const

describe('color rules enforcement', () => {
  const cssFiles = collectCssFiles(GAME_DIR)
  const tokens = new Map<string, string>()

  for (const file of cssFiles) {
    const content = fs.readFileSync(file, 'utf-8')
    const parsed = parseCssVariables(content)
    for (const [token, value] of parsed.entries()) {
      tokens.set(token, value)
    }
  }

  it('defines at least one hover token, inactive token, and disabled token', () => {
    const hoverTokens = [...tokens.keys()].filter((token) => token.endsWith('-hover'))
    const inactiveTokens = [...tokens.keys()].filter((token) => token.endsWith('-inactive'))
    const disabledTokens = [...tokens.keys()].filter((token) => token.endsWith('-disabled'))

    expect(
      hoverTokens.length,
      'Expected at least one --*-hover color token so hover state can be validated',
    ).toBeGreaterThan(0)

    expect(
      inactiveTokens.length,
      'Expected at least one --*-inactive color token so inactive state can be validated',
    ).toBeGreaterThan(0)

    expect(
      disabledTokens.length,
      'Expected at least one --*-disabled color token so disabled state can be validated',
    ).toBeGreaterThan(0)
  })

  it('ensures every hover color differs from its base color', () => {
    const failures: string[] = []

    for (const [hoverToken, hoverValue] of tokens.entries()) {
      if (!hoverToken.endsWith('-hover')) {
        continue
      }

      const baseToken = hoverToken.slice(0, -'-hover'.length)
      const baseValue = tokens.get(baseToken)

      if (!baseValue) {
        continue
      }

      if (hoverValue === baseValue) {
        failures.push(`${hoverToken} must differ from ${baseToken} (${hoverValue})`)
      }
    }

    expect(failures, failures.join('\n')).toHaveLength(0)
  })

  it('ensures every inactive color differs from its base color', () => {
    const failures: string[] = []

    for (const [inactiveToken, inactiveValue] of tokens.entries()) {
      if (!inactiveToken.endsWith('-inactive')) {
        continue
      }

      const baseToken = inactiveToken.slice(0, -'-inactive'.length)
      const baseValue = tokens.get(baseToken)

      if (!baseValue) {
        continue
      }

      if (inactiveValue === baseValue) {
        failures.push(`${inactiveToken} must differ from ${baseToken} (${inactiveValue})`)
      }
    }

    expect(failures, failures.join('\n')).toHaveLength(0)
  })

  it('ensures every disabled color differs from its base color', () => {
    const failures: string[] = []

    for (const [disabledToken, disabledValue] of tokens.entries()) {
      if (!disabledToken.endsWith('-disabled')) {
        continue
      }

      const baseToken = disabledToken.slice(0, -'-disabled'.length)
      const baseValue = tokens.get(baseToken)

      if (!baseValue) {
        continue
      }

      if (disabledValue === baseValue) {
        failures.push(`${disabledToken} must differ from ${baseToken} (${disabledValue})`)
      }
    }

    expect(failures, failures.join('\n')).toHaveLength(0)
  })

  it('ensures state colors are pairwise distinct when multiple states exist', () => {
    const failures: string[] = []
    const tokenKeys = [...tokens.keys()]

    for (const token of tokenKeys) {
      if (STATE_SUFFIXES.some((suffix) => token.endsWith(suffix))) {
        continue
      }

      const stateEntries: Array<{ name: string; value: string }> = [{
        name: token,
        value: tokens.get(token) as string,
      }]

      for (const suffix of STATE_SUFFIXES) {
        const stateToken = `${token}${suffix}`
        const stateValue = tokens.get(stateToken)
        if (stateValue) {
          stateEntries.push({ name: stateToken, value: stateValue })
        }
      }

      for (let index = 0; index < stateEntries.length; index += 1) {
        for (let compareIndex = index + 1; compareIndex < stateEntries.length; compareIndex += 1) {
          const a = stateEntries[index]
          const b = stateEntries[compareIndex]
          if (a.value === b.value) {
            failures.push(`${a.name} and ${b.name} must not share the same color (${a.value})`)
          }
        }
      }
    }

    expect(failures, failures.join('\n')).toHaveLength(0)
  })

  it('ensures fill and text tokens never share the same color in interactive states', () => {
    const failures: string[] = []
    const bgBases = [...tokens.keys()]
      .filter((token) => token.endsWith('-bg'))
      .map((token) => token.slice(0, -'-bg'.length))

    let comparedPairCount = 0

    for (const base of bgBases) {
      const fgBaseToken = `${base}-fg`
      if (!tokens.has(fgBaseToken)) {
        continue
      }

      for (const state of VISUAL_STATE_SUFFIXES) {
        const bgToken = `${base}-bg${state}`
        const fgToken = `${base}-fg${state}`
        const bgValue = tokens.get(bgToken)
        const fgValue = tokens.get(fgToken)

        if (!bgValue || !fgValue) {
          continue
        }

        comparedPairCount += 1
        if (bgValue === fgValue) {
          failures.push(`${bgToken} and ${fgToken} must not share the same color (${bgValue})`)
        }
      }
    }

    expect(comparedPairCount, 'Expected at least one bg/fg interactive token pair to validate').toBeGreaterThan(0)
    expect(failures, failures.join('\n')).toHaveLength(0)
  })

  it('guards room slot hover against white-on-white regressions', () => {
    const content = fs.readFileSync(INDEX_CSS_PATH, 'utf-8')

    expect(
      content.includes('.house-screen .room-card li:not(.room-display-slot),'),
      'Expected generic room list-item rule to exclude .room-display-slot so hover colors are not overridden',
    ).toBe(true)

    expect(
      content.includes('.room-display-slot:hover {')
      && content.includes('background: var(--scheme-bg-hover);')
      && content.includes('color: var(--scheme-fg-hover);'),
      'Expected room-display-slot hover rule to explicitly set both background and text tokens',
    ).toBe(true)
  })
})