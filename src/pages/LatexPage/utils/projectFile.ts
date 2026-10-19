import { safeJSONParse } from '@chessviewer-org/chess-viewer';
import { type LatexProject, sanitizeProject } from './latexProject';

export const PROJECT_FILE_MAX_BYTES = 5 * 1024 * 1024;

export function serializeProject(project: LatexProject): string {
  return JSON.stringify(project, null, 2);
}

export function parseProjectFile(text: string): LatexProject | null {
  if (text.length > PROJECT_FILE_MAX_BYTES) return null;
  const parsed = safeJSONParse<unknown>(text, null);
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !Array.isArray((parsed as { positions?: unknown }).positions)
  ) {
    return null;
  }
  return sanitizeProject(parsed);
}
