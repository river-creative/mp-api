# MinistryPlatform Communications API & Stored Procedures Implementation Plan

## API Endpoints Summary (from Swagger)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `POST /communications` | POST | Creates new communication and immediately renders/schedules for delivery |
| `GET /communications/{communicationId}` | GET | Returns communication by ID |
| `DELETE /communications/{communicationId}` | DELETE | Deletes communication by ID |
| `POST /messages` | POST | Creates emails from provided info and schedules for delivery |
| `POST /texts` | POST | Creates SMS/MMS messages and schedules for delivery |
| `GET /procs` | GET | Returns list of available procedures with metadata |
| `GET /procs/{procedure}` | GET | Executes stored procedure with query string params |
| `POST /procs/{procedure}` | POST | Executes stored procedure with body params |

---

## 1. Communications Endpoint (`POST /communications`)

### Request Format
Supports both JSON and multipart/form-data (for attachments).

**CommunicationInfo Request Body:**
```typescript
interface CommunicationInfo {
  AuthorUserId: number;           // Required - User ID who authored
  Subject: string;                // Required - Email subject or SMS content
  Body: string;                   // Email body content (HTML supported)
  FromContactId: number;          // Required - Contact ID of sender
  ReplyToContactId: number;       // Required - Contact ID for replies
  CommunicationType: CommunicationType; // Required - 'Email' | 'SMS'
  Contacts: number[];             // Required - Array of recipient Contact IDs
  StartDate?: string;             // ISO date - when to send (future = scheduled)
  IsBulkEmail?: boolean;          // Default false
  SendToContactParents?: boolean; // Send to household heads
  TextPhoneNumberId?: number;     // Required for SMS - outbound phone ID
}

type CommunicationType = 'Unknown' | 'Email' | 'SMS' | 'RssFeed' | 'GlobalMFA';
```

**Example Request:**
```json
{
  "AuthorUserId": 4,
  "Body": "Test Body",
  "FromContactId": 2,
  "ReplyToContactId": 2,
  "CommunicationType": "Email",
  "Contacts": [200145, 200109, 200536],
  "IsBulkEmail": false,
  "SendToContactParents": false,
  "Subject": "Test Subject",
  "StartDate": "2017-01-01T00:00:00",
  "TextPhoneNumberId": 1
}
```

### Response Model (Communication)
```typescript
interface Communication {
  CommunicationId: number;              // Unique identifier
  AuthorUserId: number;                 // User ID who authored
  AuthorName: string;                   // Display name of author (readonly)
  Subject: string;                      // Subject line / SMS content
  Body?: string;                        // Body content
  StartDate: string;                    // ISO datetime
  ExpirationDate?: string;              // Optional expiration
  Status?: CommunicationStatus;         // Current status
  FromContactId: number;                // Sender contact ID
  FromName: string;                     // Sender display name (readonly)
  FromAddress: string;                  // Sender email (readonly)
  ReplyToContactId: number;             // Reply-to contact ID
  ReplyToName: string;                  // Reply-to name (readonly)
  ReplyToAddress: string;               // Reply-to email (readonly)
  TaskId?: number;                      // Associated task ID
  SelectionId?: number;                 // Selection ID for recipients
  RecipientContactId?: number;          // Single recipient override
  RecipientName?: string;               // Recipient name (readonly)
  SendToContactParents?: boolean;       // Send to household heads
  ExcludeOptedOutOfBulkMessages?: boolean; // Exclude opted-out
  TextingComplianceLevel?: TextingComplianceLevel;
  TimeZoneName?: string;                // Timezone for date rendering
  CultureName?: string;                 // Locale for formatting
  TextPhoneNumberId?: number;           // Outbound SMS phone ID
  TextPhoneNumber?: string;             // Outbound phone (readonly)
  CommunicationType: CommunicationType;
  AlternateEmailTypeId?: number;        // Alternate email type
  PublicationId?: number;               // Related publication
}

type CommunicationStatus = 'Unknown' | 'Draft' | 'InReview' | 'ReadyToSend' | 'Sent';
type TextingComplianceLevel = 'None' | 'SingleOptIn' | 'DoubleOptIn';
```

