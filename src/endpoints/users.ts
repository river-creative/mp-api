/**
 * Users API types — `GET /users`, `GET /users/{userId}`, `PUT /users/{userId}`,
 * `POST /users/{userId}/set-user-password`.
 *
 * These four operations are the whole Users surface MP exposes. There is deliberately no create:
 * the deployed API's own documentation (`Platform.Web.Services.PowerService.UsersController`)
 * declares only the two reads, the update and the password setter, so a new account has to be
 * minted through a stored procedure or MP's hosted sign-up pages.
 *
 * Unlike the table endpoints, these carry **DTOs, not column rows** — MP spells their keys
 * PascalCase (`FirstName`), not the capital-snake column style (`First_Name`). They are therefore
 * converted with `convertToPascalCase` / `convertFromPascalCase`, the same pair the communications
 * endpoints use.
 */

/**
 * UserIdentifier — a row from `GET /users`. MP's own name for this shape is `UserItem`.
 * Uses camelCase internally; API returns PascalCase.
 *
 * API returns: Id, Name, LogOnName, UniqueId
 */
export interface UserIdentifier {
  /** dp_Users.User_ID. */
  id: number;
  /** Display name (MP formats it "Last, First"). */
  name: string;
  /** The login name — dp_Users.User_Name. */
  logOnName: string;
  /** dp_Users.User_GUID — the same value OIDC returns as the `sub` claim. */
  uniqueId: string;
}

/**
 * UserInfo — the payload of `GET /users/{userId}` and `PUT /users/{userId}`.
 *
 * It spans two tables: the name/contact fields are written to the user's **Contact**, the login
 * fields to **dp_Users**. Every field is optional *in this type* — but MP's own contract marks
 * `FirstName`, `LastName`, `MobilePhone`, `EmailAddress` and `UserName` **required** on the PUT, and
 * `UserInfo.Validate` enforces it, so a partial update may well be refused. Unverified here because
 * confirming it means writing to a live account; verify against a disposable login before relying on
 * a partial edit. Note also that `getUser` returns `null` for an unset FirstName/LastName, so a naive
 * read-modify-write sends nulls into required fields.
 *
 * `newPassword` is accepted here by MP, but prefer `setUserPassword()` for password changes: it is
 * the operation MP documents for it, and it can validate the old password.
 */
export interface UserInfo {
  /** dp_Users.User_ID. Read-only — the URL carries the identifier on update. */
  userId?: number;
  /** The contact this login belongs to. Read-only. */
  contactId?: number;
  /** Contact first name (required by MP when creating the contact side). */
  firstName?: string;
  middleName?: string;
  /** Contact last name. */
  lastName?: string;
  nickname?: string;
  prefixId?: number | null;
  /** Resolved prefix text. Read-only. */
  prefix?: string;
  suffixId?: number | null;
  /** Resolved suffix text. Read-only. */
  suffix?: string;
  genderId?: number | null;
  /** Resolved gender text. Read-only. */
  gender?: string;
  maritalStatusId?: number | null;
  /** Resolved marital-status text. Read-only. */
  maritalStatus?: string;
  /** ISO date string. */
  dateOfBirth?: string | null;
  mobilePhone?: string | null;
  workPhone?: string | null;
  homePhone?: string | null;
  emailAddress?: string | null;
  /** The login name. */
  userName?: string;
  /** Set a new password as part of the update, or omit to leave it unchanged. */
  newPassword?: string;
  /** Windows time-zone id, or an empty string to clear it. */
  timeZoneId?: string | null;
  /** UI culture, or an empty string to clear it. */
  locale?: string | null;
  theme?: string | null;
  /** Texting compliance level. */
  textingOptInTypeId?: number | null;
  isEmailUnlisted?: boolean;
  isMobilePhoneUnlisted?: boolean;
  doNotSendTexts?: boolean;
  doNotSendEmails?: boolean;
  removeFromDirectory?: boolean;
  /** Contact full name. Read-only. */
  displayName?: string;
  /** UniqueFileId of the user's photo. Read-only. */
  profilePhotoUniqueId?: string | null;
  /** Read-only. */
  isEmailVerified?: boolean;
  /** Read-only. */
  isMobilePhoneVerified?: boolean;
  /** Read-only. */
  isAdmin?: boolean;
}

/**
 * PasswordInfo — the body of `POST /users/{userId}/set-user-password`.
 *
 * Omit `oldPassword` to set the password without validating the previous one (an administrative
 * reset); supply it to require the user's current password (a self-service change).
 */
export interface PasswordInfo {
  newPassword: string;
  oldPassword?: string;
}

/**
 * Search terms for `GET /users`. At least one is required — MP needs something to match on.
 * Both accept `*` and `?` wildcards.
 *
 * Sent to MP **dollar-prefixed** (`$name`, `$logOnName`) — the library handles that, but it is the
 * thing to check first if a search ever appears to match everything: MP ignores a parameter it cannot
 * bind rather than rejecting it, so the unprefixed spelling silently reads as "no filter" and returns
 * every user the client may see. Measured: `$logOnName=mpadmin` → 1 row, `$logOnName=zzz…` → 0 rows,
 * `logOnName=mpadmin` → all 104.
 */
export interface UserSearch {
  /** Matched against the display name. */
  name?: string;
  /** Matched against the login name. */
  logOnName?: string;
}
