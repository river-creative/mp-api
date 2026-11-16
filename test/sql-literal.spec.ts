import assert from 'assert';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { escapeApostrophe, escapeSql, sqlLiteral, stringifyURLParams, toQueryParameters } from '../src/utils/converters';
import * as library from '../src';

// MP's $filter is raw T-SQL. The library's escapes run over the WHOLE assembled filter and double an
// apostrophe only between two word characters, so a value pasted between quotes by hand could close
// its literal and append conditions of its own. sqlLiteral quotes the value itself. Both libraries
// carry a copy (the Apps Script one is a global script, so it cannot import the TypeScript one), and
// every case below runs against both.

/** The function shape both copies share. */
type SqlLiteralFn = (value: unknown) => string;

/**
 * Reads one T-SQL string literal that starts at `start`, the way SQL Server's lexer does: `''` is an
 * escaped apostrophe, a lone `'` ends the literal. Returns its value and the index of the closing
 * quote, or null when the literal never closes.
 */
function readLiteral(sql: string, start = 0): { value: string; end: number } | null {
  assert.strictEqual(sql[start], "'", `expected a literal at ${start} in ${sql}`);
  let value = '';
  for (let i = start + 1; i < sql.length; i++) {
    if (sql[i] !== "'") { value += sql[i]; continue; }
    if (sql[i + 1] === "'") { value += "'"; i++; continue; }
    return { value, end: i };
  }
  return null;
}

// The value C7 reproduced: interpolated into `Email_Address='${v}'`, it made an always-true filter.
const INJECTION = "x@y.org' OR Contacts.Contact_ID>0 OR 'a'='a";

const VALUES = [
  'someone@example.org',
  "o'brien",
  INJECTION,
  '',
  "'",
  "''",
  "a'",
  "'a",
  "it's 'quoted'",
  "back\\'slash",          // T-SQL has no backslash escape: the backslash stays, the quote doubles
  'curly ’ apostrophe',    // U+2019 is not a T-SQL delimiter and is left alone
  'line\nbreak',
  '100%_[x]'
];

// The Apps Script library, loaded the way Apps Script loads it: as one global script.
const appsScript = vm.createContext({});
vm.runInContext(readFileSync(path.resolve(__dirname, '../dev/mp-google.js'), 'utf8'), appsScript, { filename: 'mp-google.js' });

const COPIES: [string, SqlLiteralFn][] = [
  ['TypeScript library', sqlLiteral as SqlLiteralFn],
  ['Apps Script library', appsScript.sqlLiteral as SqlLiteralFn]
];

describe('sqlLiteral', function () {

  for (const [copy, literal] of COPIES) {
    describe(copy, function () {

      it('quotes a plain value', function () {
        assert.strictEqual(literal('someone@example.org'), "'someone@example.org'");
      });

      it("doubles the apostrophe in o'brien", function () {
        assert.strictEqual(literal("o'brien"), "'o''brien'");
      });

      it('keeps the injection payload inside one literal', function () {
        assert.strictEqual(literal(INJECTION), "'x@y.org'' OR Contacts.Contact_ID>0 OR ''a''=''a'");
      });

      it('quotes an empty string as an empty literal', function () {
        assert.strictEqual(literal(''), "''");
      });

      it('reads back as exactly one literal holding the value, whatever the value', function () {
        for (const value of VALUES) {
          const quoted = literal(value);
          const read = readLiteral(quoted);
          assert.ok(read, `unterminated literal for ${JSON.stringify(value)}: ${quoted}`);
          assert.strictEqual(read.end, quoted.length - 1, `literal closes early for ${JSON.stringify(value)}: ${quoted}`);
          assert.strictEqual(read.value, value);
        }
      });

      it('quotes a number and a boolean as their text', function () {
        assert.strictEqual(literal(42), "'42'");
        assert.strictEqual(literal(-1.5), "'-1.5'");
        assert.strictEqual(literal(true), "'true'");
      });

      it('throws on null and undefined, which need IS NULL', function () {
        for (const value of [null, undefined])
          assert.throws(() => literal(value), (e: Error) => e.name === 'TypeError' && /IS NULL/.test(e.message));
      });

      it('throws on a value that is not a string, number or boolean', function () {
        for (const value of [NaN, Infinity, -Infinity, 10n, {}, [], ['a'], new Date(0), Symbol('s'), () => 'x'])
          assert.throws(() => literal(value), (e: Error) => e.name === 'TypeError' && /^sqlLiteral: /.test(e.message));
      });
    });
  }

  it('gives the same answer in both libraries', function () {
    for (const value of [...VALUES, 0, 42, false])
      assert.strictEqual(appsScript.sqlLiteral(value), sqlLiteral(value));
  });

  it('is exported from the package entry point', function () {
    assert.strictEqual(library.sqlLiteral, sqlLiteral);
  });
});

