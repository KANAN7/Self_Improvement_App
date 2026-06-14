/**
 * Tiny Markdown renderer for chat replies.
 *
 * Supports just what Claude actually emits in our prompts:
 *   - **bold**, *italic* (and _italic_)
 *   - `- ` or `* ` bullet lists
 *   - blank-line paragraph breaks
 *
 * Not a general markdown engine. No links, no code blocks, no headings,
 * no tables. Calm-by-design — anything more complex is a prompt smell, not
 * a feature gap.
 */

import type { ReactNode } from 'react';
import type { TextStyle } from 'react-native';
import { View } from 'react-native';

import { Text } from '@/components/Text';
import { spacing } from '@/theme';

type MarkdownProps = {
  text: string;
  /** Color applied to plain text. Bold/italic inherit it. */
  color?: React.ComponentProps<typeof Text>['color'];
};

export function Markdown({ text, color = 'textPrimary' }: MarkdownProps) {
  const blocks = parseBlocks(text);
  return (
    <View style={{ gap: spacing.sm }}>
      {blocks.map((block, blockIdx) => {
        if (block.kind === 'paragraph') {
          return (
            <Text key={blockIdx} variant="body" color={color} style={{ lineHeight: 24 }}>
              {renderInline(block.text)}
            </Text>
          );
        }
        // bullet list
        return (
          <View key={blockIdx} style={{ gap: spacing.xs }}>
            {block.items.map((item, itemIdx) => (
              <View
                key={itemIdx}
                style={{ flexDirection: 'row', gap: spacing.sm }}
              >
                <Text variant="body" color={color} style={{ lineHeight: 24 }}>
                  •
                </Text>
                <Text
                  variant="body"
                  color={color}
                  style={{ flex: 1, lineHeight: 24 }}
                >
                  {renderInline(item)}
                </Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Block parsing: split into paragraphs and bullet lists.
// ---------------------------------------------------------------------------

type Block =
  | { kind: 'paragraph'; text: string }
  | { kind: 'bullets'; items: string[] };

function parseBlocks(text: string): Block[] {
  const lines = text.split(/\r?\n/);
  const blocks: Block[] = [];
  let paragraphLines: string[] = [];
  let bullets: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    blocks.push({
      kind: 'paragraph',
      text: paragraphLines.join(' ').trim(),
    });
    paragraphLines = [];
  };
  const flushBullets = () => {
    if (bullets.length === 0) return;
    blocks.push({ kind: 'bullets', items: bullets });
    bullets = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    const bulletMatch = line.match(/^(?:[-*])\s+(.*)$/);
    if (bulletMatch && bulletMatch[1] !== undefined) {
      flushParagraph();
      bullets.push(bulletMatch[1]);
      continue;
    }
    if (line === '') {
      flushParagraph();
      flushBullets();
      continue;
    }
    flushBullets();
    paragraphLines.push(line);
  }
  flushParagraph();
  flushBullets();
  return blocks;
}

// ---------------------------------------------------------------------------
// Inline parsing: bold, italic, plain.
// ---------------------------------------------------------------------------

function renderInline(text: string): ReactNode[] {
  // Tokenize on **...** first (bold), then *...* / _..._ (italic). Anything
  // left is plain text. Order matters because `**foo**` would otherwise be
  // matched as italic-italic.
  const tokens = tokenize(text);
  return tokens.map((token, i) => {
    const style: TextStyle = {};
    if (token.bold) style.fontWeight = '600';
    if (token.italic) style.fontStyle = 'italic';
    return (
      <Text key={i} style={style}>
        {token.text}
      </Text>
    );
  });
}

type Token = { text: string; bold: boolean; italic: boolean };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    // Bold: **...**
    if (input[i] === '*' && input[i + 1] === '*') {
      const end = input.indexOf('**', i + 2);
      if (end !== -1) {
        const inner = input.slice(i + 2, end);
        // Recurse to support italic inside bold (rare but tidy).
        for (const t of tokenize(inner)) tokens.push({ ...t, bold: true });
        i = end + 2;
        continue;
      }
    }
    // Italic: *...* (single asterisk, not part of **). The lookahead avoids
    // matching the second `*` of `**`.
    if (input[i] === '*' && input[i + 1] !== '*') {
      const end = findClosing(input, i + 1, '*');
      if (end !== -1) {
        const inner = input.slice(i + 1, end);
        tokens.push({ text: inner, bold: false, italic: true });
        i = end + 1;
        continue;
      }
    }
    // Italic: _..._ (only when wrapped by non-word boundaries to avoid
    // breaking snake_case strings)
    if (
      input[i] === '_' &&
      (i === 0 || /[\s.,!?:;(\[]/.test(input[i - 1] ?? ''))
    ) {
      const end = findClosing(input, i + 1, '_');
      if (
        end !== -1 &&
        (end === input.length - 1 || /[\s.,!?:;)\]]/.test(input[end + 1] ?? ''))
      ) {
        const inner = input.slice(i + 1, end);
        tokens.push({ text: inner, bold: false, italic: true });
        i = end + 1;
        continue;
      }
    }
    // Plain text: scan to next marker or end.
    let j = i + 1;
    while (j < input.length && input[j] !== '*' && input[j] !== '_') j += 1;
    tokens.push({ text: input.slice(i, j), bold: false, italic: false });
    i = j;
  }
  // Coalesce neighboring identically-styled tokens for fewer Text nodes.
  return coalesce(tokens);
}

function findClosing(input: string, from: number, char: string): number {
  for (let k = from; k < input.length; k += 1) {
    if (input[k] === char && input[k - 1] !== '\\') return k;
  }
  return -1;
}

function coalesce(tokens: Token[]): Token[] {
  const out: Token[] = [];
  for (const t of tokens) {
    const prev = out[out.length - 1];
    if (prev && prev.bold === t.bold && prev.italic === t.italic) {
      prev.text += t.text;
    } else {
      out.push({ ...t });
    }
  }
  return out;
}
