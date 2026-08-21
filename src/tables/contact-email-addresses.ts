import { DateTimeIsoString } from "../api";
import { Contact } from "./contacts";

export interface ContactEmailAddressRecord {
  Email_Address_ID: number;
  Email_Address: string;
  Contact_ID: number;
  Email_Type_ID?: number;
  /** When this address was recorded. MP's own dp_ procedures stamp it; nothing else does by default. */
  Start_Date?: DateTimeIsoString | null;
  End_Date?: DateTimeIsoString | null;
  Notes?: string | null;
  /** Deliverability, not identity: MP's Email_Status lookup (bounced, blocked, …). */
  Email_Status_ID?: number | null;
  Status_Notes?: string | null;
}

export interface ContactEmailAddress {
  emailAddressID: number;
  emailAddress: string;
  contactID: number;
  emailTypeID?: number;
  /**
   * When this address was recorded.
   *
   * Present on the table and stamped by MP's own procedures, but absent from this type until 0.0.54 —
   * so a caller that wanted to write it could not, and every row the library created landed with a
   * null Start_Date that no dated read could place in time.
   */
  startDate?: DateTimeIsoString | null;
  endDate?: DateTimeIsoString | null;
  notes?: string | null;
  /** Deliverability, not identity: MP's Email_Status lookup (bounced, blocked, …). */
  emailStatusID?: number | null;
  statusNotes?: string | null;
}

export interface ContactWithEmailAddress extends Contact, Omit<ContactEmailAddress, "emailAddress"> {
  alternateEmail: string;
}

export interface ContactWithEmailAddresses extends Contact {
  emailAddresses: string[];
}