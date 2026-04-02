# Surge Configuration Language Support

VSCode extension for [Surge](https://nssurge.com/) network proxy configuration files.

## Features

- **Syntax Highlighting** — 19 grammar patterns covering all Surge section types, rule keywords, proxy protocols, directives, and more
- **Formatting** — Normalize `=` spacing, comma spacing, and blank lines with Format Document / Format Selection
- **Auto-completion** — Context-aware suggestions for section names, rule types, policies, protocols, group types, directives, and General keys
- **Hover Documentation** — Inline documentation for rule types, built-in policies, protocols, group types, and section headers

## Supported File Types

| Extension | Description |
|-----------|-------------|
| `.dconf` | Detached configuration fragments (auto-detected) |
| `.sgmodule` | Surge modules (auto-detected) |
| `.conf` | Main configuration files (detected via first-line matching) |

### `.conf` File Association

Since `.conf` is a generic extension, this extension uses first-line detection (`#!MANAGED-CONFIG` or `[General]`). To always associate `.conf` files with Surge, add to your VSCode settings:

```json
"files.associations": {
  "*.conf": "surge"
}
```

## Formatting Rules

- Normalize `key = value` spacing (single space around `=`)
- Normalize comma spacing in proxy/group/script definitions
- Collapse multiple blank lines between sections to one
- Preserves: rule lines (no-space commas), rewrite/regex content, comments, directives

## Links

- [Surge Official Documentation](https://manual.nssurge.com/)
- [Surge Knowledge Base](https://kb.nssurge.com/)
