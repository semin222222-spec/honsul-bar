import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const REPOSITORY_ROOT = path.join(PROJECT_ROOT, "src/repositories");

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

function toRelative(filePath) {
  return path.relative(PROJECT_ROOT, filePath);
}

describe("repository contract", () => {
  it("모든 repository 파일은 도메인 repository 객체를 export한다", async () => {
    const files = (await listFiles(REPOSITORY_ROOT)).filter((file) =>
      file.endsWith(".js"),
    );
    const missingExports = [];

    for (const file of files) {
      const source = await readFile(file, "utf8");
      if (!/export\s+const\s+\w+Repository\s*=/.test(source)) {
        missingExports.push(toRelative(file));
      }
    }

    assert.deepEqual(missingExports, []);
  });

  it("Supabase 사용 repository는 공통 client만 import한다", async () => {
    const files = (await listFiles(REPOSITORY_ROOT)).filter((file) =>
      file.endsWith(".js"),
    );
    const violations = [];

    for (const file of files) {
      const source = await readFile(file, "utf8");
      const importsSupabasePackage = source.includes("@supabase/supabase-js");
      const importsSharedClient = source.includes(
        "@/shared/api/supabaseClient",
      );
      if (importsSupabasePackage || !importsSharedClient) {
        violations.push(toRelative(file));
      }
    }

    assert.deepEqual(violations, []);
  });

  it("Realtime subscribe 함수는 cleanup 함수를 반환한다", async () => {
    const files = (await listFiles(REPOSITORY_ROOT)).filter((file) =>
      file.endsWith(".js"),
    );
    const violations = [];

    for (const file of files) {
      const source = await readFile(file, "utf8");
      if (!source.includes("subscribeTo")) continue;
      // 허용 패턴:
      //   1) 직접 채널 생성 후 cleanup 반환: return () => supabase.removeChannel(channel)
      //   2) 공유 채널 헬퍼 사용(헬퍼 내부에서 ref-count cleanup 반환): return subscribeShared(
      const hasDirectCleanup =
        /return\s+\(\)\s*=>\s*supabase\.removeChannel\(channel\)/.test(source);
      const usesSharedHelper = /return\s+subscribeShared\(/.test(source);
      if (!hasDirectCleanup && !usesSharedHelper) {
        violations.push(toRelative(file));
      }
    }

    assert.deepEqual(violations, []);
  });
});