---

## 2. Messages Endpoint (`POST /messages`)

### Request Format
Supports multipart/form-data for attachments.

**MessageInfo Request Body:**
```typescript
interface MessageInfo {
  FromAddress: MessageAddress;      // Required - Sender info
  ToAddresses: MessageAddress[];    // Required - Recipients
  ReplyToAddress?: MessageAddress;  // Reply-to info
  Subject: string;                  // Required - Email subject
  Body: string;                     // Required - Email body (HTML)
  StartDate?: string;               // ISO date for scheduling
}

interface MessageAddress {
  DisplayName: string;              // Display name
  Address: string;                  // Email address
}
```

**Example Request:**
```json
{
  "FromAddress": { "DisplayName": "From Name", "Address": "from@test.com" },
  "ToAddresses": [
    { "DisplayName": "To Address 1", "Address": "to1@test.com" },
    { "DisplayName": "To Address 2", "Address": "to2@test.com" }
  ],
  "ReplyToAddress": { "DisplayName": "Reply Address", "Address": "reply@test.com" },
  "Subject": "Test Subject",
  "Body": "Test Body"
}
```

### Response
Returns `Communication` object (same as `/communications` endpoint).

---

## 3. Texts Endpoint (`POST /texts`)

### Request Format
Supports multipart/form-data for MMS attachments.

**TextInfo Request Body:**
```typescript
interface TextInfo {
  FromPhoneNumberId: number;        // Required - MP phone number ID
  ToPhoneNumbers: string[];         // Required - E.164 format (+1XXXXXXXXXX)
  Message: string;                  // Required - SMS/MMS content
  StartDate?: string;               // ISO date for scheduling
}
```

**Example Request:**
```json
{
  "FromPhoneNumberId": 1,
  "Message": "Test Body",
  "StartDate": "2017-01-01T00:00:00",
  "ToPhoneNumbers": [
    "+13362702467",
    "+16781231234"
  ]
}
```

### Response
Returns `Communication` object (same as `/communications` endpoint).

---

## 4. Procedures Endpoints

### `GET /procs` - List Available Procedures

**Query Parameters:**
- `$search` (string, optional) - Filter procedures by name

**Response:**
```typescript
interface ProcedureInfo {
  Name: string;                     // Procedure name (e.g., "api_MyProc")
  Parameters: ParameterInfo[];      // Parameter definitions
}

interface ParameterInfo {
  Name: string;                     // Parameter name (e.g., "@ContactId")
  Direction: ParameterDirection;    // Input, Output, etc.
  DataType: ParameterDataType;      // String, Integer32, etc.
  Size: number;                     // Max length
}

type ParameterDirection = 'Input' | 'Output' | 'InputOutput' | 'ReturnValue';
type ParameterDataType =
  | 'Unknown' | 'String' | 'Text' | 'Xml' | 'Byte'
  | 'Integer16' | 'Integer32' | 'Integer64'
  | 'Decimal' | 'Real' | 'Boolean'
  | 'Date' | 'Time' | 'DateTime' | 'Timestamp'
  | 'Binary' | 'Password' | 'Money' | 'Guid'
  | 'Phone' | 'Email' | 'Variant' | 'Separator'
  | 'Image' | 'Counter' | 'TableName' | 'GlobalFilter'
  | 'TimeZone' | 'Locale' | 'LargeString' | 'Url'
  | 'Strings' | 'Integers' | 'Color' | 'SecretKey';
```

### `GET /procs/{procedure}` - Execute with Query Params

**Path Parameters:**
- `procedure` (string, required) - Procedure name

**Query Parameters:**
- Any procedure parameters as query string (e.g., `?@ContactId=123`)

### `POST /procs/{procedure}` - Execute with Body

**Path Parameters:**
- `procedure` (string, required) - Procedure name

**Request Body:**
```typescript
// Key-value pairs matching procedure parameters
interface ProcedureInput {
  [parameterName: string]: any;  // e.g., { "@SelectionID": 26918 }
}
```

