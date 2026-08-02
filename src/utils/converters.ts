/**
 * MP names its parameters two different ways, and neither is the camelCase this client speaks.
 *
 * A **read** (POST /tables/{table}/get) binds a `QueryParameters` body whose keys are PascalCase:
 * `Select, Filter, OrderBy, GroupBy, Having, Top, Skip, Distinct, UserId, GlobalFilterId, Ids`.
 * A **query-string** parameter ($select on a write, say) is camelCase — except `$orderby` and
 * `$groupby`, which are lowercase. Both verified against the instance swagger (/swagger/docs/v1).
 *
 * MP does not reject a parameter it cannot bind — it *ignores* it. So a misspelled key is not an
 * error, it is a silent no-op: an ordered read comes back in whatever order the database chose, and
 * a cursor-pager built on that ordering skips records instead of failing. Both maps below exist to
 * make that class of bug impossible; `toQueryParameters` additionally throws on a key MP has no name
 * for, so a typo surfaces at the call rather than as quietly wrong data.
 */
const MP_URL_PARAMS: Record<string, string> = {
  orderBy: 'orderby',
  groupBy: 'groupby'
};

const MP_QUERY_PARAMETERS: Record<string, string> = {
  ids: 'Ids',
  select: 'Select',
  filter: 'Filter',
  orderBy: 'OrderBy',
  groupBy: 'GroupBy',
  having: 'Having',
  top: 'Top',
  skip: 'Skip',
  distinct: 'Distinct',
  userId: 'UserId',
  globalFilterId: 'GlobalFilterId'
};

export function stringifyURLParams<T = any>(mpOptions: Record<string, T> = {}) {
  return escapeSql(Object.entries(mpOptions).reduce((acc, [key, value]) => {
    const param = MP_URL_PARAMS[key] ?? key;
    acc += `${acc ? '&' : '?'}$${param}=${value}`;
    return acc;
  }, ''));
}

/**
 * A read query as MP's `QueryParameters` body — the shape POST /tables/{table}/get binds.
 *
 * This is why the generic snake_case converter (which write payloads correctly use, because MP's
 * *columns* are snake_case) must never touch a read query: it turns `orderBy` into `Order_By`, which
 * binds to nothing. Single-word keys — Select, Filter, Top — survived that converter by coincidence,
 * which is precisely why only the multi-word ones (OrderBy, GroupBy, Having, UserId, GlobalFilterId)
 * appeared to "not work".
 */
export function toQueryParameters<T extends Record<string, any>>(mpQuery: T): Record<string, unknown> {
  return Object.entries(mpQuery).reduce<Record<string, unknown>>((body, [key, value]) => {
    const name = MP_QUERY_PARAMETERS[key];
    if (!name)
      throw new Error(
        `Unknown MP query parameter '${key}'. MP ignores what it cannot bind, so this would be a silent no-op. ` +
        `Expected one of: ${Object.keys(MP_QUERY_PARAMETERS).join(', ')}.`
      );

    body[name] = typeof value === 'string' ? escapeApostrophe(value) : value;
    return body;
  }, {});
}

export function escapeSql(str: string) {
  return str.replace(/%|(?<=\w)'(?=\w)/g, function (char: string) {
    switch (char) {
      case "\0":
        return "\\0";
      case "\x08":
        return "\\b";
      case "\x09":
        return "\\t";
      case "\x1a":
        return "\\z";
      case "\n":
        return "\\n";
      case "\r":
        return "\\r";
      case "%":
        return "%25";
      case "'":
        return "''";
      case "\"":
      case "\\":
        return "\\" + char; // prepends a backslash to backslash, percent,
      // and double/single quotes
      default:
        return char;
    }
  });
}

export function escapeApostrophe<T = string>(str: string): T {
  if(typeof str !== 'string') return str;
  return str.replace(/%|(?<=\w)'(?=\w)/g, function (char) {
    switch (char) {
      case "'":
        return "''";
      default:
        return char;
    }
  }) as T;
}

