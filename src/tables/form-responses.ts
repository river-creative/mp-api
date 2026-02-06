
export interface FormResponseRecord {
  Form_Response_ID: number;
  Form_ID: number;
  Response_Date: string;
  IP_Address: string | null;
  Contact_ID: number;
  First_Name: string;
  Last_Name: string;
  Email_Address: string | null;
  Phone_Number: string | null;
  Address_Line_1: string | null;
  Address_Line_2: string | null;
  Address_City: string | null;
  Address_State: string | null;
  Address_Zip: number | null;
  Country_Code: string | null;
  Event_ID: number| null;
  Pledge_Campaign_ID: null;
  Opportunity_ID: null;
  Opportunity_Response: null;
  Congregation_ID: number;
  Notification_Sent: boolean;
  Expires: null;
  Event_Participant_ID: number | null;
}


export interface FormResponse {
  formResponseID: number;
  formID: number;
  responseDate: string;
  ipAddress: string | null;
  contactID: number;
  firstName: string;
  lastName: string;
  emailAddress: string | null;
  phoneNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  countryCode: string | null;
  eventID: number| null;
  pledgeCampaignID: null;
  opportunityID: null;
  opportunityResponse: null;
  congregationID: number;
  notificationSent: boolean;
  expires: null;
  eventParticipantID: number | null;
}