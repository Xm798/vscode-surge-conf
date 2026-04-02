import * as vscode from 'vscode';

const RULE_TYPE_DOCS: Record<string, string> = {
  'DOMAIN': 'Matches the exact domain name',
  'DOMAIN-SUFFIX': 'Matches the domain suffix (e.g., google.com matches www.google.com)',
  'DOMAIN-KEYWORD': 'Matches if the domain contains the keyword',
  'DOMAIN-SET': 'Matches domains from an external list file',
  'IP-CIDR': 'Matches IPv4 addresses in the specified CIDR range',
  'IP-CIDR6': 'Matches IPv6 addresses in the specified CIDR range',
  'GEOIP': 'Matches by GeoIP country code',
  'IP-ASN': 'Matches by IP Autonomous System Number',
  'USER-AGENT': 'Matches by HTTP User-Agent header (supports wildcards)',
  'URL-REGEX': 'Matches by URL regex pattern',
  'PROCESS-NAME': 'Matches by process name (macOS only)',
  'DEST-PORT': 'Matches by destination port number or range',
  'IN-PORT': 'Matches by inbound listening port',
  'SRC-PORT': 'Matches by source port number',
  'SRC-IP': 'Matches by source IP address',
  'SUBNET': 'Matches by network environment (SSID, interface type)',
  'PROTOCOL': 'Matches by network protocol (TCP, UDP, etc.)',
  'HOSTNAME-TYPE': 'Matches by hostname type (IPv4, IPv6, domain)',
  'CELLULAR-RADIO': 'Matches by cellular radio access technology',
  'DEVICE-NAME': 'Matches by device name',
  'MAC-ADDRESS': 'Matches by MAC address',
  'RULE-SET': 'Matches using an external rule set file',
  'AND': 'Logical AND combination of sub-rules',
  'OR': 'Logical OR combination of sub-rules',
  'NOT': 'Logical NOT — negates a sub-rule',
  'FINAL': 'Default rule when no other rules match (must be last)',
  'SCRIPT': 'Matches using a JavaScript script for custom rule evaluation',
};

const POLICY_DOCS: Record<string, string> = {
  'DIRECT': 'Connect directly without proxy',
  'REJECT': 'Reject the connection with an error',
  'REJECT-TINYGIF': 'Reject and return a 1x1 transparent GIF',
  'REJECT-DROP': 'Silently drop the connection (no response)',
  'REJECT-NO-DROP': 'Reject the connection (never silently dropped, even in Block All mode)',
};

const SECTION_DOCS: Record<string, string> = {
  'General': 'General settings: DNS, proxy ports, logging, network behavior',
  'Proxy': 'Define proxy server connections',
  'Proxy Group': 'Group proxies into selection/auto-test/fallback strategies',
  'Rule': 'Traffic routing rules (evaluated top-to-bottom, first match wins)',
  'Host': 'Local DNS mappings and DNS server assignments',
  'URL Rewrite': 'Rewrite or redirect URLs by regex pattern',
  'Header Rewrite': 'Modify HTTP request/response headers',
  'Body Rewrite': 'Modify HTTP request/response body content',
  'Map Local': 'Map URL patterns to local file responses',
  'Script': 'JavaScript scripts for request/response modification',
  'Panel': 'Custom panel tiles with script-driven content',
  'SSID Setting': 'Per-SSID proxy and DNS overrides',
  'Port Forwarding': 'Local port forwarding rules',
  'Keystore': 'Key-value persistent storage definitions',
  'MITM': 'HTTPS decryption settings (Man-in-the-Middle)',
};

const GROUP_TYPE_DOCS: Record<string, string> = {
  'select': 'Manually select a proxy from the group',
  'url-test': 'Auto-select the fastest proxy by latency test',
  'fallback': 'Use the first available proxy; fall back on failure',
  'load-balance': 'Distribute connections across proxies',
  'subnet': 'Select proxy based on network environment (SSID, interface)',
  'smart': 'Intelligent proxy selection based on multiple factors',
};

const PROTOCOL_DOCS: Record<string, string> = {
  'http': 'HTTP proxy protocol',
  'https': 'HTTPS (TLS) proxy protocol',
  'socks5': 'SOCKS5 proxy protocol',
  'socks5-tls': 'SOCKS5 over TLS proxy protocol',
  'snell': 'Snell proxy protocol',
  'ss': 'Shadowsocks proxy protocol',
  'vmess': 'V2Ray VMess proxy protocol',
  'trojan': 'Trojan proxy protocol',
  'tuic': 'TUIC proxy protocol (QUIC-based)',
  'hysteria2': 'Hysteria 2 proxy protocol (QUIC-based)',
  'anytls': 'AnyTLS proxy protocol',
  'ssh': 'SSH tunnel proxy',
  'wireguard': 'WireGuard VPN protocol',
};

function markdownFor(label: string, description: string): vscode.MarkdownString {
  const md = new vscode.MarkdownString();
  md.appendMarkdown(`**${label}** — ${description}`);
  return md;
}

export class SurgeHoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): vscode.Hover | undefined {
    const line = document.lineAt(position).text;

    // Section header hover (with prefix fallback for parameterized sections)
    const sectionMatch = line.match(/^\s*\[([\w][\w\s\-]*)\]\s*$/);
    if (sectionMatch) {
      const name = sectionMatch[1];
      let desc = SECTION_DOCS[name];
      if (!desc) {
        const prefix = name.split(' ')[0];
        const SECTION_PREFIX_DOCS: Record<string, string> = {
          'WireGuard': 'WireGuard VPN tunnel configuration for a named interface',
          'Ruleset': 'Named rule set — rules that can be referenced by RULE-SET',
        };
        desc = SECTION_PREFIX_DOCS[prefix];
      }
      if (desc) {
        return new vscode.Hover(markdownFor(`[${name}]`, desc));
      }
      return undefined;
    }

    // Word-based hover
    const wordRange = document.getWordRangeAtPosition(position, /[\w][\w\-]*/);
    if (!wordRange) {
      return undefined;
    }
    const word = document.getText(wordRange);

    // Rule types
    if (RULE_TYPE_DOCS[word]) {
      return new vscode.Hover(markdownFor(word, RULE_TYPE_DOCS[word]), wordRange);
    }

    // Built-in policies
    if (POLICY_DOCS[word]) {
      return new vscode.Hover(markdownFor(word, POLICY_DOCS[word]), wordRange);
    }

    // Protocol keywords
    if (PROTOCOL_DOCS[word]) {
      return new vscode.Hover(markdownFor(word, PROTOCOL_DOCS[word]), wordRange);
    }

    // Group type keywords
    if (GROUP_TYPE_DOCS[word]) {
      return new vscode.Hover(markdownFor(word, GROUP_TYPE_DOCS[word]), wordRange);
    }

    return undefined;
  }
}