export function escapeApostrophes<T>(obj: T) {

  if (obj !== null && typeof obj === 'object') {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        if (typeof value === 'string')
          obj[key] = escapeApostrophe<typeof value>(value as string);
        else
          obj[key] = value;
      }
    }
    return obj;
  }

  return obj; // Return value if it's not an object
}


export function toCamelCase(str: string, { capitalIds = false }: { capitalIds?: boolean; } = {}) {
  // str = str.replace('-', '');
  str = str.toLowerCase();
  // str = str.replace(/^_?[A-Z]{1,3}/, match => match.toLowerCase()); // Don't convert if start with ID, HS, SMS, etc
  str = str.replace(/(?<!^_|^)[^a-zA-Z0-9_][^\W_]/g, match => match?.toUpperCase()); // capitalize after non word char
  str = str.replace(/(?<=^_|^__)[^\W_]/g, match => match.at(-1)?.toLowerCase() || '');  // keep underscore if first char
  str = str.replace(/(?<!^_|^)_[^\W_]/g, match => match.charAt(1).toUpperCase()); // remove non-word char if not first char
  return capitalIds ? str.replace(/id$/i, 'ID') : str;
}

/**
 * Converts a key to the Capital_Snake_Case MP names its columns with.
 *
 * Every write goes through this (createOne/createMany/updateMany → convertToSnakeCase), and **MP drops a
 * column it does not recognise from a write without reporting anything** — the request returns 200 and
 * stores nothing. So a name this gets wrong is not an error anyone sees; it is a value that silently
 * never saves. Two rules exist purely because of that:
 *
 * 1. **A run of capitals is one word.** `attendantPINHash` → `Attendant_PIN_Hash`, not
 *    `Attendant_P_I_N_Hash`. Only the LAST capital of a run starts a new word, and only when a lowercase
 *    word actually follows it: `idCard` → `Id_Card`, but `contactID` keeps `ID` whole. The rule used to
 *    special-case the literal `ID` alone, so every other acronym MP uses — `PIN`, `SMS`, `HR`, `IP` —
 *    was split apart when a caller spelled it in capitals.
 * 2. **Nothing is inserted at the start of the string.** A key that is already Capital_Snake_Case, i.e.
 *    a real MP column name, comes back unchanged instead of gaining a leading underscore
 *    (`Display_Name` → `_Display_Name` before this). Callers do pass column names.
 *
 * MP matches column names case-insensitively, which is why the ordinary camelCase spelling
 * (`attendantPinHash` → `Attendant_Pin_Hash`) has always worked and still does.
 *
 * **Known limitations**, both deliberately unchanged here — a key that hits either needs its own literal
 * spelling rather than this conversion:
 *  - Every digit takes a separator, so a multi-digit run splits: `field123Name` → `Field_1_2_3_Name`,
 *    and columns like `Code2`, `Vision2_Program_ID`, `Active_Days_Past_30_Days` and the `__F1*` /
 *    `__TheStand22*` import columns cannot be produced. (72 of the 2,204 columns on the live instance.)
 *  - Only `_` and `/` count as existing separators; a hyphen does not.
 */
