/**
 * MinistryPlatform Stored Procedures (`/procs`) — Google Apps Script.
 *
 * Companion to `mp-google.js`: drop both files into the same Apps Script project. This file reuses
 * that file's API client (`API.call`), its access-token handling and its `convertToCamelCase`
 * helper — it does not re-implement any of them. Call `setCredentials()` first, exactly as you do
 * for the table endpoints.
 *
 * Mirrors `getProcedures` / `executeProcedure` from the mp-js-api wrapper (`src/api.ts`).
 *
 *   getProcedures(search)                       → metadata for the procedures you may call
 *   getProcedure(name)                          → metadata for one procedure
 *   executeProcedure(name, input, options)      → every result set the procedure returned
 *   executeProcedureRows(name, input, options)  → just the first result set
 *
 * MP will only run a procedure that is named `api_Custom_*`, is registered under
 * System Setup → API Procedures, and whose API Procedure record is linked to a security role held
 * by the API client. That is instance configuration — no client-side code can substitute for it.
 */


/**
 * Returns metadata for the stored procedures available to the current API user.
 *
 * @param {string} [search] - Filters procedures by name ($search)
 *
 * @returns {ProcedureInfo[]} procedures - an array of procedure metadata objects
 */
function getProcedures(search) {

  const urlParams = '/procs' + (search ? `?$search=${encodeURIComponent(search)}` : '');
  const res = API.call({ urlParams, method: 'get' });

  return res ? convertFromPascalCase(res) : [];
}


/**
 * Returns metadata for a single stored procedure, matched on the exact name (case-insensitive).
 * `$search` matches loosely, so the exact record is picked out of what it returns.
 *
 * @param {string} procedureName - Procedure name, e.g. 'api_Custom_GetContacts'
 *
 * @returns {ProcedureInfo | undefined} procedure - procedure metadata, or undefined when the
 *   procedure does not exist or is not exposed to this API user
 */
function getProcedure(procedureName) {

  assertProcedureName_(procedureName);

  const name = procedureName.trim().toLowerCase();
  return getProcedures(procedureName.trim()).find(procedure => procedure.name?.toLowerCase() === name);
}


/**
 * Executes a stored procedure and returns every result set it produced.
 *
 * Parameter keys are `@`-prefixed (`{ '@ContactID': 5 }`); a key without the prefix gets one, since
 * every SQL Server parameter has it. Values are NOT escaped — MP binds procedure parameters, unlike
 * the `$filter` strings `escapeApostrophes`/`escapeSql` exist for, so escaping here would corrupt
 * the value.
 *
 * Rows come back exactly as the procedure's SELECT names them, matching `executeProcedure` in the
 * Node wrapper — a procedure's column aliases are arbitrary and blind conversion would mangle them.
 * Pass `{ camelCase: true }` for procedures that return ordinary `Snake_Case` columns.
 *
 * @param {string} procedureName - Procedure name, e.g. 'api_Custom_GetContacts'
 * @param {ProcedureInput} [input] - Parameter name/value pairs, e.g. { '@ContactID': 5 }
 * @param {ProcedureOptions} [options] - { camelCase }
 *
 * @returns {object[][]} resultSets - an array of result sets, each an array of row objects
 */
function executeProcedure(procedureName, input = {}, { camelCase = false } = {}) {

  assertProcedureName_(procedureName);

  const urlParams = `/procs/${encodeURIComponent(procedureName.trim())}`;
  const data = toProcedureInput_(input);

  const res = API.call({ urlParams, data, method: 'post' });
  const resultSets = toResultSets_(res, procedureName);

  return camelCase
    ? resultSets.map(rows => rows.map(row => convertToCamelCase(row)))
    : resultSets;
}


/**
 * Executes a stored procedure and returns its first result set — the common case, since most
 * procedures return exactly one. Returns [] when the procedure returned no result sets.
 *
 * @param {string} procedureName - Procedure name, e.g. 'api_Custom_GetContacts'
 * @param {ProcedureInput} [input] - Parameter name/value pairs, e.g. { '@ContactID': 5 }
 * @param {ProcedureOptions} [options] - { camelCase }
 *
 * @returns {object[]} rows - the first result set
 */
function executeProcedureRows(procedureName, input = {}, options = {}) {

  const [rows = []] = executeProcedure(procedureName, input, options);
  return rows;
}




/**
 * Builds the request body: parameter names normalised to their `@` prefix.
 * A missing name or a non-object input is a caller mistake, not an MP failure — it throws here
 * rather than sending a call that cannot mean anything.
 */