describe('sqlLiteral through the blanket escapes', function () {

  // Every value without a `%` (escapeSql URL-encodes that one; tested on its own below).
  const filters = VALUES.filter(v => !v.includes('%')).map(v => `Contact_Email_Addresses.Email_Address=${sqlLiteral(v)}`);

  it('passes unchanged through escapeApostrophe and escapeSql', function () {
    for (const filter of filters) {
      assert.strictEqual(escapeApostrophe(filter), filter);
      assert.strictEqual(escapeSql(filter), filter);
    }
  });

  it('passes unchanged through a read query (toQueryParameters) and a URL query (stringifyURLParams)', function () {
    for (const filter of filters) {
      assert.strictEqual(toQueryParameters({ filter }).Filter, filter);
      assert.strictEqual(stringifyURLParams({ filter }), `?$filter=${filter}`);
    }
  });

  it("passes unchanged through Apps Script getMany's escape and the String.prototype escapes", function () {
    // getMany sends escapeApostrophes(convertToSnakeCase(mpOptions)) (mp-google.js, getMany).
    const prototypeEscape = vm.runInContext('(s) => s.escapeApostrophe()', appsScript) as (s: string) => string;
    for (const filter of filters) {
      assert.strictEqual(appsScript.escapeApostrophes(appsScript.convertToSnakeCase({ filter })).Filter, filter);
      assert.strictEqual(prototypeEscape(filter), filter);
      assert.strictEqual(appsScript.stringifyURLParams({ filter }), `?$filter=${filter}`);
    }
  });

  it('keeps the injection payload a single literal after the escape getMany applies', function () {
    const filter = appsScript.escapeApostrophes(appsScript.convertToSnakeCase({
      filter: `Contact_Email_Addresses.Email_Address=${appsScript.sqlLiteral(INJECTION)}`
    })).Filter as string;
    const start = filter.indexOf("'");
    const read = readLiteral(filter, start);
    assert.ok(read);
    assert.strictEqual(read.end, filter.length - 1);
    assert.strictEqual(read.value, INJECTION);
  });

  it('is needed: the blanket escape leaves a hand-quoted payload able to close its literal', function () {
    // Why the blanket escapes are not a security boundary: they cannot tell the payload's
    // apostrophes from the quotes the caller wrote around it.
    const handQuoted = `Contact_Email_Addresses.Email_Address='${INJECTION}'`;
    for (const escaped of [escapeApostrophe(handQuoted), escapeSql(handQuoted), appsScript.escapeApostrophes({ Filter: handQuoted }).Filter as string]) {
      const read = readLiteral(escaped, escaped.indexOf("'"));
      assert.ok(read);
      assert.strictEqual(read.value, 'x@y.org');
      assert.ok(read.end < escaped.length - 1, 'the literal should close early: that is the injection');
    }
  });

  it('is URL-encoded, not altered, by escapeSql when the value holds a %', function () {
    // escapeSql turns `%` into `%25` for the query string; the server decodes it back.
    assert.strictEqual(escapeSql(`Code=${sqlLiteral("100%")}`), "Code='100%25'");
  });

  it('must not be glued to a word character: an N prefix gets its opening quote doubled', function () {
    // The documented limit of the composition: the opening quote then has a word character on both
    // sides, so the blanket escape doubles it and the literal breaks.
    const prefixed = `Last_Name=N${sqlLiteral('Smith')}`;
    assert.notStrictEqual(escapeApostrophe(prefixed), prefixed);
  });
});
