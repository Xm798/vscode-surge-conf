import * as path from 'path';
import * as fs from 'fs';

interface IToken {
  startIndex: number;
  endIndex: number;
  scopes: string[];
}

// Minimal grammar test using vscode-tmgrammar-test
// For full snapshot testing, run: npx vscode-tmgrammar-snap -s source.surge -g ./syntaxes/surge.tmLanguage.json -t './test/fixtures/*.conf'

async function runTests() {
  const grammarPath = path.resolve(__dirname, '../../syntaxes/surge.tmLanguage.json');
  const fixturesDir = path.resolve(__dirname, '../../test/fixtures');

  if (!fs.existsSync(grammarPath)) {
    console.error('Grammar file not found:', grammarPath);
    process.exit(1);
  }

  const fixtures = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.conf') || f.endsWith('.sgmodule'));
  console.log(`Found ${fixtures.length} fixture files:`);
  fixtures.forEach(f => console.log(`  - ${f}`));

  const grammar = JSON.parse(fs.readFileSync(grammarPath, 'utf-8'));

  // Validate grammar structure
  const errors: string[] = [];

  if (grammar.scopeName !== 'source.surge') {
    errors.push(`Expected scopeName "source.surge", got "${grammar.scopeName}"`);
  }

  if (!grammar.patterns || !Array.isArray(grammar.patterns)) {
    errors.push('Missing or invalid top-level patterns array');
  }

  if (!grammar.repository || typeof grammar.repository !== 'object') {
    errors.push('Missing or invalid repository');
  }

  const requiredRepos = [
    'directives', 'comments', 'section-headers', 'key-value',
    'rule-types', 'builtin-policies', 'placeholders',
    'strings', 'booleans', 'ip-cidr', 'numbers'
  ];

  for (const repo of requiredRepos) {
    if (!grammar.repository[repo]) {
      errors.push(`Missing repository entry: ${repo}`);
    }
  }

  // Validate regex patterns compile
  let patternCount = 0;
  function validatePatterns(obj: any, path: string) {
    if (typeof obj !== 'object' || obj === null) return;
    if (obj.match) {
      patternCount++;
      try {
        new RegExp(obj.match);
      } catch (e: any) {
        errors.push(`Invalid regex at ${path}.match: ${e.message}`);
      }
    }
    if (obj.begin) {
      patternCount++;
      try {
        new RegExp(obj.begin);
      } catch (e: any) {
        errors.push(`Invalid regex at ${path}.begin: ${e.message}`);
      }
    }
    if (obj.patterns) {
      obj.patterns.forEach((p: any, i: number) => validatePatterns(p, `${path}[${i}]`));
    }
    if (obj.captures) {
      Object.entries(obj.captures).forEach(([k, v]) => validatePatterns(v, `${path}.captures.${k}`));
    }
  }

  Object.entries(grammar.repository).forEach(([name, value]) => {
    validatePatterns(value, `repository.${name}`);
  });

  // Report
  if (errors.length > 0) {
    console.error('\nGrammar validation FAILED:');
    errors.forEach(e => console.error(`  FAIL: ${e}`));
    process.exit(1);
  }

  console.log(`\nGrammar validation PASSED`);
  console.log(`  - scopeName: ${grammar.scopeName}`);
  console.log(`  - ${Object.keys(grammar.repository).length} repository entries`);
  console.log(`  - ${patternCount} regex patterns (all valid)`);
  console.log(`  - ${fixtures.length} fixture files available`);
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
