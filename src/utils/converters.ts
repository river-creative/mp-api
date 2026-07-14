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

export function toCapitalSnakeCase(str: string, { capitalIds = false }: { capitalIds?: boolean } = {}) {
  str = str.replace(/(?<=^_|^__)[^\W_]/, match => match.at(0)?.toUpperCase() || '');
  str = str.replace(/(?<!_|\/)(ID|[A-Z]|\d)/g, match => `_${match}`);
  str = str.charAt(0).toUpperCase() + str.slice(1);
  return capitalIds ? str.replace(/_id$/i, '_ID') : str;
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