**Response:**
Returns array of result sets (each is array of objects):
```typescript
type ProcedureResult = object[][];
```

---

## Implementation Plan

### Phase 1: Core Types (`src/types/`)

> **IMPORTANT:** These endpoints use **PascalCase** in the API (not Snake_Case like `/tables/`).
> We use camelCase internally (consistent with library), and convert to PascalCase before sending.
> Need to add `convertToPascalCase()` utility in `src/utils/converters.ts`.

#### 1.1 Create `src/types/communications.ts`
```typescript
// CommunicationInfo - Request payload (camelCase for library usage)
// API expects: AuthorUserId, FromContactId, etc. (PascalCase)
export interface CommunicationInfo {
  authorUserId: number;
  subject: string;
  body?: string;
  fromContactId: number;
  replyToContactId: number;
  communicationType: CommunicationType;
  contacts: number[];
  startDate?: string;
  isBulkEmail?: boolean;
  sendToContactParents?: boolean;
  textPhoneNumberId?: number;
}

// Communication - Response model (camelCase for library usage)
// API returns: CommunicationId, AuthorUserId, etc. (PascalCase)
export interface Communication {
  communicationId: number;
  authorUserId: number;
  authorName: string;
  subject: string;
  body?: string;
  startDate: string;
  expirationDate?: string;
  status?: CommunicationStatus;
  fromContactId: number;
  fromName: string;
  fromAddress: string;
  replyToContactId: number;
  replyToName: string;
  replyToAddress: string;
  taskId?: number;
  selectionId?: number;
  recipientContactId?: number;
  recipientName?: string;
  sendToContactParents?: boolean;
  excludeOptedOutOfBulkMessages?: boolean;
  textingComplianceLevel?: TextingComplianceLevel;
  timeZoneName?: string;
  cultureName?: string;
  textPhoneNumberId?: number;
  textPhoneNumber?: string;
  communicationType: CommunicationType;
  alternateEmailTypeId?: number;
  publicationId?: number;
}

export type CommunicationType = 'Unknown' | 'Email' | 'SMS' | 'RssFeed' | 'GlobalMFA';
export type CommunicationStatus = 'Unknown' | 'Draft' | 'InReview' | 'ReadyToSend' | 'Sent';
export type TextingComplianceLevel = 'None' | 'SingleOptIn' | 'DoubleOptIn';
```

#### 1.2 Create `src/types/messages.ts`
```typescript
// MessageAddress - nested object (camelCase for library usage)
// API expects: DisplayName, Address (PascalCase)
export interface MessageAddress {
  displayName: string;
  address: string;
}

// MessageInfo - Request payload (camelCase for library usage)
// API expects: FromAddress, ToAddresses, etc. (PascalCase)
export interface MessageInfo {
  fromAddress: MessageAddress;
  toAddresses: MessageAddress[];
  replyToAddress?: MessageAddress;
  subject: string;
  body: string;
  startDate?: string;
}
```

#### 1.3 Create `src/types/texts.ts`
```typescript
// TextInfo - Request payload (camelCase for library usage)
// API expects: FromPhoneNumberId, ToPhoneNumbers, Message (PascalCase)
export interface TextInfo {
  fromPhoneNumberId: number;
  toPhoneNumbers: string[];
  message: string;
  startDate?: string;
}
```

#### 1.4 Create `src/types/procedures.ts`
```typescript
// ProcedureInfo - Response from GET /procs (camelCase for library usage)
// API returns: Name, Parameters (PascalCase)
export interface ProcedureInfo {
  name: string;
  parameters: ParameterInfo[];
}

export interface ParameterInfo {
  name: string;
  direction: ParameterDirection;
  dataType: ParameterDataType;
  size: number;
}

export type ParameterDirection = 'Input' | 'Output' | 'InputOutput' | 'ReturnValue';
export type ParameterDataType =
  | 'Unknown' | 'String' | 'Text' | 'Xml' | 'Byte'
  | 'Integer16' | 'Integer32' | 'Integer64'
  | 'Decimal' | 'Real' | 'Boolean'
  | 'Date' | 'Time' | 'DateTime' | 'Timestamp'
  | 'Binary' | 'Password' | 'Money' | 'Guid'
  | 'Phone' | 'Email' | 'Variant' | 'Separator'
  | 'Image' | 'Counter' | 'TableName' | 'GlobalFilter'
  | 'TimeZone' | 'Locale' | 'LargeString' | 'Url'
  | 'Strings' | 'Integers' | 'Color' | 'SecretKey';
```

