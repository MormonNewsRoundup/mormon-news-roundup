/**
 * Build one Eastern Time edition and, on GitHub Actions, commit it to main
 * after npm run check-feed passes.
 *
 * GEMINI_API_KEY is required unless CURATE_OFFLINE=1.
 * CURATE_EDITION=midnight|noon forces that edition (workflow_dispatch).
 * CURATE_DRY_RUN=true writes the job summary and does not commit.
 * CURATE_REDDIT_IMAGES defaults on. Set it to 0 to skip Reddit items.
 */
import { appendFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { commitPublished, curate, restoreFeed } from './curate/run.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function runCheck() {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'check-feed'], { cwd: repoRoot, stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error('npm run check-feed failed'));
    });
  });
}

export async function main() {
  const edition = process.env.CURATE_EDITION || '';
  const result = await curate({
    edition: edition === 'midnight' || edition === 'noon' ? edition : undefined,
    dryRun: ['1', 'true', 'yes'].includes(String(process.env.CURATE_DRY_RUN || '').toLowerCase()),
  });
  console.log(result.summary || result.action);
  if (process.env.CURATE_DECIDE_ONLY === '1' && process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `publish=${result.action === 'due' ? 'true' : 'false'}\n`);
  }
  if (result.action !== 'published') return result;
  if (path.resolve(result.writeRoot) !== repoRoot) return result;
  try {
    await runCheck();
  } catch (error) {
    await restoreFeed(repoRoot);
    throw error;
  }
  if (process.env.GITHUB_ACTIONS === 'true' || process.env.CURATE_COMMIT === '1') {
    await commitPublished(result);
  } else {
    console.log('Feed files are updated in the working tree. Nothing was committed.');
  }
  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}
