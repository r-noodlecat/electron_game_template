import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');

// Resolve a markdown link href relative to the file it appears in.
function resolveLink(from: string, href: string): string {
  return path.resolve(path.dirname(from), href);
}

// Extract all relative markdown links from a file's content.
// Skips anchors (#), absolute URLs (http/https), and mailto links.
function extractLinks(content: string): string[] {
  const re = /\[.*?\]\(([^)]+)\)/g;
  const links: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const href = m[1].split('#')[0].trim(); // strip anchor fragments
    if (!href || href.startsWith('http') || href.startsWith('mailto:')) continue;
    links.push(href);
  }
  return links;
}

// Collect all .md files under a directory recursively.
function collectMdFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMdFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

const DOCS_DIR = path.join(ROOT, 'docs');
const GITHUB_DIR = path.join(ROOT, '.github');
const COPILOT_INSTRUCTIONS = path.join(GITHUB_DIR, 'copilot-instructions.md');
const INSTRUCTIONS_DIR = path.join(GITHUB_DIR, 'instructions');

const docFiles = collectMdFiles(DOCS_DIR);
const githubFiles = collectMdFiles(GITHUB_DIR);
const allMdFiles = [...docFiles, ...githubFiles];

// Docs that are intentionally user-facing guides rather than enforced convention
// documents. They do not require a corresponding .instructions.md file and are
// not expected to be referenced in copilot-instructions.md.
//
// To add a new exclusion, append an entry below with a comment explaining why it
// is intentionally excluded from the active instructions system.
const GUIDE_ONLY_DOCS: Map<string, string> = new Map([
  // Developer prompt cheat sheet — tips for prompting Copilot, not a convention
  // doc. Has no corresponding .instructions.md and is not wired into code gen.
  ['COPILOT_TIPS.md', 'Developer prompt cheat sheet; not an enforced convention'],
]);

// ─── 1. Broken relative links ────────────────────────────────────────────────

describe('markdown links: no broken relative paths', () => {
  for (const file of allMdFiles) {
    const rel = path.relative(ROOT, file);
    it(`${rel} — all relative links resolve`, () => {
      const content = fs.readFileSync(file, 'utf-8');
      const broken: string[] = [];
      for (const href of extractLinks(content)) {
        const target = resolveLink(file, href);
        if (!fs.existsSync(target)) {
          broken.push(`  ${href}  →  ${path.relative(ROOT, target)}`);
        }
      }
      expect(broken, `Broken links:\n${broken.join('\n')}`).toHaveLength(0);
    });
  }
});

// ─── 2. copilot-instructions.md references every docs/ file ──────────────────

describe('copilot-instructions.md: references every docs/ file', () => {
  it('exists', () => {
    expect(fs.existsSync(COPILOT_INSTRUCTIONS), `Missing: .github/copilot-instructions.md`).toBe(true);
  });

  if (fs.existsSync(COPILOT_INSTRUCTIONS)) {
    const copilotContent = fs.readFileSync(COPILOT_INSTRUCTIONS, 'utf-8');

    for (const docFile of docFiles) {
      const docName = path.basename(docFile);
      if (GUIDE_ONLY_DOCS.has(docName)) continue;
      it(`references docs/${docName}`, () => {
        expect(
          copilotContent.includes(docName),
          `docs/${docName} is not mentioned in .github/copilot-instructions.md`,
        ).toBe(true);
      });
    }
  }
});

// ─── 3. instructions files reference real docs/ files ────────────────────────

describe('.github/instructions/: each file only links to real targets', () => {
  const instructionsFiles = fs.existsSync(INSTRUCTIONS_DIR)
    ? fs.readdirSync(INSTRUCTIONS_DIR)
      .filter((f) => f.endsWith('.md'))
      .map((f) => path.join(INSTRUCTIONS_DIR, f))
    : [];

  it('instructions directory is not empty', () => {
    expect(instructionsFiles.length).toBeGreaterThan(0);
  });

  for (const file of instructionsFiles) {
    const rel = path.relative(ROOT, file);
    it(`${rel} — all relative links resolve`, () => {
      const content = fs.readFileSync(file, 'utf-8');
      const broken: string[] = [];
      for (const href of extractLinks(content)) {
        const target = resolveLink(file, href);
        if (!fs.existsSync(target)) {
          broken.push(`  ${href}  →  ${path.relative(ROOT, target)}`);
        }
      }
      expect(broken, `Broken links:\n${broken.join('\n')}`).toHaveLength(0);
    });
  }
});

// ─── 4. Every docs/ file is referenced by at least one instructions file ─────

describe('docs/ coverage: each doc is referenced by an instructions file', () => {
  const instructionsFiles = fs.existsSync(INSTRUCTIONS_DIR)
    ? fs.readdirSync(INSTRUCTIONS_DIR)
      .filter((f) => f.endsWith('.md'))
      .map((f) => fs.readFileSync(path.join(INSTRUCTIONS_DIR, f), 'utf-8'))
    : [];

  const combinedInstructions = instructionsFiles.join('\n');

  for (const docFile of docFiles) {
    const docName = path.basename(docFile);
    if (GUIDE_ONLY_DOCS.has(docName)) continue; // see GUIDE_ONLY_DOCS above
    it(`docs/${docName} is referenced by at least one .instructions.md`, () => {
      expect(
        combinedInstructions.includes(docName),
        `docs/${docName} is not referenced in any .github/instructions/ file`,
      ).toBe(true);
    });
  }
});

