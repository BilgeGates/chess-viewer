export type LatexTokenKind = 'command' | 'key' | 'bracket' | 'text';

export interface LatexToken {
  kind: LatexTokenKind;
  text: string;
  start: number;
}

const TOKEN_PATTERN =
  /(\\[A-Za-z@]+\*?|\\[^A-Za-z\s])|([A-Za-z]+)(?==)|([{}[\]])/g;

export function tokenizeLatexLine(line: string): LatexToken[] {
  const tokens: LatexToken[] = [];
  let cursor = 0;

  for (const match of line.matchAll(TOKEN_PATTERN)) {
    const start = match.index;
    if (start > cursor) {
      tokens.push({
        kind: 'text',
        text: line.slice(cursor, start),
        start: cursor
      });
    }
    const kind: LatexTokenKind = match[1]
      ? 'command'
      : match[2]
        ? 'key'
        : 'bracket';
    tokens.push({ kind, text: match[0], start });
    cursor = start + match[0].length;
  }

  if (cursor < line.length) {
    tokens.push({ kind: 'text', text: line.slice(cursor), start: cursor });
  }
  return tokens;
}
