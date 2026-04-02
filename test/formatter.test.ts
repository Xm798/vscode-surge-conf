import * as path from 'path';
import * as fs from 'fs';
import { parseSections, getSectionType, SectionType, isCommentLine, isDirectiveLine } from '../src/parser';

function runTests() {
  const errors: string[] = [];

  // Test 1: parseSections on full.conf
  const fullConf = fs.readFileSync(path.resolve(__dirname, '../../test/fixtures/full.conf'), 'utf-8');
  const sections = parseSections(fullConf);

  const expectedSections = ['General', 'Proxy', 'Proxy Group', 'Rule', 'Host',
    'URL Rewrite', 'Header Rewrite', 'Body Rewrite', 'Map Local', 'Script',
    'Panel', 'SSID Setting', 'Port Forwarding', 'Keystore', 'MITM'];

  for (const name of expectedSections) {
    if (!sections.find(s => s.name === name)) {
      errors.push(`Missing section: ${name}`);
    }
  }

  // Test 2: getSectionType
  const typeTests: [string, SectionType][] = [
    ['General', SectionType.KeyValue],
    ['Proxy', SectionType.ProxyDef],
    ['Proxy Group', SectionType.ProxyGroup],
    ['Rule', SectionType.Rule],
    ['Host', SectionType.Host],
    ['URL Rewrite', SectionType.Rewrite],
    ['Script', SectionType.Script],
    ['Panel', SectionType.Panel],
    ['SSID Setting', SectionType.SSIDSetting],
    ['Port Forwarding', SectionType.PortForwarding],
    ['Ruleset CustomSet', SectionType.Rule],
    ['WireGuard HomeVPN', SectionType.KeyValue],
  ];

  for (const [name, expected] of typeTests) {
    const actual = getSectionType(name);
    if (actual !== expected) {
      errors.push(`getSectionType("${name}"): expected ${SectionType[expected]}, got ${SectionType[actual]}`);
    }
  }

  // Test 3: isCommentLine
  const commentTests: [string, boolean][] = [
    ['# comment', true],
    ['; comment', true],
    ['// comment', true],
    ['  # indented comment', true],
    ['#!include file', false],
    ['key = value', false],
    ['key = value # inline', false],
    ['', false],
  ];

  for (const [line, expected] of commentTests) {
    const actual = isCommentLine(line);
    if (actual !== expected) {
      errors.push(`isCommentLine("${line}"): expected ${expected}, got ${actual}`);
    }
  }

  // Test 4: isDirectiveLine
  const directiveTests: [string, boolean][] = [
    ['#!include file', true],
    ['#!MANAGED-CONFIG url', true],
    ['#!name=Test', true],
    ['# comment', false],
    ['key = value', false],
  ];

  for (const [line, expected] of directiveTests) {
    const actual = isDirectiveLine(line);
    if (actual !== expected) {
      errors.push(`isDirectiveLine("${line}"): expected ${expected}, got ${actual}`);
    }
  }

  // Test 5: Section boundaries
  if (sections.length > 0) {
    const general = sections.find(s => s.name === 'General');
    if (general && general.startLine === 0) {
      errors.push('General section startLine should not be 0 (file has directives before it)');
    }

    for (let i = 0; i < sections.length - 1; i++) {
      if (sections[i].endLine >= sections[i + 1].startLine) {
        errors.push(`Sections overlap: ${sections[i].name} ends at ${sections[i].endLine}, ${sections[i + 1].name} starts at ${sections[i + 1].startLine}`);
      }
    }
  }

  // Report
  if (errors.length > 0) {
    console.error('\nFormatter tests FAILED:');
    errors.forEach(e => console.error(`  FAIL: ${e}`));
    process.exit(1);
  }

  console.log('\nFormatter tests PASSED');
  console.log(`  - ${sections.length} sections parsed from full.conf`);
  console.log(`  - ${typeTests.length} section type mappings verified`);
  console.log(`  - ${commentTests.length} comment detection cases verified`);
  console.log(`  - ${directiveTests.length} directive detection cases verified`);
}

runTests();