#### 1.5 Add to `src/utils/converters.ts`
```typescript
/**
 * Converts camelCase object keys to PascalCase.
 * Used for /communications, /messages, /texts endpoints.
 * Example: { authorUserId: 1 } → { AuthorUserId: 1 }
 */
export function convertToPascalCase<T>(obj: Record<string, any>): T {
  // Implementation: capitalize first letter of each key
  // Handle nested objects and arrays recursively
}

/**
 * Converts PascalCase object keys to camelCase.
 * Used for responses from /communications, /messages, /texts, /procs endpoints.
 * Example: { AuthorUserId: 1 } → { authorUserId: 1 }
 */
export function convertFromPascalCase<T>(obj: Record<string, any>): T {
  // Implementation: lowercase first letter of each key
  // Handle nested objects and arrays recursively
}
```

---

### Phase 2: API Methods (`src/api.ts`)

#### 2.1 Add New Type Definitions
```typescript
export type APISendCommunicationInstance = (
  params: APISendCommunicationParameter
) => Promise<Communication | { error: ErrorDetails }>;

export type APISendMessageInstance = (
  params: APISendMessageParameter
) => Promise<Communication | { error: ErrorDetails }>;

export type APISendTextInstance = (
  params: APISendTextParameter
) => Promise<Communication | { error: ErrorDetails }>;

export type APIExecuteProcedureInstance = <T extends Record<string, any>>(
  params: APIExecuteProcedureParameter
) => Promise<T[][] | { error: ErrorDetails }>;

export type APIGetProceduresInstance = (
  search?: string
) => Promise<ProcedureInfo[] | { error: ErrorDetails }>;
```

#### 2.2 Add Core Methods
```typescript
// POST /communications
const sendCommunication = async ({ data, config }) => {
  const url = '/communications';
  const payload = convertToPascalCase(data);  // camelCase → PascalCase
  const res = await post(url, payload, config);
  return convertFromPascalCase(res.data);     // PascalCase → camelCase
};

// POST /messages
const sendMessage = async ({ data, config }) => {
  const url = '/messages';
  const payload = convertToPascalCase(data);  // camelCase → PascalCase
  const res = await post(url, payload, config);
  return convertFromPascalCase(res.data);     // PascalCase → camelCase
};

// POST /texts
const sendText = async ({ data, config }) => {
  const url = '/texts';
  const payload = convertToPascalCase(data);  // camelCase → PascalCase
  const res = await post(url, payload, config);
  return convertFromPascalCase(res.data);     // PascalCase → camelCase
};

// GET /procs
const getProcedures = async (search?: string) => {
  const url = search ? `/procs?$search=${search}` : '/procs';
  const res = await get(url);
  return res.data.map(p => convertFromPascalCase(p));  // PascalCase → camelCase
};

// POST /procs/{procedure}
const executeProcedure = async <T>({ procedureName, input, config }) => {
  const url = `/procs/${procedureName}`;
  // Note: input params use @ParamName format, no conversion needed
  const res = await post(url, input, config);
  return res.data; // Returns T[][] - results may need conversion depending on proc
};
```

---

### Phase 3: Public API (`src/index.ts`)

#### 3.1 Update MPInstance Interface
```typescript
export type MPInstance = {
  // ... existing methods ...

  // Communications
  sendCommunication(
    data: CreateCommunicationPayload
  ): Promise<Communication | { error: ErrorDetails }>;

  // Messages (by email address)
  sendMessage(
    data: CreateMessagePayload
  ): Promise<Communication | { error: ErrorDetails }>;

  // Texts (by phone number)
  sendText(
    data: CreateTextPayload
  ): Promise<Communication | { error: ErrorDetails }>;

  // Procedures
  getProcedures(
    search?: string
  ): Promise<ProcedureInfo[] | { error: ErrorDetails }>;

  executeProcedure<T extends Record<string, any>>(
    procedureName: string,
    input?: Record<string, any>
  ): Promise<T[][] | { error: ErrorDetails }>;
};
```

