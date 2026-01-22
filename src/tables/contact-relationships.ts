export interface ContactRelationshipRecord {
	Contact_Relationship_ID: number;
	Contact_ID: number;
	Relationship_ID: number;
	Related_Contact_ID: number;
	Start_Date: string | null;
	End_Date: string | null;
	Notes: string | null;
	_Triggered_By: number | null;
}


export interface ContactRelationship {
	contactRelationshipID: number;
	contactID: number;
	relationshipID: number;
	relatedContactID: number;
	startDate: string | null;
	endDate: string | null;
	notes: string | null;
	readonly _triggeredBy: number | null;
}
