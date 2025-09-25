import { AxiosInstance } from 'axios';
import { createApiBase, MPApiBase, ErrorDetails, MPGetQuery, MPCreateQuery, MPUpdateQuery, DateTimeIsoString } from './api';
import { convertToCamelCase, convertToSnakeCase, escapeSql, stringifyURLParams } from './utils/converters';
import { Contact, ContactRecord } from './tables/contacts';
import { Event, EventRecord } from './tables/events';
import { Group, GroupRecord } from './tables/groups';
import { Address, AddressRecord } from './tables/addresses';
import { Household, HouseholdRecord } from './tables/households';
import { Participant, ParticipantRecord } from './tables/participants';
import { EventParticipant, EventParticipantRecord } from './tables/event-participants';
import { GroupParticipant, GroupParticipantRecord } from './tables/group-participants';
import { ContactAttribute, ContactAttributeRecord, ContactWithAttribute } from './tables/contact-attributes';
import { FormResponse, FormResponseRecord } from './tables/form-responses';
import { FormResponseAnswer, FormResponseAnswerRecord } from './tables/from-response-answers';
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
export type CreateContactEmailAddressPayload = WithRequired<
  Omit<Partial<ContactEmailAddress>, 'emailAddressID'>,
  'emailAddress' | 'contactID'
>;
export type CreateFilePayload = WithRequired<
  Omit<Partial<AttachedFile>, 'FileId'>,
  'Description' | 'IsDefaultImage'
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
  getFormResponse(
    id: number,
    mpQuery?: MPGetQuery
  ): Promise<FormResponse | undefined | { error: ErrorDetails; }>;

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

  getFiles(table: string, recordId: number, mpQuery?: MPGetQuery)
    : Promise<AttachedFile[] | { error: ErrorDetails; }>;
  uploadFile(table: string, recordId: number, data: FormData)
    : Promise<AttachedFile | { error: ErrorDetails; }>;
  updateFiles(table: string, fileId: number, data: WithRequired<Partial<AttachedFile>, 'FileId'>[])
    : Promise<AttachedFile[] | { error: ErrorDetails; }>;
};


export const createMPInstance = ({ auth }: { auth: { username: string; password: string; }; }): MPInstance => {

  const { getOne, getMany, createOne, createMany, updateMany, createFile, updateFile, get, post, put } = createApiBase({ auth });

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
    async getFormResponse(id, mpQuery = {}) {
      return getOne<FormResponse>(
        { path: `/tables/form_responses`, id, mpQuery }
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
  };
};

export {
  Contact,
  Participant,
  Event,
  Group,
  EventParticipant,
  GroupParticipant,
  Household,
  Address,
  FormResponse,
  FormResponseAnswer,
  ContactAttribute,
  ContactWithAttribute,
  ContactEmailAddress,
  ContactWithEmailAddress,
  ContactWithEmailAddresses,
  ErrorDetails,
  DateTimeIsoString,
  convertToCamelCase,
  convertToSnakeCase,
  stringifyURLParams,
  escapeSql
};