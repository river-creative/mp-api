import { AxiosInstance, AxiosRequestConfig } from 'axios';
import { createApiBase, MPApiBase, ErrorDetails, MPGetQuery, MPCreateQuery, MPUpdateQuery, DateTimeIsoString } from './api';
import { convertToCamelCase, convertToSnakeCase, convertToPascalCase, convertFromPascalCase, escapeSql, stringifyURLParams } from './utils/converters';
import { Contact, ContactRecord } from './tables/contacts';
import { Communication, CommunicationInfo, CommunicationType, CommunicationStatus, TextingComplianceLevel } from './endpoints/communications';
import { MessageInfo, MessageAddress } from './endpoints/messages';
import { TextInfo } from './endpoints/texts';
import { ProcedureInfo, ParameterInfo, ParameterDirection, ParameterDataType, ProcedureInput } from './endpoints/procedures';
import { Event, EventRecord } from './tables/events';
import { Group, GroupRecord } from './tables/groups';
import { Address, AddressRecord } from './tables/addresses';
import { Household, HouseholdRecord } from './tables/households';
import { Participant, ParticipantRecord } from './tables/participants';
import { EventParticipant, EventParticipantRecord } from './tables/event-participants';
import { GroupParticipant, GroupParticipantRecord } from './tables/group-participants';
import { ParticipationDetails, ParticipationDetailsRecord } from './tables/participation-details';
import { ContactAttribute, ContactAttributeRecord, ContactWithAttribute } from './tables/contact-attributes';
import { FormResponse, FormResponseRecord } from './tables/form-responses';
import { FormResponseAnswer, FormResponseAnswerRecord } from './tables/from-response-answers';
import { FormField, FormFieldRecord } from './tables/form-fields';
import { ContactRelationship, ContactRelationshipRecord } from './tables/contact-relationships';
import { ContactEmailAddress, ContactEmailAddressRecord, ContactWithEmailAddress, ContactWithEmailAddresses } from './tables/contact-email-addresses';
import { AttachedFile } from './tables/files';


export type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type AtLeastOne<T> = { [K in keyof T]-?: Required<Pick<T, K>> }[keyof T];

export type CreateContactPayload = WithRequired<
  Omit<Partial<Contact>, 'contactID'>,
  'company' | 'displayName'
>;
export type CreateHouseholdPayload = WithRequired<
  Partial<Household>,
  'householdName'
>;
export type CreateAddressPayload = WithRequired<
  Partial<Address>,
  'addressLine1'
>;
export type CreateParticipantPayload = WithRequired<
  Partial<Participant>,
  'contactID' | 'participantTypeID' | 'participantStartDate'
>;
export type CreateEventParticipantPayload = WithRequired<
  Partial<EventParticipant>,
  'eventID' | 'participantID' | 'participationStatusID'
>;
export type CreateGroupParticipantPayload = WithRequired<
  Partial<GroupParticipant>,
  'groupID' | 'participantID' | 'groupRoleID' | 'startDate'
>;
export type CreateParticipationDetailsPayload = WithRequired<
  Partial<ParticipationDetails>,
  'eventParticipantID' | 'participationItemID'
>;
export type CreateContactAttributePayload = WithRequired<
  Partial<ContactAttribute>,
  'attributeID' | 'contactID' | 'startDate'
>;
export type CreateFormResponsePayload = WithRequired<
  Omit<Partial<FormResponse>, 'formResponseID'>,
  'formID' | 'responseDate'
>;
export type CreateFormResponseAnswerPayload = WithRequired<
  Omit<Partial<FormResponseAnswer>, 'formResponseAnswerID'>,
  'formFieldID' | 'formResponseID'
>;
export type CreateFormFieldPayload = WithRequired<
  Omit<Partial<FormField>, 'formFieldID'>,
  'formID' | 'fieldLabel' | 'fieldOrder' | 'fieldTypeID' | 'required'
>;
export type CreateContactEmailAddressPayload = WithRequired<
  Omit<Partial<ContactEmailAddress>, 'emailAddressID'>,
  'emailAddress' | 'contactID'
