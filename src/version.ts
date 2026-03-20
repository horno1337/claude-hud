import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

let _cached: string | undefined;
let _resolved = false;

export async function getClaudeCodeVersion(): Promise<string | undefined> {
  if (_resolved) return _cached;

  try {
    const { stdout } = await execFileAsync('claude', ['--version'], {
      timeout: 2000,
      encoding: 'utf8',
    });
    // Output: "2.1.77 (Claude Code)" — extract just the version number
    _cached = stdout.trim().split(' ')[0] || undefined;
  } catch {
    _cached = undefined;
  }

  _resolved = true;
  return _cached;
}

/** Reset cache — for testing only */
export function _resetVersionCache(): void {
  _cached = undefined;
  _resolved = false;
}
