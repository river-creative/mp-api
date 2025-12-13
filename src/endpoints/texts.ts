/**
 * TextInfo - Request payload for POST /texts.
 * Sends SMS/MMS messages to phone numbers.
 * Uses camelCase internally; converted to PascalCase for API.
 *
 * API expects: FromPhoneNumberId, ToPhoneNumbers, Message, StartDate
 */
export interface TextInfo {
  /** MP phone number ID for outbound messages. */
  fromPhoneNumberId: number;
  /** Array of recipient phone numbers in E.164 format (e.g., "+15551234567"). */
  toPhoneNumbers: string[];
  /** Message content (SMS character limits apply). */
  message: string;
  /** ISO datetime to send. Future date = scheduled. */
  startDate?: string;
}
