/**
 * MinistryPlatform contact matching — `api_Custom_MatchContact`.
 *
 * A server-side alternative to `findContact`. Where that pulls candidates over `/tables/contacts`
 * and scores them here in Apps Script, this hands the whole search to the stored procedure and gets
 * back ranked candidates with a per-identifier score breakdown — in ONE round trip instead of a
 * name query plus an email read per candidate.
 *
 * Same verdict shape as `findContact` — `{ contact, duplicates, results }` — plus `nearMisses`, so
 * a caller can swap one for the other. The rows are the procedure's own columns in the library's
 * camelCase, NOT full contact records: the procedure returns 25 columns (identity, names,
 * demographics, contact details, external ids, scores), so `getContact(contact.contactId)` is the
 * way to the rest of the record.
 *
 * Companion to `mp-google.js` (helpers) and `mp-google-procedures.js` (`executeProcedure`) — all
 * three belong to the same Apps Script library project. Credentials are whatever the consumer
 * already set through `setCredentials`; this file never touches them.
 *
 *   MinistryPlatform.matchContact({ firstName, lastName, emailAddress })
 *
 * MP-side, the procedure must be registered under System Setup → API Procedures and linked to a
 * security role held by the API client, or it is not callable.
 */

const MATCH_CONTACT_PROCEDURE = 'api_Custom_MatchContact';


/**
 * Matches a person against MP's contacts through the scored two-pass matcher.
 *
 * The procedure runs a fast pass (exact / prefix / reverse-prefix / contains) and falls back to a
 * fuzzy pass (adding Levenshtein and SOUNDEX) only when the fast pass finds nobody, so
 * `contact.matchPass` says which pass produced the answer.
 *
 * Every parameter the procedure declares is settable except `@DomainID`, which MP injects
 * server-side and scopes to the authenticated client. Anything left unset is simply not sent, so
 * the default declared in `api_Custom_MatchContact.sql` applies — that file stays the single source
 * of truth for the defaults.
 *
 * @param {MatchContactPerson} person - { firstName, lastName, emailAddress, phoneNumber, dateOfBirth, addressLine1, city, postalCode }
 * @param {MatchContactOptions} [options] - { minimumMatchScore, minIdentifierCount, useLevenshtein, includeNearMiss, nearMissMinimumScore, debug }
 *
 * @returns {MatchContactResult} result - { contact, duplicates, results, nearMisses }
 */
function matchContact(person, options = {}) {

  const input = toMatchContactInput_(person, options);
  const resultSets = executeProcedure(MATCH_CONTACT_PROCEDURE, input, { camelCase: true });

  // Only reachable with { debug: true } — see findMatchValidationError_.
  const validationError = findMatchValidationError_(resultSets);
  if (validationError)
    throw new Error(`${MATCH_CONTACT_PROCEDURE} rejected the search: ${validationError}`);

  const rows = selectMatchRows_(resultSets);

  // Near-miss rows deliberately FAILED the accept filter. They are kept in their own field so that
  // no caller can reach one through `contact` or `duplicates` — treating one as a match is how a
  // registration binds to a stranger.
  const results = rows.filter(row => row.matchPass !== 'NEAR_MISS').sort(byTotalScoreDesc_);
  const nearMisses = rows.filter(row => row.matchPass === 'NEAR_MISS').sort(byTotalScoreDesc_);

  // The procedure already orders by Total_Score DESC; re-sorting here makes `results[0]` the top
  // scorer by construction rather than by trusting the transport to preserve row order.
  const [contact, ...duplicates] = results;

  logMatchOutcome_(person, contact, duplicates, nearMisses);

  return { contact, duplicates, results, nearMisses };
}




/**
 * Builds the procedure's parameter set, and refuses a search the procedure would reject anyway.
 *
 * The gates are checked HERE because the procedure signals a rejected search by returning no result
 * set at all — indistinguishable from "nobody matched" unless `debug` is on. Failing before the call
 * turns that silence into the actual reason.
 */
