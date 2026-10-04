import { readdir } from "node:fs/promises";
import path from "node:path";

// Lists every file the build wrote to .next/static, so the service worker can save all of
// them on the first visit. That includes chunks no page links to, like the handoff's code,
// which only loads once the handoff opens. Built once at build time, then served as a file.
export const dynamic = "force-static";

async function filesIn(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? filesIn(full) : Promise.resolve([full]);
    }),
  );
  return nested.flat();
}

export async function GET() {
  const root = path.join(process.cwd(), ".next", "static");
  const files = await filesIn(root).catch(() => []);
  return Response.json(files.map((file) => `/_next/static/${path.relative(root, file).split(path.sep).join("/")}`));
}
