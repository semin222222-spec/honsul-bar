import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const SRC_ROOT = path.join(PROJECT_ROOT, "src");
const SOURCE_EXTENSIONS = new Set([".js", ".jsx"]);
const RESOLVABLE_EXTENSIONS = [
  ".js",
  ".jsx",
  ".css",
  ".png",
  ".svg",
  ".jpg",
  ".jpeg",
  ".webp",
  ".woff2",
];

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return listFiles(fullPath);
      return [fullPath];
    }),
  );
  return files.flat();
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveLocalImport(specifier, fromFile) {
  const basePath = specifier.startsWith("@/")
    ? path.join(SRC_ROOT, specifier.slice(2))
    : path.resolve(path.dirname(fromFile), specifier);

  if (await exists(basePath)) return basePath;

  for (const ext of RESOLVABLE_EXTENSIONS) {
    if (await exists(`${basePath}${ext}`)) return `${basePath}${ext}`;
  }

  for (const ext of SOURCE_EXTENSIONS) {
    const indexPath = path.join(basePath, `index${ext}`);
    if (await exists(indexPath)) return indexPath;
  }

  return null;
}

function getImportSpecifiers(source) {
  const specifiers = [];
  const code = stripFullLineComments(source);
  const patterns = [
    /import\s+[^'"]*?from\s+["']([^"']+)["']/g,
    /import\s+["']([^"']+)["']/g,
    /export\s+[^'"]*?from\s+["']([^"']+)["']/g,
    /import\(\s*["']([^"']+)["']\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of code.matchAll(pattern)) {
      specifiers.push(match[1]);
    }
  }
  return specifiers;
}

function stripFullLineComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

async function getSourceFiles() {
  const files = await listFiles(SRC_ROOT);
  return files.filter((file) => SOURCE_EXTENSIONS.has(path.extname(file)));
}

function toRelative(filePath) {
  return path.relative(PROJECT_ROOT, filePath);
}

describe("source architecture", () => {
  it("모든 src JS/JSX 파일은 현재 레이어 디렉터리 안에 있다", async () => {
    const allowedRoots = new Set([
      "src/app",
      "src/features",
      "src/pages",
      "src/repositories",
      "src/services",
      "src/shared",
    ]);
    const files = await getSourceFiles();

    const invalid = files
      .map(toRelative)
      .filter(
        (file) =>
          ![...allowedRoots].some(
            (root) => file === root || file.startsWith(`${root}/`),
          ),
      );

    assert.deepEqual(invalid, []);
  });

  it("모든 로컬 import 경로가 실제 파일로 해석된다", async () => {
    const files = await getSourceFiles();
    const failures = [];

    for (const file of files) {
      const source = await readFile(file, "utf8");
      for (const specifier of getImportSpecifiers(source)) {
        const isLocal = specifier.startsWith(".") || specifier.startsWith("@/");
        if (!isLocal) continue;

        const resolved = await resolveLocalImport(specifier, file);
        if (!resolved) failures.push(`${toRelative(file)} -> ${specifier}`);
      }
    }

    assert.deepEqual(failures, []);
  });

  it("Supabase client 직접 사용은 repository와 shared/api로 제한된다", async () => {
    const files = await getSourceFiles();
    const violations = [];

    for (const file of files) {
      const relative = toRelative(file);
      const allowed =
        relative.startsWith("src/repositories/") ||
        relative === "src/shared/api/supabaseClient.js" ||
        relative === "src/shared/realtime/realtimeHealth.js";
      const source = await readFile(file, "utf8");
      const usesSupabaseClient =
        source.includes("@/shared/api/supabaseClient") ||
        source.includes("@supabase/supabase-js") ||
        /\bsupabase\./.test(source);

      if (usesSupabaseClient && !allowed) violations.push(relative);
    }

    assert.deepEqual(violations, []);
  });

  it("repository 레이어는 UI 레이어를 import하지 않는다", async () => {
    const files = (await getSourceFiles()).filter((file) =>
      toRelative(file).startsWith("src/repositories/"),
    );
    const violations = [];

    for (const file of files) {
      const source = await readFile(file, "utf8");
      const forbiddenImports = getImportSpecifiers(source).filter(
        (specifier) =>
          specifier.startsWith("@/features/") ||
          specifier.startsWith("@/pages/") ||
          specifier.startsWith("@/app/"),
      );
      if (forbiddenImports.length > 0) {
        violations.push(
          `${toRelative(file)} -> ${forbiddenImports.join(", ")}`,
        );
      }
    }

    assert.deepEqual(violations, []);
  });
});