function toMatchContactInput_(person, options = {}) {

  if (person === null || typeof person !== 'object' || Array.isArray(person))
    throw new Error(`matchContact requires a person object, received: ${JSON.stringify(person)}`);

  if (options === null || typeof options !== 'object' || Array.isArray(options))
    throw new Error(`matchContact options must be an object, received: ${JSON.stringify(options)}`);

  const firstName = trimmedValue_(person.firstName);
  const lastName = trimmedValue_(person.lastName);
  const emailAddress = trimmedValue_(person.emailAddress);
  const phoneNumber = trimmedValue_(person.phoneNumber);
  const dateOfBirth = toMatchDate_(person.dateOfBirth);

  assertMatchable_({ firstName, lastName, emailAddress, phoneNumber, dateOfBirth }, options);

  const input = { '@FirstName': firstName, '@LastName': lastName };

  if (emailAddress) input['@Email'] = emailAddress;
  if (phoneNumber) input['@Phone'] = phoneNumber;
  if (dateOfBirth) input['@DateOfBirth'] = dateOfBirth;

  // Address never qualifies a candidate — it only adds score to one that already qualified — so it
  // is optional in every sense: supplying it can promote the right person above a namesake, and
  // omitting it can never lose a match.
  const addressLine1 = trimmedValue_(person.addressLine1);
  const city = trimmedValue_(person.city);
  const postalCode = trimmedValue_(person.postalCode);
  if (addressLine1) input['@AddressLine1'] = addressLine1;
  if (city) input['@City'] = city;
  if (postalCode) input['@PostalCode'] = postalCode;

  if (options.minimumMatchScore !== undefined) input['@MinimumMatchScore'] = toMatchInteger_(options.minimumMatchScore, 'minimumMatchScore');
  if (options.minIdentifierCount !== undefined) input['@MinIdentifierCount'] = toMatchInteger_(options.minIdentifierCount, 'minIdentifierCount');
  if (options.useLevenshtein !== undefined) input['@UseLevenshtein'] = toMatchBit_(options.useLevenshtein, 'useLevenshtein');
  if (options.includeNearMiss !== undefined) input['@IncludeNearMiss'] = toMatchBit_(options.includeNearMiss, 'includeNearMiss');
  if (options.nearMissMinimumScore !== undefined) input['@NearMissMinimumScore'] = toMatchInteger_(options.nearMissMinimumScore, 'nearMissMinimumScore');
  if (options.debug !== undefined) input['@Debug'] = toMatchBit_(options.debug, 'debug');

  return input;
}


/**
 * The procedure's own validation gates, restated: both names, and at least `minIdentifierCount` of
 * (email, phone, date of birth) of which at least one must be the email or the phone.
 *
 * A date of birth alone is never enough at any threshold — thousands of contacts share one, so
 * "same name + same birth date" is a coincidence, while an email or a phone is near-unique.
 * The messages mirror the procedure's own so the two read the same in a log.
 */
function assertMatchable_({ firstName, lastName, emailAddress, phoneNumber, dateOfBirth }, options = {}) {

  if (!firstName || !lastName)
    throw new Error(`matchContact requires both a firstName and a lastName, received: ${JSON.stringify({ firstName, lastName })}`);

  const cleanPhone = cleanPhoneForMatchGate_(phoneNumber);
  const hasEmail = isMatchableEmail_(emailAddress);
  const hasPhone = cleanPhone.length >= 7;
  const identifierCount = [hasEmail, hasPhone, Boolean(dateOfBirth)].filter(Boolean).length;

  if (!hasEmail && !hasPhone) {
    // Called out separately: a caller that supplied what it believes is a phone number needs to be
    // told the number is unusable, not that it forgot to supply one.
    if (phoneNumber && !emailAddress)
      throw new Error(`The phone number has fewer than 7 characters once formatting is removed (${cleanPhone}), so it cannot identify anyone. Supply a complete phone number or an email address.`);
    throw new Error(`matchContact requires an email address or a phone number; a date of birth alone is not sufficient to identify a person.`);
  }

  // 1 mirrors the procedure's declared default for @MinIdentifierCount, and is only consulted when
  // the caller did not set it (in which case nothing is sent and the procedure applies its own).
  // Should that default ever rise, this gate is the laxer of the two — it can then only let a call
  // through for the procedure to reject, never reject one the procedure would have accepted.
  const minIdentifierCount = options.minIdentifierCount === undefined ? 1 : options.minIdentifierCount;
  if (identifierCount < minIdentifierCount)
    throw new Error(`Minimum ${minIdentifierCount} of 3 contact identifiers required (email, phone, dateOfBirth). Provided: ${identifierCount}`);
}