function toProcedureInput_(input = {}) {

  if (input === null || typeof input !== 'object' || Array.isArray(input))
    throw new Error(`Stored procedure input must be an object of parameter name/value pairs, received: ${JSON.stringify(input)}`);

  return Object.entries(input).reduce((acc, [key, value]) => {
    acc[key.startsWith('@') ? key : `@${key}`] = value;
    return acc;
  }, {});
}


function assertProcedureName_(procedureName) {

  if (typeof procedureName !== 'string' || !procedureName.trim())
    throw new Error(`A stored procedure name is required, e.g. executeProcedure('api_Custom_GetContacts')`);
}


/**
 * Normalises the `/procs/{procedure}` response to an array of result sets.
 *
 * A 2xx with an empty body means the procedure produced no result sets — `API.fetch` hands that back
 * as '' rather than as an array. Anything else that is not `object[][]` is drift from the documented
 * response and throws: a flat row array would otherwise make `executeProcedureRows` return a single
 * row object where a row array is expected.
 */
function toResultSets_(res, procedureName) {

  if (!res) return [];

  if (!Array.isArray(res) || res.some(resultSet => !Array.isArray(resultSet)))
    throw new Error(`Unexpected /procs response for '${procedureName}': expected an array of result sets, received: ${JSON.stringify(res).slice(0, 500)}`);

  return res;
}




/**
 * Converts a PascalCase string to camelCase: 'DataType' → 'dataType'.
 *
 * `/procs` (like /communications, /messages and /texts) answers in PascalCase, NOT in the
 * `Snake_Case` the `/tables/` endpoints use, so `convertToCamelCase` is the wrong tool for it:
 * `toCamelCase` lowercases the whole string before re-capitalising after each underscore, which is
 * right for 'Contact_ID' → 'contactId' but silently flattens 'DataType' → 'datatype'. Only the
 * first character may change here.
 */
function fromPascalCase(str) {
  return str ? str.charAt(0).toLowerCase() + str.slice(1) : str;
}


/**
 * Recursively converts PascalCase object keys to camelCase.
 * Used for responses from the PascalCase endpoints (/procs, /communications, /messages, /texts).
 */
function convertFromPascalCase(obj) {

  if (Array.isArray(obj)) {
    return obj.map(value => convertFromPascalCase(value));
  }

  if (obj !== null && typeof obj === 'object') {
    const camelCaseObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        camelCaseObj[fromPascalCase(key)] = convertFromPascalCase(obj[key]);
      }
    }
    return camelCaseObj;
  }

  return obj; // Return value if it's neither an array nor an object
}




/**
* @typedef ProcedureInfo
*
* @property {string} name - Procedure name, e.g. 'api_Custom_GetContacts'
* @property {ParameterInfo[]} parameters
*/

/**
* @typedef ParameterInfo
*
* @property {string} name - Parameter name, e.g. '@ContactID'
* @property {('Input'|'Output'|'InputOutput'|'ReturnValue')} direction
* @property {string} dataType - 'Unknown' | 'String' | 'Text' | 'Xml' | 'Byte' | 'Integer16' |
*   'Integer32' | 'Integer64' | 'Decimal' | 'Real' | 'Boolean' | 'Date' | 'Time' | 'DateTime' |
*   'Timestamp' | 'Binary' | 'Password' | 'Money' | 'Guid' | 'Phone' | 'Email' | 'Variant' |
*   'Separator' | 'Image' | 'Counter' | 'TableName' | 'GlobalFilter' | 'TimeZone' | 'Locale' |
*   'LargeString' | 'Url' | 'Strings' | 'Integers' | 'Color' | 'SecretKey'
* @property {number} size - Parameter maximum length
*/

/**
* @typedef ProcedureInput
*
* Parameter name/value pairs. Keys should carry the '@' prefix, e.g. { '@SelectionID': 26918 }.
*
* @property {(string|number|boolean|null)} [parameterName]
*/

/**
* @typedef ProcedureOptions
*
* @property {boolean} [camelCase] - Convert result rows to camelCase (default false: rows come back
*   exactly as the procedure named them)
*/




function test_getProcedures() {

  testSetCredentials_();

  const procedures = getProcedures('api_Custom');
  Logger.log(`${procedures.length} procedures available`);
  Logger.log(JSON.stringify(procedures.slice(0, 3), null, 2));
}


function test_executeProcedure() {

  testSetCredentials_();

  const procedureName = PropertiesService.getScriptProperties().getProperty('test_procedure') || '';
  if (!procedureName) return Logger.log('Save the procedure name under the "test_procedure" script property to run this test.');

  const rows = executeProcedureRows(procedureName, {}, { camelCase: true });
  Logger.log(`${rows.length} rows`);
  Logger.log(JSON.stringify(rows.slice(0, 3), null, 2));
}