export function toCapitalSnakeCase(str: string, { capitalIds = false }: { capitalIds?: boolean } = {}) {
  if (!str) return str;

  // Leading-underscore MP columns (`_Approved`, `__F1ActivityID`) capitalize after the underscores.
  str = str.replace(/(?<=^_|^__)[^\W_]/, match => match.at(0)?.toUpperCase() || '');

  const isUpper = (c: string) => c >= 'A' && c <= 'Z';
  const isLower = (c: string) => c >= 'a' && c <= 'z';
  const isDigit = (c: string) => c >= '0' && c <= '9';

  let out = '';
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const prev = i > 0 ? str[i - 1] : '';
    const next = i + 1 < str.length ? str[i + 1] : '';

    // Position 0 has nothing to separate from, and a `_` or `/` already IS the boundary — adding one
    // there either grows a leading underscore or doubles the separator, and both name a column that
    // does not exist.
    const boundaryAlreadyThere = i === 0 || prev === '_' || prev === '/';

    if (!boundaryAlreadyThere) {
      // Kept exactly as it was: every digit takes a separator, not just the first of a run. See the
      // limitation noted above.
      if (isDigit(char)) out += '_';
      // A capital starts a new word when it follows a non-capital, or when it is the last capital of a
      // run and a lowercase word follows it (the `H` in `PINHash`).
      else if (isUpper(char) && (!isUpper(prev) || isLower(next))) out += '_';
    }

    out += char;
  }

  out = out.charAt(0).toUpperCase() + out.slice(1);
  return capitalIds ? out.replace(/_id$/i, '_ID') : out;
}

// Function to recursively convert object keys to Capital_Snake_Case
export function caseConverter<T>(obj: T, { type, capitalIds = false }: { type: 'toCamel' | 'toSnake', capitalIds?: boolean; }) {
  const caseFn = type === 'toCamel' ? toCamelCase : toCapitalSnakeCase;
  if (Array.isArray(obj)) {
    return obj.map(val => caseConverter(val, { type })); // Recursively process each array element
  }

  if (obj !== null && typeof obj === 'object') {
    const snakeCaseObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const snakeCaseKey = caseFn(key, { capitalIds });  // Convert key to Snake_Case
        snakeCaseObj[snakeCaseKey] = caseConverter(obj[key], { type }); // Recursively process nested objects
      }
    }
    return snakeCaseObj;
  }

  return obj; // Return value if it's neither an array nor an object
}

export function convertToCamelCase<T extends Record<string, any> = Record<string, any>, D extends Record<string, any> = Record<string, any>>(obj: Partial<D>, capitalIds = true): T {
  return caseConverter(obj, { type: 'toCamel', capitalIds });
}

export function convertToSnakeCase<T extends Record<string, any> = Record<string, any>, D extends Record<string, any> = Record<string, any>>(obj: Partial<D>, capitalIds = true): T {
  return caseConverter(obj, { type: 'toSnake', capitalIds });
}

/**
 * Converts a camelCase string to PascalCase.
 * Example: "authorUserId" → "AuthorUserId"
 */
export function toPascalCase(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Converts a PascalCase string to camelCase.
 * Example: "AuthorUserId" → "authorUserId"
 */
export function fromPascalCase(str: string): string {
  if (!str) return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * Recursively converts object keys between camelCase and PascalCase.
 * Used for /communications, /messages, /texts, /procs endpoints.
 */
export function pascalCaseConverter<T>(
  obj: T,
  direction: 'toPascal' | 'fromPascal'
): T {
  const caseFn = direction === 'toPascal' ? toPascalCase : fromPascalCase;

  if (Array.isArray(obj)) {
    return obj.map(val => pascalCaseConverter(val, direction)) as T;
  }

  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const newKey = caseFn(key);
        result[newKey] = pascalCaseConverter((obj as Record<string, unknown>)[key], direction);
      }
    }
    return result as T;
  }

  return obj;
}

/**
 * Converts camelCase object keys to PascalCase.
 * Used for outgoing requests to /communications, /messages, /texts endpoints.
 * Example: { authorUserId: 1 } → { AuthorUserId: 1 }
 */
export function convertToPascalCase<T extends Record<string, any>>(obj: T): T {
  return pascalCaseConverter(obj, 'toPascal');
}

/**
 * Converts PascalCase object keys to camelCase.
 * Used for incoming responses from /communications, /messages, /texts, /procs endpoints.
 * Example: { AuthorUserId: 1 } → { authorUserId: 1 }
 */
export function convertFromPascalCase<T extends Record<string, any>>(obj: T): T {
  return pascalCaseConverter(obj, 'fromPascal');
}