/**
 * Mirrors `dbo.util_CleanPhoneNumber`: strip exactly these formatting characters, then drop a
 * leading US country code when 11 characters remain.
 *
 * NOT the library's `cleanPhoneNumber`, which removes every non-digit. The two disagree — '555-CALL'
 * cleans to '555' there and to '555CALL' here — and this gate has to test the same value the
 * procedure will. Testing the raw length instead of the cleaned one is the bug fixed in the
 * procedure on 2026-07-25: '(12) 3456' is 9 characters but only 6 once cleaned, so it passed as the
 * sole strong identifier and then matched nothing.
 *
 * 'ext' is stripped in lowercase only, exactly as the SQL literal is written. Under a
 * case-insensitive database collation the procedure also strips 'EXT'/'Ext' and would count fewer
 * characters than this does; erring in that direction is deliberate, since it can only pass a
 * borderline value through to the procedure, never reject one the procedure would have accepted.
 */
function cleanPhoneForMatchGate_(phone) {

  if (!phone) return '';

  const cleaned = String(phone).replace(/[ \-().+]/g, '').replace(/ext/g, '');
  return cleaned.length === 11 && cleaned.charAt(0) === '1' ? cleaned.slice(1) : cleaned;
}


/**
 * Mirrors the procedure's email gate, `@Email LIKE '%_@_%.%'`: at least one character, '@', at least
 * one more character, '.', then anything — including nothing.
 */
function isMatchableEmail_(email) {
  return Boolean(email) && /^.+@.+\..*$/.test(email);
}


/**
 * Normalises a date of birth for the `DATE` parameter.
 *
 * A 'YYYY-MM-DD' (or 'YYYY-MM-DDTHH:mm:ss') string is passed through verbatim: routing it through
 * `Date` would parse it as UTC midnight and shift it to the previous day for any script timezone
 * behind UTC — a birth date silently off by one is a match quietly lost.
 */
function toMatchDate_(value) {

  if (value === undefined || value === null || value === '') return '';

  if (typeof value === 'string') {
    const isoDate = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoDate) return isoDate[1];
  }

  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime()))
    throw new Error(`matchContact received a dateOfBirth it cannot read: ${JSON.stringify(value)}`);

  const pad = number => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}


function toMatchInteger_(value, name) {

  if (typeof value !== 'number' || !Number.isInteger(value))
    throw new Error(`matchContact option '${name}' must be an integer, received: ${JSON.stringify(value)}`);

  return value;
}


function toMatchBit_(value, name) {

  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value === 0 || value === 1) return value;

  throw new Error(`matchContact option '${name}' must be true or false, received: ${JSON.stringify(value)}`);
}


/**
 * Picks the candidate set out of what the procedure emitted.
 *
 * With `debug` on it emits its diagnostic sets FIRST, and the #FastResults / #FuzzyResults dumps
 * carry Contact_ID as well — so the set is identified by shape, not by index: only the emitted
 * result sets carry a contact WITHOUT the 'Phase' column every debug set adds. Correct with debug
 * on or off.
 */
function selectMatchRows_(resultSets) {
  return resultSets.find(rows => rows.length && rows[0].contactId !== undefined && rows[0].phase === undefined) || [];
}


/**
 * The procedure's own validation message, when it emitted one.
 *
 * Only ever present with `{ debug: true }` — without it a rejected search is signalled by returning
 * nothing at all, which is why `assertMatchable_` applies the same gates before the call.
 */
function findMatchValidationError_(resultSets) {

  const rows = resultSets.find(set => set.length && set[0].phase === 'VALIDATION_ERROR');
  return rows ? rows[0].message : '';
}


function byTotalScoreDesc_(a, b) {
  return (b.totalScore || 0) - (a.totalScore || 0);
}


function trimmedValue_(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}


