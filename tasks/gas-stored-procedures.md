# Apps Script: Stored Procedure support (`/procs`)

**Original request:** "this api wrapper supports sending stored procedures. create a new js file that
will extend the google apps script `dev/mp-google.js` to support it as well."

**Deliverable:** a new Apps Script file, `dev/mp-google-procedures.js`, that adds `/procs` support to
the same Apps Script project that holds `dev/mp-google.js`.

---

## 1. The contract (verified, not assumed)

Verified against `dev/Swagger UI.html` (the instance's own Swagger capture, lines 2357–2700) and the
TypeScript implementation in `src/api.ts:476-499` / `src/endpoints/procedures.ts`.

| Route | Method | Purpose |
|---|---|---|
| `/procs` | GET | List procedures available to the current user, with parameter metadata. Optional `$search` filters by name. |
| `/procs/{procedure}` | GET | Execute, parameters read from the query string. |
| `/procs/{procedure}` | POST | Execute, parameters read from the JSON body. |

**Metadata response (`GET /procs`) is PascalCase — not `Snake_Case`:**

```json
[{ "Name": "api_Custom_Foo",
   "Parameters": [{ "Name": "@ContactID", "Direction": "Input", "DataType": "Integer32", "Size": 0 }] }]
```

`Direction` ∈ `Input | Output | InputOutput | ReturnValue`.
`DataType` ∈ the 37-value enum listed in `src/endpoints/procedures.ts`.

**Execution response is `object[][]`** — an array of *result sets*, each an array of rows. Column
names are whatever the procedure's `SELECT` aliases produce; MP does not normalise them.

**Input parameters are `@`-prefixed** (`{ "@SelectionID": 26918 }`) — confirmed by the ACST KB and
the MP community wrappers. Procedures must be named `api_Custom_*` **and** registered under System
Setup → API Procedures, with the API Procedure linked to the client's security role, or MP refuses
the call. That is instance configuration, not something this file can do.

## 2. What the TypeScript wrapper does (the parity target)

`src/api.ts:476-499`:

- `getProcedures(search?)` → `GET /procs[?$search=…]`, then `convertFromPascalCase` on each record.
- `executeProcedure(name, input?)` → `POST /procs/{encoded}` with `input` as the raw JSON body,
  returning `res.data` **unconverted**. The GET form is not implemented.

`convertFromPascalCase` (`src/utils/converters.ts:247`) only lowercases the first character —
`DataType` → `dataType`.

## 3. The trap this file has to avoid

`dev/mp-google.js` already has `convertToCamelCase`, and it is the wrong tool here.
`toCamelCase()` (`mp-google.js:732`) lowercases the **entire** string before re-capitalising after
underscores. It is built for MP's `Snake_Case` table columns:

- `Contact_ID` → `contactId` ✔ (what `/tables/` returns)
- `DataType` → `datatype` ✘ (what `/procs` returns — no underscore to key off, so the capital is lost)

So the new file needs its own PascalCase→camelCase converter mirroring `fromPascalCase`, and must
**not** reuse `convertToCamelCase` for procedure metadata. This is the single most likely silent bug
in a naive port, so it gets a comment in the code explaining why the existing helper is bypassed.

## 4. Proposed API surface

All functions are top-level (Apps Script convention — one shared global scope; `API`, `Logger`,
`convertToCamelCase` etc. are referenced only from inside function bodies, so file load order is
irrelevant).

```js
getProcedures(search)                      // → ProcedureInfo[]   (camelCase metadata)
getProcedure(name)                         // → ProcedureInfo | undefined (exact, case-insensitive)
executeProcedure(name, input, options)     // → any[][]  all result sets
executeProcedureRows(name, input, options) // → any[]    first result set only  [decision 3]
```

Behaviour:

- **`@` normalisation** — an input key without a leading `@` gets one. Every SQL Server procedure
  parameter is `@`-prefixed, so this cannot be wrong, and it removes a whole class of "MP silently
  ignored my parameter" bugs. No escaping is applied: procedure parameters are bound, unlike the
  `$filter` strings that `escapeApostrophes`/`escapeSql` exist for.
- **Fail-fast** — throws on a missing/blank procedure name, and on an `input` that is not a plain
  object, rather than issuing a call that cannot mean anything (mirrors `findUsers` in `src/api.ts:513`).
- **Errors** — left to propagate. `API.fetch` already throws `{ error, code, urlParams, method, data }`
  on non-2xx, and every existing helper in `mp-google.js` (`getMany`, `createOne`, …) lets it through.
- **Empty body** — `API.fetch` returns `''` for a 2xx with no body (`mp-google.js:92`). `executeProcedure`
  maps that to `[]` (genuinely "no result sets"), but **throws** on a 2xx payload that is neither
  empty nor an array, so an unexpected shape surfaces instead of being swallowed.
- `test_getProcedures()` / `test_executeProcedure()` following the file's existing `test_*` +
  `testSetCredentials_()` convention, plus `@typedef` blocks for `ProcedureInfo`, `ParameterInfo`
  and `ProcedureInput` matching the JSDoc style at the bottom of `mp-google.js`.

## 5. Decisions (all three recommendations accepted)

1. **Result casing.** The rest of `mp-google.js` returns camelCase; the TS wrapper returns procedure
   rows raw. Recommendation: **raw by default, opt-in `{ camelCase: true }`** — parity with the
   wrapper, no mangling of arbitrary SQL aliases, and the conversion available for procs that return
   ordinary `Snake_Case` columns.
2. **GET execution form.** The TS wrapper implements POST only. Recommendation: **POST only**, for
   parity and to avoid query-string escaping pitfalls.
3. **`executeProcedureRows` convenience.** Most procedures return one result set;
   `const [rows] = executeProcedure(…)` already covers it but yields `undefined` when there are none.
   Recommendation: **include it**, returning `[]`.

## 6. Notes

- `dev/mp-google.js` is untracked in git (only the CSV/HTML reference files under `dev/` are tracked).
  The new file will be untracked the same way unless you want it committed.
- The file is a manual copy into the Apps Script project (no `.clasp.json` in this repo); a header
  comment will state that it requires `mp-google.js` in the same project.

## Todo

- [x] Confirm the three decisions in §5 — raw + opt-in `camelCase`, POST only, `executeProcedureRows` included
- [x] Write `dev/mp-google-procedures.js`
- [x] Syntax-check it (`node --check`)
- [x] Verify behaviour offline — both files loaded into one shared scope (as Apps Script does) with a
      stubbed `API.call`, exercising: `/procs` URL with and without `$search`; `DataType` surviving as
      `dataType` (and proof `toCamelCase` would flatten it to `datatype`); exact case-insensitive
      `getProcedure` match; path encoding; `@` normalisation; apostrophes left intact; raw vs
      `{ camelCase: true }` rows; `{}` body for a no-parameter call; first-result-set helper; empty
      2xx body → `[]`; fail-fast on a blank name / non-object input; non-`object[][]` response throwing
- [x] Report back
