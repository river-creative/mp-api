/**
 * Communication type enum.
 * Determines the delivery method for the communication.
 */
export type CommunicationType = 'Unknown' | 'Email' | 'SMS' | 'RssFeed' | 'GlobalMFA';

/**
 * Communication status enum.
 * Represents the current state of a communication.
 */
export type CommunicationStatus = 'Unknown' | 'Draft' | 'InReview' | 'ReadyToSend' | 'Sent';

/**
 * Texting compliance level enum.
 * Controls how bulk opt-out messages are filtered.
 */
export type TextingComplianceLevel = 'None' | 'SingleOptIn' | 'DoubleOptIn';

/**
 * CommunicationInfo - Request payload for POST /communications.
 * Uses camelCase internally; converted to PascalCase for API.
 *
 * API expects: AuthorUserId, FromContactId, CommunicationType, Contacts, etc.
 */
export interface CommunicationInfo {
  /** User ID who authored the communication. */
  authorUserId: number;
  /** Subject line of email or SMS/MMS message content. */
  subject: string;
  /** Body content of the communication (HTML supported for email). */
  body?: string;
  /** Contact ID of the sender. */
  fromContactId: number;
  /** Contact ID for replies. */
  replyToContactId: number;
  /** Delivery type: 'Email' or 'SMS'. */
  communicationType: CommunicationType;
  /** Array of recipient Contact IDs. */
  contacts: number[];
  /** ISO datetime to send. Future date = scheduled. */
  startDate?: string;
  /** Whether this is a bulk email. */
  isBulkEmail?: boolean;
  /** Send to household heads instead of contacts. */
  sendToContactParents?: boolean;
  /** Outbound SMS phone number ID (required for SMS). */
  textPhoneNumberId?: number;
  /** Exclude contacts who opted out of bulk messages. */
  excludeOptedOutOfBulkMessages?: boolean;
  /** Texting compliance filter level (SMS only). */
  textingComplianceLevel?: TextingComplianceLevel;
  /** Timezone for date/time rendering in messages. */
  timeZoneName?: string;
  /** Locale for value formatting in messages. */
  cultureName?: string;
  /** Alternate email type ID. */
  alternateEmailTypeId?: number;
  /** Related publication ID. */
  publicationId?: number;
}

/**
 * Communication - Response model from /communications endpoints.
 * Uses camelCase internally; API returns PascalCase.
 *
 * API returns: CommunicationId, AuthorUserId, AuthorName, Subject, etc.
 */
export interface Communication {
  /** Unique identifier of the communication. */
  communicationId: number;
  /** User ID who authored the communication. */
  authorUserId: number;
  /** Display name of the author (readonly). */
  authorName: string;
  /** Subject line or SMS content. */
  subject: string;
  /** Body content. */
  body?: string;
  /** Start/send date. */
  startDate: string;
  /** Expiration date. */
  expirationDate?: string;
  /** Current status. */
  status?: CommunicationStatus;
  /** Sender contact ID. */
  fromContactId: number;
  /** Sender display name (readonly). */
  fromName: string;
  /** Sender email address (readonly). */
  fromAddress: string;
  /** Reply-to contact ID. */
  replyToContactId: number;
  /** Reply-to display name (readonly). */
  replyToName: string;
  /** Reply-to email address (readonly). */
  replyToAddress: string;
  /** Associated task ID. */
  taskId?: number;
  /** Selection ID for recipients. */
  selectionId?: number;
  /** Single recipient contact ID override. */
  recipientContactId?: number;
  /** Recipient display name (readonly). */
  recipientName?: string;
  /** Send to household heads. */
  sendToContactParents?: boolean;
  /** Exclude opted-out contacts. */
  excludeOptedOutOfBulkMessages?: boolean;
  /** Texting compliance level. */
  textingComplianceLevel?: TextingComplianceLevel;
  /** Timezone for rendering. */
  timeZoneName?: string;
  /** Locale for formatting. */
  cultureName?: string;
  /** Outbound SMS phone number ID. */
  textPhoneNumberId?: number;
  /** Outbound SMS phone number (readonly). */
  textPhoneNumber?: string;
  /** Communication delivery type. */
  communicationType: CommunicationType;
  /** Alternate email type ID. */
  alternateEmailTypeId?: number;
  /** Related publication ID. */
  publicationId?: number;
}
