export enum SectionType {
  KeyValue,
  ProxyDef,
  ProxyGroup,
  Rule,
  Host,
  Rewrite,
  Script,
  Panel,
  SSIDSetting,
  PortForwarding,
  Unknown,
}

export interface SurgeSection {
  name: string;
  type: SectionType;
  startLine: number;
  endLine: number;
}

const SECTION_HEADER_RE = /^\s*\[([\w][\w\s\-]*)\]\s*$/;

const SECTION_TYPE_MAP: Record<string, SectionType> = {
  'general': SectionType.KeyValue,
  'mitm': SectionType.KeyValue,
  'keystore': SectionType.KeyValue,
  'replica': SectionType.KeyValue,
  'proxy': SectionType.ProxyDef,
  'proxy group': SectionType.ProxyGroup,
  'rule': SectionType.Rule,
  'host': SectionType.Host,
  'url rewrite': SectionType.Rewrite,
  'header rewrite': SectionType.Rewrite,
  'body rewrite': SectionType.Rewrite,
  'map local': SectionType.Rewrite,
  'script': SectionType.Script,
  'panel': SectionType.Panel,
  'ssid setting': SectionType.SSIDSetting,
  'port forwarding': SectionType.PortForwarding,
};

// Prefixes for parameterized sections like [Ruleset MySet], [WireGuard HomeVPN]
const PREFIX_TYPE_MAP: Array<[string, SectionType]> = [
  ['ruleset', SectionType.Rule],
  ['wireguard', SectionType.KeyValue],
];

export function getSectionType(name: string): SectionType {
  const lower = name.toLowerCase().trim();
  const exact = SECTION_TYPE_MAP[lower];
  if (exact !== undefined) {
    return exact;
  }

  for (const [prefix, type] of PREFIX_TYPE_MAP) {
    if (lower === prefix || lower.startsWith(prefix + ' ')) {
      return type;
    }
  }

  return SectionType.Unknown;
}

export function isCommentLine(line: string): boolean {
  const trimmed = line.trimStart();
  if (trimmed.startsWith('#!')) {
    return false;
  }
  return trimmed.startsWith('#') || trimmed.startsWith(';') || trimmed.startsWith('//');
}

export function isDirectiveLine(line: string): boolean {
  return line.trimStart().startsWith('#!');
}

export function isBlankLine(line: string): boolean {
  return line.trim().length === 0;
}

export function isSectionHeader(line: string): boolean {
  return SECTION_HEADER_RE.test(line);
}

export function parseSections(text: string): SurgeSection[] {
  const lines = text.split('\n');
  const sections: SurgeSection[] = [];

  for (let i = 0; i < lines.length; i++) {
    const match = SECTION_HEADER_RE.exec(lines[i]);
    if (match) {
      if (sections.length > 0) {
        sections[sections.length - 1].endLine = i - 1;
      }
      sections.push({
        name: match[1],
        type: getSectionType(match[1]),
        startLine: i,
        endLine: lines.length - 1,
      });
    }
  }

  return sections;
}
