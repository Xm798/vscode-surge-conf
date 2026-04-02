import * as vscode from 'vscode';
import { parseSections, SectionType, SurgeSection } from './parser';

const SECTION_NAMES = [
  'General', 'Proxy', 'Proxy Group', 'Rule', 'Host',
  'URL Rewrite', 'Header Rewrite', 'Body Rewrite', 'Map Local',
  'Script', 'Panel', 'SSID Setting', 'Port Forwarding', 'Keystore', 'MITM',
];

const RULE_TYPES = [
  'DOMAIN', 'DOMAIN-SUFFIX', 'DOMAIN-KEYWORD', 'DOMAIN-SET',
  'IP-CIDR', 'IP-CIDR6', 'GEOIP', 'IP-ASN',
  'USER-AGENT', 'URL-REGEX', 'PROCESS-NAME',
  'DEST-PORT', 'IN-PORT', 'SRC-PORT', 'SRC-IP',
  'SUBNET', 'PROTOCOL', 'HOSTNAME-TYPE', 'CELLULAR-RADIO',
  'DEVICE-NAME', 'MAC-ADDRESS', 'RULE-SET',
  'AND', 'OR', 'NOT', 'FINAL', 'SCRIPT',
];

const BUILT_IN_POLICIES = [
  'DIRECT', 'REJECT', 'REJECT-TINYGIF', 'REJECT-DROP', 'REJECT-NO-DROP',
];

const PROXY_PROTOCOLS = [
  'http', 'https', 'socks5', 'socks5-tls', 'snell',
  'ss', 'vmess', 'trojan', 'tuic', 'hysteria2', 'anytls', 'ssh', 'wireguard',
];

const GROUP_TYPES = [
  'select', 'url-test', 'fallback', 'load-balance', 'subnet', 'smart',
];

const DIRECTIVES = [
  '#!MANAGED-CONFIG', '#!include', '#!name=', '#!desc=', '#!system=',
  '#!arguments=', '#!requirement=', '#!IOS-ONLY', '#!MACOS-ONLY',
  '#!TVOS-ONLY', '#!FORBIDDEN-AUTO-UPGRADE',
];

const GENERAL_KEYS = [
  'loglevel', 'dns-server', 'doh-server', 'skip-proxy', 'ipv6',
  'test-timeout', 'internet-test-url', 'proxy-test-url',
  'allow-wifi-access', 'external-controller-access', 'http-api',
  'always-real-ip', 'geoip-maxmind-url', 'udp-priority', 'compatibility-mode',
];

function makeItems(values: string[], kind: vscode.CompletionItemKind): vscode.CompletionItem[] {
  return values.map(v => {
    const item = new vscode.CompletionItem(v, kind);
    return item;
  });
}

export class SurgeCompletionProvider implements vscode.CompletionItemProvider {
  private cachedSections: SurgeSection[] = [];
  private cachedVersion = -1;
  private cachedUri = '';

  private getSections(document: vscode.TextDocument): SurgeSection[] {
    const uri = document.uri.toString();
    if (uri !== this.cachedUri || document.version !== this.cachedVersion) {
      this.cachedSections = parseSections(document.getText());
      this.cachedVersion = document.version;
      this.cachedUri = uri;
    }
    return this.cachedSections;
  }

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext
  ): vscode.CompletionItem[] {
    const line = document.lineAt(position).text;
    const textBefore = line.substring(0, position.character);
    const sections = this.getSections(document);

    // Section name completions: user typed `[`
    if (/^\s*\[$/.test(textBefore) || /^\s*\[\w[\w\s-]*$/.test(textBefore)) {
      return SECTION_NAMES.map(name => {
        const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Enum);
        // Insert the name and closing bracket
        item.insertText = new vscode.SnippetString(`${name}]`);
        return item;
      });
    }

    // Directive completions: user typed `#!`
    if (/^\s*#!/.test(textBefore)) {
      return DIRECTIVES.map(d => {
        const item = new vscode.CompletionItem(d, vscode.CompletionItemKind.Keyword);
        // Replace from the start of `#!`
        const hashPos = textBefore.indexOf('#!');
        item.range = new vscode.Range(position.line, hashPos, position.line, position.character);
        return item;
      });
    }

    // Determine current section
    const currentSection = sections.find(s =>
      position.line > s.startLine && position.line <= s.endLine
    );
    if (!currentSection) {
      return [];
    }

    // Rule section completions
    if (currentSection.type === SectionType.Rule) {
      const trimmed = textBefore.trim();

      // After second comma (policy field) — suggest built-in policies
      // Skip for [Ruleset ...] sections which have no policy column
      const isRuleset = currentSection.name.toLowerCase().startsWith('ruleset');
      const commaCount = (textBefore.match(/,/g) || []).length;
      if (!isRuleset && commaCount >= 2) {
        const afterLastComma = textBefore.substring(textBefore.lastIndexOf(',') + 1).trim();
        if (afterLastComma === '' || BUILT_IN_POLICIES.some(p => p.toLowerCase().startsWith(afterLastComma.toLowerCase()))) {
          return makeItems(BUILT_IN_POLICIES, vscode.CompletionItemKind.Constant);
        }
      }

      // Start of line — suggest rule types
      if (trimmed === '' || RULE_TYPES.some(r => r.toLowerCase().startsWith(trimmed.toLowerCase()))) {
        return makeItems(RULE_TYPES, vscode.CompletionItemKind.Keyword);
      }
    }

    // Proxy section: after `=` suggest protocols
    if (currentSection.type === SectionType.ProxyDef) {
      if (/=\s*$/.test(textBefore)) {
        return makeItems(PROXY_PROTOCOLS, vscode.CompletionItemKind.Keyword);
      }
    }

    // Proxy Group section: after `=` suggest group types
    if (currentSection.type === SectionType.ProxyGroup) {
      if (/=\s*$/.test(textBefore)) {
        return makeItems(GROUP_TYPES, vscode.CompletionItemKind.Keyword);
      }
    }

    // General section: start of line suggest keys
    if (currentSection.type === SectionType.KeyValue && currentSection.name.toLowerCase() === 'general') {
      const trimmed = textBefore.trim();
      if (!textBefore.includes('=')) {
        if (trimmed === '' || GENERAL_KEYS.some(k => k.startsWith(trimmed.toLowerCase()))) {
          return GENERAL_KEYS.map(k => {
            const item = new vscode.CompletionItem(k, vscode.CompletionItemKind.Property);
            item.insertText = new vscode.SnippetString(`${k} = \$0`);
            return item;
          });
        }
      }
    }

    return [];
  }
}