>;
export type CreateContactRelationshipPayload = WithRequired<
  Omit<Partial<ContactRelationship>, 'contactRelationshipID'>,
  'contactID' | 'relationshipID' | 'relatedContactID'
>;
export type CreateFilePayload = WithRequired<
  Omit<Partial<AttachedFile>, 'FileId'>,
  'Description' | 'IsDefaultImage'
>;

// Communications API payload types
export type CreateCommunicationPayload = WithRequired<
  CommunicationInfo,
  'authorUserId' | 'subject' | 'fromContactId' | 'replyToContactId' | 'communicationType' | 'contacts'
>;
export type CreateMessagePayload = WithRequired<
  MessageInfo,
  'fromAddress' | 'toAddresses' | 'subject' | 'body'
>;
export type CreateTextPayload = WithRequired<
  TextInfo,
  'fromPhoneNumberId' | 'toPhoneNumbers' | 'message'
>;


export interface ContactDetails extends Contact, Participant, Household {
  householdID: number;
  gender: 'Male' | 'Female' | null;
  memberStatus: string;
  maritalStatus: string;
  imageID: string | null;
}


export type MPInstance = {

  get: AxiosInstance['get'];
  put: AxiosInstance['put'];
  post: AxiosInstance['post'];
  createOne: MPApiBase['createOne'];
  createMany: MPApiBase['createMany'];
  updateMany: MPApiBase['updateMany'];
  getOne: MPApiBase['getOne'];
  getMany: MPApiBase['getMany'];
  createFile: MPApiBase['createFile'];
  updateFile: MPApiBase['updateFile'];

  getContact(
    id: number,
    mpQuery?: MPGetQuery
  ): Promise<Contact | undefined | { error: ErrorDetails; }>;
  getContactDetails(
    id: number,
    mpQuery?: MPGetQuery
  ): Promise<ContactDetails | undefined | { error: ErrorDetails; }>;
  getContactAttribute(
    id: number,
    mpQuery?: MPGetQuery
  ): Promise<ContactAttribute | undefined | { error: ErrorDetails; }>;
  getContactEmailAddress(
    id: number,
    mpQuery?: MPGetQuery
  ): Promise<ContactEmailAddress | undefined | { error: ErrorDetails; }>;
  getHousehold(
    id: number,
    mpQuery?: MPGetQuery
  ): Promise<Household | undefined | { error: ErrorDetails; }>;
  getAddress(
    id: number,
    mpQuery?: MPGetQuery
  ): Promise<Address | undefined | { error: ErrorDetails; }>;
  getParticipant(
    id: number,
    mpQuery?: MPGetQuery
  ): Promise<Participant | undefined | { error: ErrorDetails; }>;
  getEvent(
    id: number,
    mpQuery?: MPGetQuery
  ): Promise<Event | undefined | { error: ErrorDetails; }>;
  getGroup(
    id: number,
    mpQuery?: MPGetQuery
  ): Promise<Group | undefined | { error: ErrorDetails; }>;
  getEventParticipant(
    id: number,
    mpQuery?: MPGetQuery
  ): Promise<EventParticipant | undefined | { error: ErrorDetails; }>;
  getGroupParticipant(
    id: number,
    mpQuery?: MPGetQuery
  ): Promise<GroupParticipant | undefined | { error: ErrorDetails; }>;
  getParticipationDetail(
    id: number,
    mpQuery?: MPGetQuery
  ): Promise<ParticipationDetails | undefined | { error: ErrorDetails; }>;
  getFormResponse(
    id: number,
    mpQuery?: MPGetQuery
  ): Promise<FormResponse | undefined | { error: ErrorDetails; }>;
  getFormField(
    id: number,
    mpQuery?: MPGetQuery
  ): Promise<FormField | undefined | { error: ErrorDetails; }>;
  getContactRelationship(
    id: number,
    mpQuery?: MPGetQuery
  ): Promise<ContactRelationship | undefined | { error: ErrorDetails; }>;

  getContacts(
    mpQuery: AtLeastOne<MPGetQuery>
  ): Promise<Contact[] | { error: ErrorDetails; }>;
  getContactAttributes(
    mpQuery: AtLeastOne<MPGetQuery>
  ): Promise<ContactAttribute[] | { error: ErrorDetails; }>;
  getContactsWithAttributes(
    mpQuery: AtLeastOne<Omit<MPGetQuery, "select">>
  ): Promise<ContactWithAttribute[] | { error: ErrorDetails; }>;
  getContactEmailAddresses(
    mpQuery: AtLeastOne<MPGetQuery>
  ): Promise<ContactEmailAddress[] | { error: ErrorDetails; }>;
  getContactsWithEmailAddress(
    mpQuery: AtLeastOne<Omit<MPGetQuery, "select">>
  ): Promise<ContactWithEmailAddress[] | { error: ErrorDetails; }>;
  getHouseholds(
    mpQuery: AtLeastOne<MPGetQuery>
  ): Promise<Household[] | { error: ErrorDetails; }>;
  getAddresses(
    mpQuery: AtLeastOne<MPGetQuery>
  ): Promise<Address[] | { error: ErrorDetails; }>;
  getParticipants(
    mpQuery: AtLeastOne<MPGetQuery>
  ): Promise<Participant[] | { error: ErrorDetails; }>;
  getEvents(
    mpQuery: AtLeastOne<MPGetQuery>
  ): Promise<Event[] | { error: ErrorDetails; }>;
  getGroups(
    mpQuery: AtLeastOne<MPGetQuery>
  ): Promise<Group[] | { error: ErrorDetails; }>;
  getEventParticipants(
    mpQuery: AtLeastOne<MPGetQuery>
  ): Promise<EventParticipant[] | { error: ErrorDetails; }>;
  getGroupParticipants(
    mpQuery: AtLeastOne<MPGetQuery>
  ): Promise<GroupParticipant[] | { error: ErrorDetails; }>;
  getFormResponseAnswers(
    mpQuery: AtLeastOne<MPGetQuery>
  ): Promise<FormResponseAnswer[] | { error: ErrorDetails; }>;
  getParticipationDetails(
    mpQuery: AtLeastOne<MPGetQuery>
  ): Promise<ParticipationDetails[] | { error: ErrorDetails; }>;
  getFormFields(
    mpQuery: AtLeastOne<MPGetQuery>
  ): Promise<FormField[] | { error: ErrorDetails; }>;
  getContactRelationships(
    mpQuery: AtLeastOne<MPGetQuery>
  ): Promise<ContactRelationship[] | { error: ErrorDetails; }>;

  createContact(
    data: CreateContactPayload,
    mpQuery?: MPCreateQuery
  ): Promise<Contact | { error: ErrorDetails; }>;
  createHousehold(
    data: CreateHouseholdPayload,
    mpQuery?: MPCreateQuery
  ): Promise<Household | { error: ErrorDetails; }>;
  createAddress(
    data: CreateAddressPayload,
    mpQuery?: MPCreateQuery
  ): Promise<Address | { error: ErrorDetails; }>;
  createParticipant(
    data: CreateParticipantPayload,
    mpQuery?: MPCreateQuery
  ): Promise<Participant | { error: ErrorDetails; }>;
  createEventParticipant(
    data: CreateEventParticipantPayload,
    mpQuery?: MPCreateQuery
  ): Promise<EventParticipant | { error: ErrorDetails; }>;
  createGroupParticipant(
    data: CreateGroupParticipantPayload,
    mpQuery?: MPCreateQuery
  ): Promise<GroupParticipant | { error: ErrorDetails; }>;
  createContactAttribute(
    data: CreateContactAttributePayload,
    mpQuery?: MPCreateQuery
  ): Promise<ContactAttribute | { error: ErrorDetails; }>;
  createFormResponse(
    data: CreateFormResponsePayload,
    mpQuery?: MPCreateQuery
  ): Promise<FormResponse | { error: ErrorDetails; }>;
  createFormResponseAnswers(
    data: CreateFormResponseAnswerPayload[],
    mpQuery?: MPCreateQuery
  ): Promise<FormResponseAnswer[] | { error: ErrorDetails; }>;
  createContactEmailAddress(
    data: CreateContactEmailAddressPayload[],
    mpQuery?: MPCreateQuery
  ): Promise<ContactEmailAddress[] | { error: ErrorDetails; }>;
  createParticipationDetail(
    data: CreateParticipationDetailsPayload,
    mpQuery?: MPCreateQuery
  ): Promise<ParticipationDetails | { error: ErrorDetails; }>;
  createParticipationDetails(
    data: CreateParticipationDetailsPayload[],
    mpQuery?: MPCreateQuery
  ): Promise<ParticipationDetails[] | { error: ErrorDetails; }>;
  createFormField(
    data: CreateFormFieldPayload,
    mpQuery?: MPCreateQuery
  ): Promise<FormField | { error: ErrorDetails; }>;
  createFormFields(
    data: CreateFormFieldPayload[],
    mpQuery?: MPCreateQuery
  ): Promise<FormField[] | { error: ErrorDetails; }>;
  createContactRelationship(
    data: CreateContactRelationshipPayload,
    mpQuery?: MPCreateQuery
  ): Promise<ContactRelationship | { error: ErrorDetails; }>;
  createContactRelationships(
    data: CreateContactRelationshipPayload[],
    mpQuery?: MPCreateQuery
  ): Promise<ContactRelationship[] | { error: ErrorDetails; }>;

  updateContacts(
    contacts: WithRequired<Partial<Contact>, 'contactID'>[],
    mpQuery?: MPUpdateQuery
  ): Promise<Contact[] | { error: ErrorDetails; }>;
  updateHouseholds(
    households: WithRequired<Partial<Household>, 'householdID'>[],
    mpQuery?: MPUpdateQuery
  ): Promise<Household[] | { error: ErrorDetails; }>;
  updateEventParticipants(
    participants: WithRequired<Partial<EventParticipant>, 'eventParticipantID'>[],
    mpQuery?: MPUpdateQuery
  ): Promise<EventParticipant[] | { error: ErrorDetails; }>;
  updateGroupParticipants(
    participants: WithRequired<Partial<GroupParticipant>, 'groupParticipantID'>[],
    mpQuery?: MPUpdateQuery
  ): Promise<GroupParticipant[] | { error: ErrorDetails; }>;
  updateFormResponseAnswers(
    participants: WithRequired<Partial<FormResponseAnswer>, 'formResponseAnswerID'>[],
    mpQuery?: MPUpdateQuery
  ): Promise<FormResponseAnswer[] | { error: ErrorDetails; }>;
  updateParticipationDetails(
    details: WithRequired<Partial<ParticipationDetails>, 'participationDetailID'>[],
    mpQuery?: MPUpdateQuery
  ): Promise<ParticipationDetails[] | { error: ErrorDetails; }>;
  updateFormFields(
    fields: WithRequired<Partial<FormField>, 'formFieldID'>[],
    mpQuery?: MPUpdateQuery
  ): Promise<FormField[] | { error: ErrorDetails; }>;
  updateContactRelationships(
    relationships: WithRequired<Partial<ContactRelationship>, 'contactRelationshipID'>[],
    mpQuery?: MPUpdateQuery
  ): Promise<ContactRelationship[] | { error: ErrorDetails; }>;

  getFiles(table: string, recordId: number, mpQuery?: MPGetQuery)
    : Promise<AttachedFile[] | { error: ErrorDetails; }>;
  uploadFile(table: string, recordId: number, data: FormData)
    : Promise<AttachedFile | { error: ErrorDetails; }>;
  updateFiles(table: string, fileId: number, data: WithRequired<Partial<AttachedFile>, 'FileId'>[])
    : Promise<AttachedFile[] | { error: ErrorDetails; }>;

  // Communications API
  sendCommunication(
    data: CreateCommunicationPayload,
    config?: AxiosRequestConfig
  ): Promise<Communication | { error: ErrorDetails; }>;
  sendMessage(
    data: CreateMessagePayload,
    config?: AxiosRequestConfig
  ): Promise<Communication | { error: ErrorDetails; }>;
  sendText(
    data: CreateTextPayload,
    config?: AxiosRequestConfig
  ): Promise<Communication | { error: ErrorDetails; }>;

  // Procedures API
  getProcedures(
    search?: string,
    config?: AxiosRequestConfig
  ): Promise<ProcedureInfo[] | { error: ErrorDetails; }>;
  executeProcedure<T = Record<string, any>>(
    procedureName: string,
    input?: ProcedureInput,
    config?: AxiosRequestConfig
  ): Promise<T[][] | { error: ErrorDetails; }>;
};


