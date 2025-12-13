/**
 * MessageAddress - Email address with display name.
 * Used for FromAddress, ToAddresses, and ReplyToAddress.
 *
 * API expects/returns: DisplayName, Address (PascalCase)
 */
export interface MessageAddress {
  /** Display name shown in email client. */
  displayName: string;
  /** Email address. */
  address: string;
}

/**
 * MessageInfo - Request payload for POST /messages.
 * Sends emails directly by email address (bypasses MP contacts).
 * Uses camelCase internally; converted to PascalCase for API.
 *
 * API expects: FromAddress, ToAddresses, ReplyToAddress, Subject, Body, StartDate
 */
export interface MessageInfo {
  /** Sender email address and display name. */
  fromAddress: MessageAddress;
  /** Array of recipient email addresses. */
  toAddresses: MessageAddress[];
  /** Reply-to email address (optional). */
  replyToAddress?: MessageAddress;
  /** Email subject line. */
  subject: string;
  /** Email body content (HTML supported). */
  body: string;
  /** ISO datetime to send. Future date = scheduled. */
  startDate?: string;
}
