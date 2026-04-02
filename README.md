# Surge Syntax

VSCode extension for [Surge](https://nssurge.com/) network proxy configuration files.

## Features

- **Syntax Highlighting** — 19 grammar patterns covering all Surge section types, rule keywords, proxy protocols, directives, and more
- **Formatting** — Normalize `=` spacing, comma spacing, and blank lines with Format Document / Format Selection
- **Auto-completion** — Context-aware suggestions for section names, rule types, policies, protocols, group types, directives, and General keys
- **Hover Documentation** — Inline documentation for rule types, built-in policies, protocols, group types, and section headers

## Supported File Types

| Type | Detection |
|------|-----------|
| `.sgmodule` | Auto-detected by extension |
| `#!MANAGED-CONFIG` | Auto-detected by first line (managed configs) |
| `#!SURGE` | Auto-detected by first line (add this to any Surge config) |

For `.conf` or other generic extensions, either add `#!SURGE` as the first line, or configure VS Code manually:

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