export const createMPInstance = ({ auth }: { auth: { username: string; password: string; }; }): MPInstance => {

  const {
    getOne, getMany, createOne, createMany, updateMany, createFile, updateFile,
    get, post, put,
    sendCommunication, sendMessage, sendText, getProcedures, executeProcedure
  } = createApiBase({ auth });

  return {
    get,
    post,
    put,
    getOne,
    getMany,
    createOne,
    createMany,
    updateMany,
    createFile,
    updateFile,
    async getContact(id, mpQuery = {}) {
      return getOne<Contact>(
        { path: `/tables/contacts`, id, mpQuery }
      );
    },
    async getContactDetails(id, mpQuery) {
      return getOne<ContactDetails>(
        {
          path: `/tables/contacts`, id,
          mpQuery: {
            ...mpQuery,
            select: 'Contacts.*, Participant_Record_Table.*, Household_ID_Table.*, Gender_ID_Table.Gender, Participant_Record_Table_Member_Status_ID_Table.Member_Status, Participant_Record_Table_Participant_Type_ID_Table.Participant_Type, Marital_Status_ID_Table.Marital_Status, dp_fileUniqueId as Image_ID'
          }
        }
      );
    },
    async getContactAttribute(id, mpQuery = {}) {
      return getOne<ContactAttribute>(
        { path: `/tables/contact_attributes`, id, mpQuery }
      );
    },
    async getContactEmailAddress(id, mpQuery = {}) {
      return getOne<ContactEmailAddress>(
        { path: `/tables/contact_email_addresses`, id, mpQuery }
      );
    },
    async getHousehold(id, mpQuery = {}) {
      return getOne<Household>(
        { path: `/tables/households`, id, mpQuery }
      );
    },
    async getAddress(id, mpQuery = {}) {
      return getOne<Address>(
        { path: `/tables/addresses`, id, mpQuery }
      );
    },
    async getParticipant(id, mpQuery = {}) {
      return getOne<Participant>(
        { path: `/tables/participants`, id, mpQuery }
      );
    },
    async getEvent(id, mpQuery = {}) {
      return getOne<Event>(
        { path: `/tables/events`, id, mpQuery }
      );
    },
    async getGroup(id, mpQuery = {}) {
      return getOne<Group>(
        { path: `/tables/groups`, id, mpQuery }
      );
    },
    async getEventParticipant(id, mpQuery = {}) {
      return getOne<EventParticipant>(
        { path: `/tables/event_participants`, id, mpQuery }
      );
    },
    async getGroupParticipant(id, mpQuery = {}) {
      return getOne<GroupParticipant>(
        { path: `/tables/group_participants`, id, mpQuery }
      );
    },
    async getParticipationDetail(id, mpQuery = {}) {
      return getOne<ParticipationDetails>(
        { path: `/tables/participation_details`, id, mpQuery }
      );
    },
    async getFormResponse(id, mpQuery = {}) {
      return getOne<FormResponse>(
        { path: `/tables/form_responses`, id, mpQuery }
      );
    },
    async getFormField(id, mpQuery = {}) {
      return getOne<FormField>(
        { path: `/tables/form_fields`, id, mpQuery }
      );
    },
    async getContactRelationship(id, mpQuery = {}) {
      return getOne<ContactRelationship>(
        { path: `/tables/contact_relationships`, id, mpQuery }
      );
    },
    async getContacts(mpQuery) {
      return getMany<Contact>(
        { path: `/tables/contacts`, mpQuery }
      );
    },
    async getContactAttributes(mpQuery) {
      return getMany<ContactAttribute>(
        { path: `/tables/contact_attributes`, mpQuery }
      );
    },
    async getContactsWithAttributes(mpQuery) {
      return getMany<ContactWithAttribute>(
        {
          path: `/tables/contact_attributes`,
          mpQuery: { ...mpQuery, select: 'Contact_ID_Table.*, Contact_Attributes.*' }
        }
      );
    },
    async getContactEmailAddresses(mpQuery) {
      return getMany<ContactEmailAddress>(
        { path: `/tables/contact_email_addresses`, mpQuery }
      );
    },
    async getContactsWithEmailAddress(mpQuery) {
      return getMany<ContactWithEmailAddress>(
        {
          path: `/tables/contact_email_addresses`,
          mpQuery: {
            ...mpQuery,
            select: 'Contact_ID_Table.*, Contact_Email_Addresses.Email_Address As Alternate_Email, Contact_Email_Addresses.*'
          }
        }
      );
    },
    async getHouseholds(mpQuery) {
      return getMany<Household>(
        { path: `/tables/households`, mpQuery }
      );
    },
    async getAddresses(mpQuery) {
      return getMany<Address>(
        { path: `/tables/addresses`, mpQuery }
      );
    },
    async getParticipants(mpQuery) {
      return getMany<Participant>(
        { path: `/tables/participants`, mpQuery }
      );
    },
    async getEvents(mpQuery) {
      return getMany<Event>(
        { path: `/tables/events`, mpQuery }
      );
    },
    async getGroups(mpQuery) {
      return getMany<Group>(
        { path: `/tables/groups`, mpQuery }
      );
    },
    async getEventParticipants(mpQuery) {
      return getMany<EventParticipant>(
        { path: `/tables/event_participants`, mpQuery }
      );
    },
    async getGroupParticipants(mpQuery) {
      return getMany<GroupParticipant>(
        { path: `/tables/group_participants`, mpQuery }
      );
    },
    async getFormResponseAnswers(mpQuery) {
      return getMany<FormResponseAnswer>(
        { path: `/tables/form_response_answers`, mpQuery }
      );
    },
    async getParticipationDetails(mpQuery) {
      return getMany<ParticipationDetails>(
        { path: `/tables/participation_details`, mpQuery }
      );
    },
    async getFormFields(mpQuery) {
      return getMany<FormField>(
        { path: `/tables/form_fields`, mpQuery }
      );
    },
    async getContactRelationships(mpQuery) {
      return getMany<ContactRelationship>(
        { path: `/tables/contact_relationships`, mpQuery }
      );
    },

    async createContact(data, mpQuery = {}) {
      return createOne<Contact>(
        { path: `/tables/contacts`, mpQuery, data }
      );
    },
    async createHousehold(data, mpQuery) {
      return createOne<Household>(
        { path: `/tables/households`, mpQuery, data }
      );
    },
    async createAddress(data, mpQuery) {
      return createOne<Address>(
        { path: `/tables/addresses`, mpQuery, data }
      );
    },
    async createParticipant(data, mpQuery) {
      return createOne<Participant>(
        { path: `/tables/participants`, mpQuery, data }
      );
    },
    async createEventParticipant(data, mpQuery) {
      return createOne<EventParticipant>(
        { path: `/tables/event_participants`, mpQuery, data }
      );
    },
    async createGroupParticipant(data, mpQuery) {
      return createOne<GroupParticipant>(
        { path: `/tables/group_participants`, mpQuery, data }
      );
    },
    async createContactAttribute(data, mpQuery) {
      return createOne<ContactAttribute>(
        { path: `/tables/contact_attributes`, mpQuery, data }
      );
    },
    async createFormResponse(data: CreateFormResponsePayload, mpQuery) {
      return createOne<FormResponse>(
        { path: `/tables/form_responses`, mpQuery, data }
      );
    },
    async createFormResponseAnswers(data, mpQuery) {
      return createMany<FormResponseAnswer>(
        { path: `/tables/form_response_answers`, mpQuery, data }
      );
    },
    async createContactEmailAddress(data, mpQuery) {
      return createMany<ContactEmailAddress>(
        { path: `/tables/contact_email_addresses`, mpQuery, data }
      );
    },
    async createParticipationDetail(data, mpQuery) {
      return createOne<ParticipationDetails>(
        { path: `/tables/participation_details`, mpQuery, data }
      );
    },
    async createParticipationDetails(data, mpQuery) {
      return createMany<ParticipationDetails>(
        { path: `/tables/participation_details`, mpQuery, data }
      );
    },
    async createFormField(data, mpQuery) {
      return createOne<FormField>(
        { path: `/tables/form_fields`, mpQuery, data }
      );
    },
    async createFormFields(data, mpQuery) {
      return createMany<FormField>(
        { path: `/tables/form_fields`, mpQuery, data }
      );
    },
    async createContactRelationship(data, mpQuery) {
      return createOne<ContactRelationship>(
        { path: `/tables/contact_relationships`, mpQuery, data }
      );
    },
    async createContactRelationships(data, mpQuery) {
      return createMany<ContactRelationship>(
        { path: `/tables/contact_relationships`, mpQuery, data }
      );
    },
    async updateContacts(data, mpQuery) {
      return updateMany<Contact>(
        { path: `/tables/contacts`, mpQuery, data }
      );
    },
    async updateHouseholds(data, mpQuery) {
      return updateMany<Household>(
        { path: `/tables/households`, mpQuery, data }
      );
    },
    async updateEventParticipants(data, mpQuery) {
      return updateMany<EventParticipant>(
        { path: `/tables/event_participants`, mpQuery, data }
      );
    },
    async updateGroupParticipants(data, mpQuery) {
      return updateMany<GroupParticipant>(
        { path: `/tables/group_participants`, mpQuery, data }
      );
    },
    async updateFormResponseAnswers(data, mpQuery) {
      return updateMany<FormResponseAnswer>(
        { path: `/tables/form_response_answers`, mpQuery, data }
      );
    },
    async updateParticipationDetails(data, mpQuery) {
      return updateMany<ParticipationDetails>(
        { path: `/tables/participation_details`, mpQuery, data }
      );
    },
    async updateFormFields(data, mpQuery) {
      return updateMany<FormField>(
        { path: `/tables/form_fields`, mpQuery, data }
      );
    },
    async updateContactRelationships(data, mpQuery) {
      return updateMany<ContactRelationship>(
        { path: `/tables/contact_relationships`, mpQuery, data }
      );
    },

    async getFiles(table, recordId) {
      return getMany<AttachedFile>(
        { path: `/files/${table}/${recordId}`, mpQuery: {} }
      );
    },
    async uploadFile(table, recordId, data) {
      return createFile<AttachedFile>(
        { path: `/files/${table}/${recordId}`, data }
      );
    },
    async updateFiles(table, fileId, data) {
      return updateMany<AttachedFile>(
        { path: `/files/${table}/${fileId}`, data }
      );
    },

    // Communications API
    sendCommunication,
    sendMessage,
    sendText,

    // Procedures API
    getProcedures,
    executeProcedure,
  };
};

export {
  // Tables
  Contact,
  Participant,
  Event,
  Group,
  EventParticipant,
  GroupParticipant,
  ParticipationDetails,
  Household,
  Address,
  FormResponse,
  FormResponseAnswer,
  FormField,
  ContactAttribute,
  ContactWithAttribute,
  ContactEmailAddress,
  ContactWithEmailAddress,
  ContactWithEmailAddresses,
  ContactRelationship,

  // Communications endpoint types
  Communication,
  CommunicationInfo,
  CommunicationType,
  CommunicationStatus,
  TextingComplianceLevel,
  MessageInfo,
  MessageAddress,
  TextInfo,

  // Procedures endpoint types
  ProcedureInfo,
  ParameterInfo,
  ParameterDirection,
  ParameterDataType,
  ProcedureInput,

  // Utilities
  ErrorDetails,
  DateTimeIsoString,
  convertToCamelCase,
  convertToSnakeCase,
  convertToPascalCase,
  convertFromPascalCase,
  stringifyURLParams,
  escapeSql
};