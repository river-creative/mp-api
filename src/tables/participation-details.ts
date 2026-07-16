export interface ParticipationDetailsRecord {
  Participation_Detail_ID: number;
  Event_Participant_ID: number;
  Participation_Item_ID: number;
  Numeric_Value: number | null;
  Notes: string | null;
  /** Structured JSON payload for the participation detail. `Notes` stays the human-readable note. */
  Data: string | null;
}

export interface ParticipationDetails {
  participationDetailID: number;
  eventParticipantID: number;
  participationItemID: number;
  numericValue: number | null;
  notes: string | null;
  /** Structured JSON payload for the participation detail. `notes` stays the human-readable note. */
  data: string | null;
}