// ─── 5. Every .instructions.md has valid YAML frontmatter ────────────────────
// VS Code silently ignores instructions files with missing or malformed
// frontmatter. This suite ensures every file activates as intended.

// Extract the YAML frontmatter block from a file's content, if present.
function parseFrontmatter(content: string): Record<string, string> | null {
  if (!content.startsWith('---')) return null;
  const end = content.indexOf('\n---', 3);
  if (end === -1) return null;
  const block = content.slice(4, end);
  const result: Record<string, string> = {};
  for (const line of block.split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim().replace(/^["']|["']$/g, '');
    if (key) result[key] = value;
  }
  return result;
}

describe('.github/instructions/: frontmatter is valid and complete', () => {
  const instructionsFiles = fs.existsSync(INSTRUCTIONS_DIR)
    ? fs.readdirSync(INSTRUCTIONS_DIR)
      .filter((f) => f.endsWith('.md'))
      .map((f) => path.join(INSTRUCTIONS_DIR, f))
    : [];

  for (const file of instructionsFiles) {
    const rel = path.relative(ROOT, file);

    it(`${rel} — has YAML frontmatter`, () => {
      const content = fs.readFileSync(file, 'utf-8');
      const fm = parseFrontmatter(content);
      expect(fm, `${rel} is missing a --- frontmatter block`).not.toBeNull();
    });

    it(`${rel} — frontmatter has a non-empty description`, () => {
      const content = fs.readFileSync(file, 'utf-8');
      const fm = parseFrontmatter(content);
      expect(
        fm?.['description']?.length ?? 0,
        `${rel} frontmatter is missing a 'description' field`,
      ).toBeGreaterThan(0);
    });

    it(`${rel} — frontmatter description is at least 10 characters`, () => {
      const content = fs.readFileSync(file, 'utf-8');
      const fm = parseFrontmatter(content);
      expect(
        fm?.['description']?.length ?? 0,
        `${rel} frontmatter 'description' is too short — provide a meaningful summary`,
      ).toBeGreaterThanOrEqual(10);
    });

    it(`${rel} — frontmatter has a non-empty applyTo`, () => {
      const content = fs.readFileSync(file, 'utf-8');
      const fm = parseFrontmatter(content);
      expect(
        fm?.['applyTo']?.length ?? 0,
        `${rel} frontmatter is missing an 'applyTo' field — VS Code will not activate it correctly`,
      ).toBeGreaterThan(0);
    });

    it(`${rel} — frontmatter applyTo looks like a glob pattern`, () => {
      const content = fs.readFileSync(file, 'utf-8');
      const fm = parseFrontmatter(content);
      const applyTo = fm?.['applyTo'] ?? '';
      const looksLikeGlob = applyTo.includes('*') || applyTo.includes('/') || applyTo.includes('{');
      expect(
        looksLikeGlob,
        `${rel} frontmatter 'applyTo' — "${applyTo}" does not look like a valid glob pattern`,
      ).toBe(true);
    });
  }
});

// ─── 7. copilot-instructions.md references every .instructions.md file ─────────
// Ensures the workspace hub stays in sync when new instruction files are added.
// Add an entry to INSTRUCTIONS_ONLY_FILES when a file is intentionally omitted.

// Instruction files that are intentionally not referenced in copilot-instructions.md.
// (None at this time — all project instruction files should be listed.)
const INSTRUCTIONS_ONLY_FILES: Map<string, string> = new Map([]);

describe('copilot-instructions.md: references every .instructions.md file', () => {
  if (fs.existsSync(COPILOT_INSTRUCTIONS)) {
    const copilotContent = fs.readFileSync(COPILOT_INSTRUCTIONS, 'utf-8');

    const instructionsFiles = fs.existsSync(INSTRUCTIONS_DIR)
      ? fs.readdirSync(INSTRUCTIONS_DIR).filter((f) => f.endsWith('.instructions.md'))
      : [];

    it('instructions directory is not empty', () => {
      expect(instructionsFiles.length).toBeGreaterThan(0);
    });

    for (const filename of instructionsFiles) {
      if (INSTRUCTIONS_ONLY_FILES.has(filename)) continue;
      it(`references .github/instructions/${filename}`, () => {
        expect(
          copilotContent.includes(filename),
          `${filename} is not mentioned in .github/copilot-instructions.md`,
        ).toBe(true);
      });
    }
  }
});

// ─── 6. Every .instructions.md filename follows kebab-case convention ─────────
// VS Code discovers instruction files by directory scan. Inconsistent naming
// (underscores, mixed case) causes confusion and breaks convention checks.

describe('.github/instructions/: filenames follow kebab-case.instructions.md pattern', () => {
  const VALID_INSTRUCTIONS_FILENAME = /^[a-z][a-z0-9-]*\.instructions\.md$/;

  const instructionsFiles = fs.existsSync(INSTRUCTIONS_DIR)
    ? fs.readdirSync(INSTRUCTIONS_DIR).filter((f) => f.endsWith('.md'))
    : [];

  it('instructions directory is not empty', () => {
    expect(instructionsFiles.length).toBeGreaterThan(0);
  });

  for (const filename of instructionsFiles) {
    it(`${filename} — matches kebab-case.instructions.md pattern`, () => {
      expect(
        VALID_INSTRUCTIONS_FILENAME.test(filename),
        `"${filename}" does not follow the required kebab-case.instructions.md naming pattern`,
      ).toBe(true);
    });
  }
});