function logMatchOutcome_(person, contact, duplicates, nearMisses) {

  const name = `${person.firstName} ${person.lastName}`;

  if (contact)
    console.log('✔️ ', `Contact matched: ${name}`, { contactId: contact.contactId, totalScore: contact.totalScore, matchPass: contact.matchPass });
  else
    console.log('❌ ', `Contact Not Found: ${name}`);

  if (duplicates.length)
    console.log('🎭 ', `Duplicate Contacts [${duplicates.length}] ${name}`, duplicates.map(row => row.contactId));

  // Equal top scores mean the procedure ranked nobody first, so `results[0]` is an arbitrary pick
  // between two people — exactly the case a human should look at.
  if (contact && duplicates.length && duplicates[0].totalScore === contact.totalScore)
    console.log('⚖️ ', `Tied top score [${contact.totalScore}] ${name} — matched contact chosen arbitrarily`, [contact.contactId, duplicates[0].contactId]);

  if (nearMisses.length)
    console.log('🔎 ', `Near misses [${nearMisses.length}] ${name} — rejected candidates, NOT matches`, nearMisses.map(row => row.contactId));
}




/**
* @typedef MatchContactPerson
*
* @property {string} firstName - required
* @property {string} lastName - required
* @property {string} [emailAddress] - an email or a phone is always required
* @property {string} [phoneNumber] - needs 7+ characters once formatting is removed to count
* @property {(string|Date)} [dateOfBirth] - an identifier, but never sufficient on its own
* @property {string} [addressLine1] - scoring only, never qualifies a candidate
* @property {string} [city] - scoring only
* @property {string} [postalCode] - scoring only
*/

/**
* @typedef MatchContactOptions
*
* @property {number} [minimumMatchScore] - accept threshold; unset uses COMMON/MinimumContactMatchScore (90 if unset MP-side)
* @property {number} [minIdentifierCount] - how many of email/phone/dateOfBirth are required (procedure default 1)
* @property {boolean} [useLevenshtein] - false skips the Levenshtein tiers; SOUNDEX still runs (procedure default true)
* @property {boolean} [includeNearMiss] - true returns the top 10 REJECTED candidates as nearMisses (procedure default false)
* @property {number} [nearMissMinimumScore] - floor for that list, only read when includeNearMiss is on (procedure default 70)
* @property {boolean} [debug] - adds the procedure's diagnostic result sets, including why a search was rejected
*/

/**
* @typedef ContactMatch
*
* @property {number} contactId
* @property {number | null} participantRecord
* @property {string | null} displayName
* @property {string | null} firstName
* @property {string | null} nickname
* @property {string | null} lastName
* @property {string | null} gender
* @property {string | null} dateOfBirth
* @property {string | null} emailAddress
* @property {string | null} mobilePhone
* @property {string | null} imageFileId
* @property {string | null} idCard
* @property {string | null} ministrySafeId
* @property {string | null} populiId
* @property {string | null} planningCenterId
* @property {number} totalScore
* @property {number} firstNameScore
* @property {string | null} firstNameMethod
* @property {number} lastNameScore
* @property {string | null} lastNameMethod
* @property {number} emailScore - > 0 when the supplied email is what matched this contact
* @property {number} phoneScore
* @property {number} dobScore
* @property {number} addressScore
* @property {('FAST_MATCH'|'FUZZY_MATCH'|'NEAR_MISS')} matchPass
*/

/**
* @typedef MatchContactResult
*
* @property {ContactMatch | undefined} contact - highest scoring accepted match
* @property {ContactMatch[]} duplicates - the remaining accepted matches, best first
* @property {ContactMatch[]} results - every accepted match, best first (includes contact)
* @property {ContactMatch[]} nearMisses - REJECTED candidates; only populated with includeNearMiss
*/




function test_matchContact() {

  testSetCredentials_();

  const person = {
    firstName: 'Sandra',
    lastName: 'Bauer',
    emailAddress: 'Bzznessminded@yahoo.com'
  };

  const { contact, duplicates, results, nearMisses } = matchContact(person, { includeNearMiss: true });

  Logger.log(JSON.stringify({
    contact,
    duplicates: duplicates.map(row => row.contactId),
    results: results.length,
    nearMisses: nearMisses.map(row => ({ contactId: row.contactId, totalScore: row.totalScore }))
  }, null, 2));
}
