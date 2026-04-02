import * as vscode from 'vscode';
import {
  SectionType,
  SurgeSection,
  parseSections,
  isCommentLine,
  isDirectiveLine,
  isBlankLine,
  isSectionHeader,
} from './parser';

// Allows wildcard `*` prefix for Host entries like *.domain
const KEY_VALUE_RE = /^(\s*)([*\w\-][*\w\-.\s]*?)\s*=\s*(.*)$/;

function shouldNormalizeKeyValue(type: SectionType): boolean {
  return [
    SectionType.KeyValue,
    SectionType.ProxyDef,
    SectionType.ProxyGroup,
    SectionType.Script,
    SectionType.Panel,
    SectionType.Host,
  ].includes(type);
}

function shouldNormalizeCommas(type: SectionType): boolean {
  return [
    SectionType.KeyValue,
    SectionType.ProxyDef,
    SectionType.ProxyGroup,
    SectionType.Script,
  ].includes(type);
}

function isContentLine(line: string): boolean {
  return !isCommentLine(line) && !isDirectiveLine(line) && !isBlankLine(line);
}

// Normalize "key=value" or "key  =  value" to "key = value"
function normalizeKeyValue(line: string): string {
  const match = KEY_VALUE_RE.exec(line);
  if (!match) {
    return line;
  }
  const [, indent, key, value] = match;
  return `${indent}${key.trimEnd()} = ${value.trimStart()}`;
}

// Normalize comma spacing in the value portion (after first =), respecting quoted strings
function normalizeCommas(line: string): string {
  const eqIndex = line.indexOf('=');
  if (eqIndex === -1) {
    return line;
  }
  const before = line.slice(0, eqIndex + 1);
  const after = line.slice(eqIndex + 1);
  // Replace commas outside of quoted strings and parenthesized groups
  const normalized = after.replace(/(\"[^\"]*\"|'[^']*'|\([^)]*\)|\{[^}]*\})|,\s*/g, (match, quoted) => {
    return quoted ? quoted : ', ';
  });
  return before + normalized;
}

export class SurgeFormatter
  implements
    vscode.DocumentFormattingEditProvider,
    vscode.DocumentRangeFormattingEditProvider
{
  provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    _options: vscode.FormattingOptions
  ): vscode.TextEdit[] {
    const text = document.getText();
    const sections = parseSections(text);
    const lines = text.split('\n');
    const edits: vscode.TextEdit[] = [];

    // Pass 1 & 2: Normalize key=value spacing and commas within sections
    for (const section of sections) {
      const normalizeKV = shouldNormalizeKeyValue(section.type);
      const normalizeC = shouldNormalizeCommas(section.type);
      if (section.type === SectionType.Rewrite) {
        continue;
      }

      for (let i = section.startLine + 1; i <= section.endLine && i < lines.length; i++) {
        const line = lines[i];
        if (!isContentLine(line) || isSectionHeader(line)) {
          continue;
        }

        let updated = line;
        if (normalizeKV) {
          updated = normalizeKeyValue(updated);
        }
        if (normalizeC && updated.includes('=')) {
          updated = normalizeCommas(updated);
        }

        if (updated !== line) {
          const range = new vscode.Range(i, 0, i, line.length);
          edits.push(vscode.TextEdit.replace(range, updated));
          lines[i] = updated;
        }
      }
    }

    // Pass 3: Normalize blank lines
    this.normalizeBlankLines(lines, sections, edits);

    return edits;
  }

  provideDocumentRangeFormattingEdits(
    document: vscode.TextDocument,
    range: vscode.Range,
    options: vscode.FormattingOptions
  ): vscode.TextEdit[] {
    const allEdits = this.provideDocumentFormattingEdits(document, options);
    return allEdits.filter((edit) => range.intersection(edit.range) !== undefined);
  }

  private normalizeBlankLines(
    lines: string[],
    sections: SurgeSection[],
    edits: vscode.TextEdit[]
  ): void {
    const linesToDelete: Set<number> = new Set();

    // Handle blank lines before first section (preamble area)
    if (sections.length > 0 && sections[0].startLine > 0) {
      const firstStart = sections[0].startLine;
      let blankStart = firstStart - 1;
      while (blankStart >= 0 && isBlankLine(lines[blankStart])) {
        blankStart--;
      }
      blankStart++;
      const blankCount = firstStart - blankStart;
      if (blankCount > 1) {
        for (let i = blankStart + 1; i < firstStart; i++) {
          linesToDelete.add(i);
        }
      }
    }

    // Ensure exactly one blank line between sections
    for (let s = 1; s < sections.length; s++) {
      const prevEnd = sections[s - 1].endLine;
      const currStart = sections[s].startLine;

      let blankStart = currStart - 1;
      while (blankStart > prevEnd && isBlankLine(lines[blankStart])) {
        blankStart--;
      }
      blankStart++;

      const blankCount = currStart - blankStart;

      if (blankCount === 1) {
        continue;
      } else if (blankCount === 0) {
        edits.push(vscode.TextEdit.insert(new vscode.Position(currStart, 0), '\n'));
      } else {
        for (let i = blankStart + 1; i < currStart; i++) {
          linesToDelete.add(i);
        }
      }
    }

    // Collapse multiple consecutive blank lines within sections
    for (const section of sections) {
      let consecutiveBlanks = 0;
      for (let i = section.startLine + 1; i <= section.endLine && i < lines.length; i++) {
        if (isBlankLine(lines[i])) {
          consecutiveBlanks++;
          if (consecutiveBlanks > 1) {
            linesToDelete.add(i);
          }
        } else {
          consecutiveBlanks = 0;
        }
      }
    }

    // Remove trailing blank lines at end of file (keep one final newline)
    let lastNonBlank = lines.length - 1;
    while (lastNonBlank >= 0 && isBlankLine(lines[lastNonBlank])) {
      lastNonBlank--;
    }
    for (let i = lastNonBlank + 2; i < lines.length; i++) {
      linesToDelete.add(i);
    }

    // Apply deletions bottom-to-top so line numbers stay stable
    const sortedDeletes = Array.from(linesToDelete).sort((a, b) => b - a);
    for (const lineNum of sortedDeletes) {
      if (lineNum < lines.length) {
        const startPos = lineNum > 0
          ? new vscode.Position(lineNum - 1, lines[lineNum - 1].length)
          : new vscode.Position(lineNum, 0);
        const endPos = new vscode.Position(lineNum, lines[lineNum].length);
        edits.push(vscode.TextEdit.delete(new vscode.Range(startPos, endPos)));
      }
    }
  }
}