#### 3.2 Create Payload Types
```typescript
// camelCase internally, converted to PascalCase before API call
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
```

#### 3.3 Add Exports
```typescript
export {
  // ... existing exports ...
  Communication,
  CommunicationInfo,
  CommunicationType,
  CommunicationStatus,
  MessageInfo,
  MessageAddress,
  TextInfo,
  ProcedureInfo,
  ParameterInfo,
  ParameterDirection,
  ParameterDataType,
};
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/types/communications.ts` | **Create** | Communication types and enums |
| `src/types/messages.ts` | **Create** | Message and MessageAddress types |
| `src/types/texts.ts` | **Create** | TextInfo types |
| `src/types/procedures.ts` | **Create** | Procedure and Parameter types |
| `src/utils/converters.ts` | **Modify** | Add `convertToPascalCase()` and `convertFromPascalCase()` |
| `src/api.ts` | **Modify** | Add 5 new methods |
| `src/index.ts` | **Modify** | Export new methods and types |

---

## Implementation Notes

### Case Conversion
The Communications/Messages/Texts/Procs endpoints use **PascalCase** in request/response bodies (not Snake_Case like `/tables/`).

| Endpoint Type | API Format | Library Format | Conversion |
|---------------|------------|----------------|------------|
| `/tables/*` | Snake_Case | camelCase | `convertToSnakeCase()` / `convertToCamelCase()` |
| `/communications`, `/messages`, `/texts`, `/procs` | PascalCase | camelCase | `convertToPascalCase()` / `convertFromPascalCase()` |

**Implementation:** Add two new utility functions to `src/utils/converters.ts`:
- `convertToPascalCase()` - for outgoing requests
- `convertFromPascalCase()` - for incoming responses (same as existing `convertToCamelCase()` for first letter)

### Multipart Form Data Support
All three communication endpoints support file attachments via multipart/form-data. For the initial implementation, we can support JSON-only requests. File attachment support can be added later if needed.

### Scheduling
Setting `StartDate` to a future date schedules the communication for later delivery. If omitted or set to current time, sends immediately.

---

## Usage Examples

### Send Email via Communications API
```typescript
const mp = createMPInstance({ auth });

const result = await mp.sendCommunication({
  authorUserId: 4,
  fromContactId: 100,
  replyToContactId: 100,
  subject: 'Event Reminder',
  body: '<h1>Reminder</h1><p>Service starts tomorrow!</p>',
  communicationType: 'Email',
  contacts: [1001, 1002, 1003],
  startDate: '2024-01-15T09:00:00'  // Schedule for Jan 15
});
```

### Send Email via Messages API
```typescript
const result = await mp.sendMessage({
  fromAddress: { displayName: 'Church Admin', address: 'admin@church.org' },
  toAddresses: [
    { displayName: 'John Doe', address: 'john@email.com' }
  ],
  replyToAddress: { displayName: 'Support', address: 'support@church.org' },
  subject: 'Welcome!',
  body: '<h1>Welcome to our church!</h1>'
});
```

### Send SMS via Texts API
```typescript
const result = await mp.sendText({
  fromPhoneNumberId: 1,  // Your MP phone number ID
  toPhoneNumbers: ['+15551234567', '+15559876543'],
  message: 'Service starts in 30 minutes!'
});
```

### Execute Stored Procedure
```typescript
// List available procedures
const procs = await mp.getProcedures('api_');

// Execute procedure with parameters
const result = await mp.executeProcedure<ContactResult>(
  'api_Custom_GetActiveMembers',
  { '@MinistryID': 5, '@StartDate': '2024-01-01' }
);

// Result is array of result sets
const contacts = result[0];  // First result set
```