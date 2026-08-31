# Apps Script: `matchContact` — server-side contact matching

**Original request:** "Create a new service `matchContact` as alternative to `findContact` but use the
parameters as in `api_Custom_MatchContact.sql`."

**Deliverable:** `dev/mp-google-match-contact.js` — a third file in the shared Apps Script library,
alongside `mp-google.js` (helpers, credentials) and `mp-google-procedures.js` (`executeProcedure`).
Consumed as `MinistryPlatform.matchContact(person, options)`.

## 1. What it replaces

`findContact` (the library's finder: `getContacts` → `getAllContactEmailAddresses` →
`getMatchCount`/`byNames`/`splitDuplicates`) pulls candidates and scores them in Apps Script.
`matchContact` hands the whole search to `api_Custom_MatchContact` and gets ranked candidates with a
per-identifier score breakdown, in **one** round trip instead of a name query plus one email read per
candidate. Same verdict shape — `{ contact, duplicates, results }` — plus `nearMisses`.

Rows are the procedure's own 25 columns in the library's camelCase, not full contact records; the
rest of a record is one `getContact(contact.contactId)` away.

## 2. Contract, read from the source (no assumptions)

`~/dev/mp/mp-mssql/Routines/Form Responses Contact Finder/Stored Procedures/api_Custom_MatchContact.sql`

**Parameters** — all 14 caller-settable ones are exposed. `@DomainID` is not: MP injects it
server-side and scopes it to the authenticated client (stated in the procedure's own comment).
An option the caller does not set is **not sent**, so the default declared in the .sql applies — that
file stays the single source of truth for defaults.

| Sent as | From | Procedure default |
|---|---|---|
| `@FirstName`, `@LastName` | `person.firstName/lastName` | required |
| `@Email`, `@Phone`, `@DateOfBirth` | `person.emailAddress/phoneNumber/dateOfBirth` | NULL |
| `@AddressLine1`, `@City`, `@PostalCode` | `person.addressLine1/city/postalCode` | NULL |
| `@MinimumMatchScore` | `options.minimumMatchScore` | `COMMON/MinimumContactMatchScore`, else 90 |
| `@MinIdentifierCount` | `options.minIdentifierCount` | 1 |
| `@UseLevenshtein` | `options.useLevenshtein` | 1 |
| `@IncludeNearMiss` | `options.includeNearMiss` | 0 |
| `@NearMissMinimumScore` | `options.nearMissMinimumScore` | 70 |
| `@Debug` | `options.debug` | 0 |

Address parameter sizes match the MP columns exactly (`Address_Line_1` 75, `City` 50,
`Postal_Code` 15 — checked against `dev/MP_Tables_And_Columns_Info.csv`).

**Result columns — 25**, verified byte-identical across all three of the procedure's output blocks:
`Contact_ID, Participant_Record, Display_Name, First_Name, Nickname, Last_Name, Gender,
Date_of_Birth, Email_Address, Mobile_Phone, Image_File_ID, ID_Card, Ministry_Safe_ID, Populi_ID,
Planning_Center_ID, Total_Score, First_Name_Score, First_Name_Method, Last_Name_Score,
Last_Name_Method, Email_Score, Phone_Score, DOB_Score, Address_Score, Match_Pass`.

## 3. The four traps, and how each is closed

1. **`NEAR_MISS` rows are rejects, not matches.** They failed the accept filter; treating one as a
   match binds to a stranger. They are split into their own `nearMisses` field, so no caller can
   reach one through `contact`, `duplicates` or `results`.
2. **An empty result is ambiguous** — the procedure returns nothing both when validation failed and
   when nobody matched. So `matchContact` applies the procedure's own gates *before* calling and
   throws with the reason: both names required; an email or phone always required (a date of birth
   alone is never enough); `@MinIdentifierCount` respected.
3. **The phone gate counts cleaned characters, not raw ones.** Mirrored from
   `dbo.util_CleanPhoneNumber` (strips ` -().+` and `ext`, drops a leading `1` at 11 chars) — *not*
   the library's `cleanPhoneNumber`, which strips every non-digit and disagrees: `555-CALL` cleans to
   `555` there and `555CALL` here. Testing raw length is the bug the procedure fixed on 2026-07-25.
4. **`@Debug = 1` shifts the result sets.** It emits diagnostics first, and the `#FastResults` /
   `#FuzzyResults` dumps carry `Contact_ID` too — so the candidate set is picked **by shape** (a row
   with `contactId` and no `phase`), never by index. A `VALIDATION_ERROR` set is raised as an error.

Also: a date of birth given as `YYYY-MM-DD` is passed through verbatim rather than re-parsed —
`new Date('1980-05-04')` is UTC midnight and shifts a day back in any timezone behind UTC.

## 4. Verification

Offline harness: all three library files loaded into one shared scope (as the Apps Script library
runs) with a stubbed `API.call`. 11 checks, all passing:

- parameters sent trimmed, only when supplied; full 14-parameter surface maps 1:1; booleans → BIT 1/0
- all 25 columns survive `convertToCamelCase` with the expected keys (`DOB_Score`→`dobScore`,
  `ID_Card`→`idCard`, `Date_of_Birth`→`dateOfBirth`, `Image_File_ID`→`imageFileId`, …)
- highest `Total_Score` wins regardless of row order; the rest become `duplicates`
- `NEAR_MISS` rows never appear as `contact`/`duplicates`/`results`
- with `debug`, the `#FastResults` dump is skipped and the real set found; `VALIDATION_ERROR` throws
- empty response → `contact` undefined, arrays empty
- every fail-fast gate: names, strong identifier, `(12) 3456` → 6 chars rejected, identifier count,
  option types, unreadable date, non-object person
- phone cleaning matches `util_CleanPhoneNumber` (and demonstrably differs from `cleanPhoneNumber`)
- `dateOfBirth` normalises with no timezone shift; email gate matches `LIKE '%_@_%.%'` edge cases

`node --check` passes; no top-level global collides across the three library files.

## 5. Notes

- Apps Script libraries export global **function declarations** and `var` globals only. So
  `MinistryPlatform.matchContact(...)` is reachable, the `_`-suffixed helpers are private, and the
  top-level `const MATCH_CONTACT_PROCEDURE` is internal. This is also why `MinistryPlatform.initiated`
  works — `initiated` is a `var` (mp-google.js:1).
- MP-side the procedure must be registered under System Setup → API Procedures and linked to a
  security role held by the API client, or it is not callable.

## Todo

- [x] Read the procedure: parameters, validation gates, all three output blocks
- [x] Read `util_CleanPhoneNumber` rather than assume "digits"
- [x] Write `dev/mp-google-match-contact.js`
- [x] Syntax check, cross-file global collision check
- [x] Verify behaviour offline (11 checks)
- [ ] Run `test_matchContact()` in the Apps Script project against the live instance
