var initiated = false;

function setCredentials(credentials) {
  API.setCredentials(credentials);
}

function resetAccessToken() {
  API.resetAccessToken();
}

function testSetCredentials_() {

  const client_id = PropertiesService.getScriptProperties().getProperty('client_id') || '';
  const client_secret = PropertiesService.getScriptProperties().getProperty('client_secret') || '';
  if (!client_id || !client_secret) return Logger.log("No authorization key saved under script properties.");
  setCredentials({ client_id, client_secret });
}

const API = (function () {
  const baseUrl = `https://mp.revival.com/ministryplatformapi`; // Private variable
  var auth = { access_token: '', expires_at: 0, token_type: '' };
  var cred = { client_id: '', client_secret: '' };


  function setCredentials(credentials) {
    cred = credentials;
    initiated = true;
  }
  //: ________________________________________________


  function call(params) {

    return fetch(params);
  }

  function get(params) {

    return fetch({ ...params, method: 'get' });
  }

  function post(params) {

    return fetch({ ...params, method: 'post' });
  }

  function put(params) {

    return fetch({ ...params, method: 'put' });
  }
  //: ................................................


  function fetch({ urlParams, method, data }) {

    const fetchUrl = baseUrl + urlParams;
    const accessToken = auth.access_token || getAccessToken();
    const headers = { 'Authorization': 'Bearer ' + accessToken };

    const options = {
      method,
      headers,
      muteHttpExceptions: true,
      redirect: "follow",
      ...data && {
        payload: JSON.stringify(data),//.escapeApostrophe(),
        contentType: 'application/json'
      },
    };

    const res = UrlFetchApp.fetch(fetchUrl, options);
    const responseCode = res.getResponseCode();
    const responseText = res.getContentText();

    if (responseText.startsWith('<')) {
      var document = XmlService.parse(responseText);
      var children = document.getRootElement().getChildren().at(1).getChildren();

      children.forEach(child => {
        const children2 = child.getChildren();
        Logger.log(children2)
        children.forEach(child2 => {
          const children3 = child2.getChildren();
          children3.forEach(child3 =>
            Logger.log(child3.getChildren())
          )
        })
      })
      Logger.log(children)
    }
    else
      var response = responseText && JSON.parse(responseText);

    if (responseCode >= 200 && responseCode <= 299) {
      return response
    }
    else {
      const error = { error: response.Message, code: responseCode, urlParams, method, data }
      !response.Message && Logger.log(responseText);
      Logger.log(JSON.stringify(error, null, 2));
      throw error
    }

  }


  function getAccessToken() {
    const auth = Properties.getProperties();
    const expiresAt = +auth?.expires_at || 0;
    if (!auth?.access_token || expiresAt < Date.now())
      return requestAccessToken()
    else
      return auth.access_token
  }

  function resetAccessToken() {
    auth = { access_token: '', expires_at: 0, token_type: '' };
    Properties.deleteAllProperties();
    Logger.log('🗑️ access_token cleared');
  }


  function requestAccessToken() {

    const url = baseUrl + '/oauth/connect/token';

    const urlParams = toUrlParams({
      grant_type: 'client_credentials',
      scope: 'http://www.thinkministry.com/dataplatform/scopes/all',
      client_id: cred.client_id,
      client_secret: cred.client_secret
    });

    const options = {
      method: "post",
      contentType: 'application/x-www-form-urlencoded',
      payload: urlParams,
    };

    try {
      const response = UrlFetchApp.fetch(url, options);
      const responseText = response.getContentText();
      const responseCode = response.getResponseCode();

      if (responseCode == 200) {
        const res = JSON.parse(responseText);
        auth = { ...res, expires_at: Date.now() + res.expires_in * 1000 }

        Properties.setProperties(auth);
        Logger.log('✅ access_token')
        return auth.access_token;
      }
    }
    catch (e) {
      console.error('Catch: ' + e)
    }
  }
  //: ________________________________________________

  return {
    setCredentials,
    resetAccessToken,
    call,
  };
})();



/**
 * Returns a contact
 * 
 * @param {(number|string)} id - ContactId
 * @param {MPOptions} mpOptions - { select, filter, orderBy, groupBy, top, skip, distinct }
 * 
 * @returns {Contact} contacts - one contact object
 */
function getContact(id, mpOptions = {}) {
  return getOne(
    { path: `/tables/contacts`, id, mpOptions }
  );
}

function getContactAttribute(id, mpOptions = {}) {
  return getOne(
    { path: `/tables/contact_attributes`, id, mpOptions }
  );
}

function getContactEmailAddress(id, mpOptions = {}) {
  return getOne(
    { path: `/tables/contact_email_addresses`, id, mpOptions }
  );
}

function getHousehold(id, mpOptions = {}) {
  return getOne(
    { path: `/tables/households`, id, mpOptions }
  );
}

function getAddress(id, mpOptions = {}) {
  return getOne(
    { path: `/tables/addresses`, id, mpOptions }
  );
}

function getParticipant(id, mpOptions = {}) {
  return getOne(
    { path: `/tables/participants`, id, mpOptions }
  );
}

function getEvent(id, mpOptions = {}) {
  return getOne(
    { path: `/tables/events`, id, mpOptions }
  );
}

function getGroup(id, mpOptions = {}) {
  return getOne(
    { path: `/tables/groups`, id, mpOptions }
  );
}

function getEventParticipant(id, mpOptions = {}) {
  return getOne(
    { path: `/tables/event_participants`, id, mpOptions }
  );
}

function getGroupParticipant(id, mpOptions = {}) {
  return getOne(
    { path: `/tables/group_participants`, id, mpOptions }
  );
}

function getFormResponse(id, mpOptions = {}) {
  return getOne(
    { path: `/tables/form_responses`, id, mpOptions }
  );
}





/**
 * Returns an array of contacts
 * 
 * @param {MPOptions} mpOptions - { select, filter, orderBy, groupBy, top, skip, distinct }
 * 
 * @returns {Contact[]} contacts - an array of contact objects
 */
function getContacts(mpOptions = {}) {
  return getMany(
    { path: `/tables/contacts`, mpOptions }
  );
}


function getContactAttributes(mpOptions) {
  return getMany(
    { path: `/tables/contact_attributes`, mpOptions }
  );
}
function getContactsWithAttributes(mpOptions) {
  return getMany(
    {
      path: `/tables/contact_attributes`,
      mpOptions: { ...mpOptions, select: 'Contact_ID_Table.*, Contact_Attributes.*' }
    }
  );
}


/**
 * Returns an array of contact email addresses
 * 
 * @param {MPOptions} mpOptions - { select, filter, orderBy, groupBy, top, skip, distinct }
 * 
 * @returns {EmailAddress[]} emailAddresses - an array of EmailAddress objects
 */
function getContactEmailAddresses(mpOptions = {}) {
  return getMany(
    { path: `/tables/contact_email_addresses`, mpOptions }
  );
}

function getContactsWithEmailAddress(mpOptions) {
  return getMany(
    {
      path: `/tables/contact_email_addresses`,
      mpOptions: {
        ...mpOptions,
        select: 'Contact_ID_Table.*, Contact_Email_Addresses.Email_Address As Alternate_Email, Contact_Email_Addresses.*'
      }
    }
  );
}

function getHouseholds(mpOptions) {
  return getMany(
    { path: `/tables/households`, mpOptions }
  );
}

function getAddresses(mpOptions) {
  return getMany(
    { path: `/tables/addresses`, mpOptions }
  );
}

function getParticipants(mpOptions) {
  return getMany(
    { path: `/tables/participants`, mpOptions }
  );
}

function getEvents(mpOptions) {
  return getMany(
    { path: `/tables/events`, mpOptions }
  );
}

function getGroups(mpOptions) {
  return getMany(
    { path: `/tables/groups`, mpOptions }
  );
}

function getEventParticipants(mpOptions) {
  return getMany(
    { path: `/tables/event_participants`, mpOptions }
  );
}

function getGroupParticipants(mpOptions) {
  return getMany(
    { path: `/tables/group_participants`, mpOptions }
  );
}

function getFormResponses(mpOptions) {
  return getMany(
    { path: `/tables/form_responses`, mpOptions }
  );
}

function getFormResponseAnswers(mpOptions) {
  return getMany(
    { path: `/tables/form_response_answers`, mpOptions }
  );
}

function getParticipationDetails(mpOptions) {
  return getMany(
    { path: `/tables/participation_details`, mpOptions }
  );
}

function getBackgroundChecks(mpOptions = {}) {
  return getMany(
    { path: `/tables/background_checks`, mpOptions }
  );
}



// Create
function createContact(params, mpOptions = {}) {
  return createOne(
    { path: `/tables/contacts`, mpOptions, params }
  );
}

function createHousehold(params, mpOptions) {
  return createOne(
    { path: `/tables/households`, mpOptions, params }
  );
}

function createAddress(params, mpOptions) {
  return createOne(
    { path: `/tables/addresses`, mpOptions, params }
  );
}

function createParticipant(params, mpOptions) {
  return createOne(
    { path: `/tables/participants`, mpOptions, params }
  );
}

function createEventParticipant(params, mpOptions) {
  return createOne(
    { path: `/tables/event_participants`, mpOptions, params }
  );
}

function createGroupParticipant(params, mpOptions) {
  return createOne(
    { path: `/tables/group_participants`, mpOptions, params }
  );
}

function createContactAttribute(params, mpOptions) {
  return createOne(
    { path: `/tables/contact_attributes`, mpOptions, params }
  );
}

function createFormResponse(params, mpOptions) {
  return createOne(
    { path: `/tables/form_responses`, mpOptions, params }
  );
}

function createFormResponseAnswers(params, mpOptions) {
  return createMany(
    { path: `/tables/form_response_answers`, mpOptions, params }
  );
}

function createContactEmailAddress(params, mpOptions) {
  return createMany(
    { path: `/tables/contact_email_addresses`, mpOptions, params }
  );
}



// Update
function updateContacts(params, mpOptions) {
  return updateOne(
    { path: `/tables/contacts`, mpOptions, params }
  );
}

function updateEventParticipants(params, mpOptions) {
  return updateOne(
    { path: `/tables/event_participants`, mpOptions, params }
  );
}
function updateGroupParticipants(params, mpOptions) {
  return updateOne(
    { path: `/tables/group_participants`, mpOptions, params }
  );
}



/**
 * Returns an object
 * 
 * @param {GetOneParams} params - { id, path, mpOptions }
 * 
 * @returns {object} object - object
 */
function getOne({ id, path, mpOptions }) {
  // try {
  const urlParams = `${path}/${id}` + stringifyURLParams(mpOptions);
  const res = API.call({ urlParams, method: 'get' });
  return res[0] ? convertToCamelCase(res[0]) : undefined;
  // }
  // catch (error) {
  //   return { error };
  // }
};


/**
 * Returns an array of object
 * 
 * @param {GetManyParams} params - { path, mpOptions }
 * 
 * @returns {object[]} objects - objects
 */
function getMany({ path, mpOptions }) {
  // try {
  const urlParams = path + '/get';
  const data = mpOptions && escapeApostrophes(convertToSnakeCase(mpOptions));
  const res = API.call({ urlParams, data, method: 'post' });
  return res.map(record => convertToCamelCase(record));
  // }
  // catch (error) {
  //   return { error };
  // }
};



/**
 * Creates an object
 * 
 * @param {CreateOneParams} params - { path, params, mpOptions }
 * 
 * @returns {object} object - object
 */
function createOne({ path, params, mpOptions }) {
  // try {
  const urlParams = path + stringifyURLParams(mpOptions);
  const data = [escapeApostrophes(convertToSnakeCase(params))];
  const res = API.call({ urlParams, data, method: 'post' });
  return res[0] ? convertToCamelCase(res[0]) : undefined;
  // }
  // catch (error) {
  //   return { error };
  // }
};


function updateOne({ path, params, mpOptions }) {

  const urlParams = path + stringifyURLParams(mpOptions);
  const data = [escapeApostrophes(convertToSnakeCase(params))];

  const res = API.call({ urlParams, data, method: 'put' });
  return res[0] ? convertToCamelCase(res[0]) : undefined;
};





/**
* @typedef GetOneParams
* 
* @property {number} id
* @property {string} path
* @property {string} [mpOptions]
*/

/**
* @typedef GetManyParams
* 
* @property {string} path
* @property {string} [mpOptions]
*/


/**
* @typedef CreateOneParams
* 
* @property {string} path
* @property {string} params
* @property {string} [mpOptions]
*/


/**
* @typedef MPOptions
* 
* @property {string} [select]
* @property {string} [filter]
* @property {string} [orderBy]
* @property {string} [groupBy]
* @property {number} [top]
* @property {number} [skip]
* @property {boolean} [distinct]
*/




function test_findGroupContacts() {

  testSetCredentials_()

  const groupParticipants = getContactGroupParticipants(126634);
  Logger.log(contact)
}

function test_getGroupParticipants() {

  testSetCredentials_()

  const groupParticipants = getGroupParticipants({ filter: '(End_Date > GETDATE() OR End_Date is null) AND Group_ID=550' });
  Logger.log(contact)
}


function test_CreateGroupParticipant() {

  testSetCredentials_()

  const params = { participantId: 107080, groupId: 499, groupRoleId: 25, startDate: (new Date()).toISOString() }
  const groupParticipant = createGroupParticipant(params);
  Logger.log(groupParticipant)
}


/**
 * Tests retrieval of group participants for a specific contact group.
 * Logs the result using Logger.
 */
function test_findGroupContacts() {
  testSetCredentials_();

  const groupParticipants = getContactGroupParticipants(126634);
  Logger.log(groupParticipants); // Note: 'contact' in original code seems to be a typo for 'groupParticipants'
}

/**
 * Tests creation of a group participant with specified parameters.
 * Logs the created group participant using Logger.
 */
function test_CreateGroupParticipant() {
  testSetCredentials_();

  const params = {
    participantId: 107080,
    groupId: 499,
    groupRoleId: 25,
    startDate: (new Date()).toISOString()
  };
  const groupParticipant = createGroupParticipant(params);
  Logger.log(groupParticipant);
}

/**
 * Finds an event participant record for a given event and participant.
 * @param {number} [eventId=0] - The ID of the event.
 * @param {number} [participantId=0] - The ID of the participant.
 * @returns {Object|null} The event participant record if found, otherwise null.
 */
function findEventParticipant(eventId = 0, participantId = 0) {
  let existingEventParticipantRecords = getEventParticipants({
    filter: `Participant_ID=${participantId} AND Event_ID=${eventId}`
  });

  if (existingEventParticipantRecords.length) {
    console.log(`✔️ `, `Existing Event Participant found:`, existingEventParticipantRecords.map(record => record.eventParticipantId));
    return existingEventParticipantRecords.at(0);
  }
  return null;
}

/**
 * Finds group participant records for a given participant with no end date.
 * @param {number} participantId - The ID of the participant.
 * @returns {Object[]|null} Array of group participant records if found, otherwise null.
 */
function findGroupParticipants(participantId) {
  let existingGroupParticipantRecords = getGroupParticipants({
    filter: `Participant_ID=${participantId} AND End_Date is null`
  });

  if (existingGroupParticipantRecords.length) {
    console.log(`✔️ `, `Existing Group Participants found:`, existingGroupParticipantRecords.map(({ groupParticipantId, groupId }) => ({ groupId, groupParticipantId })));
    return existingGroupParticipantRecords;
  }
  return null;
}

/**
 * Retrieves group participant records for a contact, optionally including past records.
 * @param {number} contactId - The ID of the contact.
 * @param {Object} [options] - Optional parameters.
 * @param {boolean} [options.showPast=false] - Whether to include past group participations.
 * @returns {Object[]|null} Array of group participant records if found, otherwise null.
 */
function getContactGroupParticipants(contactId, { showPast = false } = {}) {
  let endDate = showPast ? `` : `AND Group_Participants.End_Date is null`;
  let groupParticipantContacts = getGroupParticipants({
    select: `Group_Participants.Group_ID, Group_ID_Table.Group_Name, Group_Participants.Group_Participant_ID, Group_Participants.End_Date, Group_Participants.Participant_ID, Participant_ID_Table_Member_Status_ID_Table.Member_Status, Participant_ID_Table_Contact_ID_Table.*, Participant_ID_Table_Contact_ID_Table.dp_fileUniqueId as Image_ID`,
    filter: `Participant_ID_Table.Contact_ID=${contactId} ${endDate}`
  });

  if (groupParticipantContacts.length) {
    console.log(`✔️ `, `Existing Contact Groups found:`, groupParticipantContacts.map(({ contactId, groupParticipantId, groupId }) => ({ contactId, groupId, groupParticipantId })));
    return groupParticipantContacts;
  }
  return null;
}

/**
 * Retrieves participant records for specified group(s), optionally including past records.
 * @param {number|number[]} groupIds - The ID(s) of the group(s).
 * @param {Object} [options] - Optional parameters.
 * @param {boolean} [options.showPast=false] - Whether to include past group participations.
 * @returns {Object[]|null} Array of group participant records if found, otherwise null.
 */
function getGroupParticipantContacts(groupIds, { showPast = false } = {}) {
  let endDate = showPast ? `` : `AND Group_Participants.End_Date is null`;
  let groupParticipantContacts = getGroupParticipants({
    select: `Group_Participants.*, Group_ID_Table.Group_Name, Group_Participants.Group_Participant_ID, Group_Participants.Start_Date, Group_Participants.End_Date, Group_Participants.Participant_ID, Participant_ID_Table_Member_Status_ID_Table.Member_Status, Participant_ID_Table_Contact_ID_Table.*, Participant_ID_Table_Contact_ID_Table.dp_fileUniqueId as Image_ID`,
    filter: `Group_Participants.Group_ID IN (${Util.toArray(groupIds).join(', ')}) ${endDate}`
  });

  if (groupParticipantContacts.length) {
    console.log(`✔️ `, `${groupParticipantContacts.length} Group Participants found`);
    return groupParticipantContacts;
  }
  return null;
}

/**
 * Finds a specific group participant record matching participant and group assignment.
 * @param {Object[]} existingGroupParticipantRecords - Array of group participant records.
 * @param {Object} groupAssignment - Object containing groupId.
 * @param {number} participantId - The ID of the participant.
 * @returns {Object|null} The matching group participant record if found, otherwise null.
 */
function findGroupParticipant(existingGroupParticipantRecords, groupAssignment, participantId) {
  if (existingGroupParticipantRecords?.length) {
    let groupParticipant = existingGroupParticipantRecords.find(gp => gp.participantId === participantId && gp.groupId === groupAssignment.groupId);

    if (groupParticipant)
      console.log(`✔️ `, `Existing Group Participant found:`, [groupParticipant.groupParticipantId]);

    return groupParticipant;
  }
  return null;
}

/**
 * Retrieves and appends email addresses for each contact in the provided results.
 * @param {Object[]} [results=[]] - Array of contact objects with contactId.
 * @returns {Object[]} Array of contact objects with emailAddresses property added.
 */
function getAllContactEmailAddresses(results = []) {
  return results.map(c => {
    let emailAddresses = getContactEmailAddresses({ filter: `Contact_ID=${c.contactId}` });

    emailAddresses = emailAddresses.map(e => e.emailAddress.toLowerCase());
    c.emailAddress && emailAddresses.push(c.emailAddress.toLowerCase());
    return { ...c, emailAddresses };
  });
}


function toCamelCase(str, { capitalIds = false } = {}) {
  str = str.replace('-', '')
  str = str.toLowerCase();
  // str = str.replace(/^_?[A-Z]{1,3}/, match => match.toLowerCase()); // Don't convert if start with ID, HS, SMS, etc
  str = str.replace(/(?<=^_|^__)[^\W_]/g, match => match.at(-1)?.toLowerCase() || '');  // keep underscore if first char
  str = str.replace(/(?<!^_|^)_[^\W_]/g, match => match.charAt(1).toUpperCase());       // remove underscore if not first char
  return capitalIds ? str.replace(/id$/i, 'ID') : str;
}

function toCapitalSnakeCase(str, { capitalIds = false, capitalSnake = true } = {}) {
  str = str.replace(/(?<=^_|^__)[^\W_]/, match => match.at(0)?.toUpperCase() || '');
  str = str.replace(/(?<!_|\/)(ID|[A-Z]|\d)/g, match => `_${match}`);
  str = capitalSnake ? str.charAt(0).toUpperCase() + str.slice(1) : str;
  return capitalIds ? str.replace(/_id$/i, '_ID') : str;
}

// Function to recursively convert object keys to Capital_Snake_Case
function caseConverter(obj, { type, capitalIds = false }) { // { type: 'toCamel' | 'toSnake', capitalIds?: boolean; }
  const caseFn = type === 'toCamel' ? toCamelCase : toCapitalSnakeCase;
  if (Array.isArray(obj)) {
    return obj.map(val => caseConverter(val, { type })); // Recursively process each array element
  }

  if (obj !== null && typeof obj === 'object') {
    const snakeCaseObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const snakeCaseKey = caseFn(key, { capitalIds });  // Convert key to Snake_Case
        snakeCaseObj[snakeCaseKey] = caseConverter(obj[key], { type }); // Recursively process nested objects
      }
    }
    return snakeCaseObj;
  }

  return obj; // Return value if it's neither an array nor an object
}

function convertToCamelCase(obj, capitalIds = false) {
  return caseConverter(obj, { type: 'toCamel', capitalIds });
}

function convertToSnakeCase(obj, capitalIds = false) {
  return caseConverter(obj, { type: 'toSnake', capitalIds });
}






function stringifyURLParams(mpOptions = {}) {
  return Object.entries(mpOptions).reduce((acc, [key, value]) => {
    if (!acc) {
      acc += `?$${key}=${value}`;
    } else {
      acc += `&$${key}=${value}`;
    }
    return acc;
  }, '').escapeSql();
}



function escapeSql(str) {
  return str.replace(/%|(?<=\w)'(?=\w)/g, function (char) {
    switch (char) {
      case "\0":
        return "\\0";
      case "\x08":
        return "\\b";
      case "\x09":
        return "\\t";
      case "\x1a":
        return "\\z";
      case "\n":
        return "\\n";
      case "\r":
        return "\\r";
      case "%":
        return "%25";
      case "'":
        return "''";
      case "\"":
      case "\\":
        return "\\" + char; // prepends a backslash to backslash, percent,
      // and double/single quotes
      default:
        return char;
    }
  });
}

// https://gist.github.com/tanaikech/70503e0ea6998083fcb05c6d2a857107
String.prototype.addQuery = function (obj) {
  return (this == "" ? "" : `${this}?`) + Object.entries(obj).flatMap(([k, v]) => Array.isArray(v) ? v.map(e => `${k}=${encodeURIComponent(e)}`) : `${k}=${encodeURIComponent(v)}`).join("&");
}



function escapeApostrophes(obj) {

  if (obj !== null && typeof obj === 'object') {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        if (typeof value === 'string')
          obj[key] = value.escapeApostrophe();
        else
          obj[key] = value;
      }
    }
    return obj;
  }

  return obj; // Return value if it's not an object
}


String.prototype.escapeApostrophe = function () {
  return this.replace(/(?<=\w)'(?=\w)/g, function (char) {
    switch (char) {
      case "'":
        return "''"
      default:
        return char;
    }
  });
}

String.prototype.escapeSql = function () {
  return this.replace(/%|(?<=\w)'(?=\w)/g, function (char) {
    switch (char) {
      case "\0":
        return "\\0";
      case "\x08":
        return "\\b";
      case "\x09":
        return "\\t";
      case "\x1a":
        return "\\z";
      case "\n":
        return "\\n";
      case "\r":
        return "\\r";
      case "%":
        return "%25"
      case "'":
        return "''"
      case "\"":
      case "\\":
        return "\\" + char; // prepends a backslash to backslash, percent,
      // and double/single quotes
      default:
        return char;
    }
  });
}

function toUrlParams(obj) {
  return Object.entries(obj).map(([key, val]) => `${key}=${val}`).join('&');
}

function toUrlParamsEncoded(obj) {
  return Object.entries(obj).map(([key, val]) => `${key}=${encodeURIComponent(val)}`).join('&');
}


const getMatchCount = (contact, { emailAddress, dateOfBirth, phoneNumber }) => {
  const byEmail = emailAddress && contact.emailAddresses.includes(emailAddress);
  const byDate = dateOfBirth && contact.dateOfBirth === dateOfBirth;
  const byPhone = phoneNumber && cleanPhoneNumber(contact.mobilePhone) === phoneNumber;
  return [byEmail, byDate, byPhone].filter(Boolean).length;
};


function byName(contact, person) {

  const lower = (name) => name?.toLowerCase() || ''; //.split(' ').shift();
  const firstName = lower(person.firstName) || '';
  const lastName = lower(person.lastName) || '';

  const first = lower(contact.firstName), nick = lower(contact.nickname), last = lower(contact.lastName);
  return ((first + ' ' + nick).includes(firstName) || firstName.includes(first) || firstName.includes(nick))
    && (last.includes(lastName) || lastName.includes(last))
}


/**
 * Filter contacts by name
 * @param results - list of contacts
 * @param person - partial contact to filter by
 * @returns filtered list of contacts
 */
function byNames(results, person) {

  const lower = (name) => name?.toLowerCase() || ''; //.split(' ').shift();
  const firstName = lower(person.firstName) || '';
  const lastName = lower(person.lastName) || '';

  return results.filter(r => {
    const first = lower(r.firstName), nick = lower(r.nickname), last = lower(r.lastName);
    return ((first + ' ' + nick).includes(firstName) || firstName.includes(first) || firstName.includes(nick))
      && (last.includes(lastName) || lastName.includes(last))
  });
}

// Remove duplicates where first name, email (and phone) are the same
function splitDuplicates(person, saveDuplicates = true) {

  let unique;
  let duplicates = [];

  // remove duplicates by id
  let groupedContacts = Util.groupArrayBy(person, 'contactId');
  let contact = groupedContacts.map((contacts) => contacts[0]);

  if (contact.length === 1) return [contact[0], duplicates];

  // remove duplicates by email address
  groupedContacts = Util.groupArrayBy(contact, 'emailAddress');
  if (groupedContacts.length) contact = groupedContacts.reduce((acc, contacts) => {

    if (contacts.length === 1) acc = [...acc, ...contacts];
    else {
      const groupedByName = Util.groupArrayBy(contacts, "firstName");
      const filtered = groupedByName.reduce((accName, current) => {
        if (!current.length)
          return acc;
        else if (current.length == 1)
          return [...accName, ...current];
        else {
          let first = current[0];
          duplicates = duplicates.concat(current);
          return [...accName, first];
        }
      }, []);

      acc = [...acc, ...filtered];
    }

    return acc;
  }, []);


  if (contact.length === 1) return [contact[0], duplicates];


  // remove duplicates by phone #
  groupedContacts = Util.groupArrayBy(contact, 'mobilePhone');
  if (groupedContacts.length) contact = groupedContacts.reduce((acc, contacts, i) => {
    if (contacts.length === 1) acc = [...acc, ...contacts];
    else {
      const groupedByName = Util.groupArrayBy(contacts, "firstName");
      const filtered = groupedByName.reduce((accName, current) => {
        if (!current.length)
          return acc;
        else if (current.length == 1)
          return [...accName, ...current];
        else {
          let first = current[0];
          duplicates = duplicates.concat(current);
          return [...accName, first];
        }

      }, []);

      acc = [...acc, ...filtered];
    }

    return acc;
  }, []);

  unique = contact.shift();
  if (contact.length)
    duplicates = [...duplicates, ...contact, unique];

  return [unique, duplicates];
}


function cleanName(str) {

  var regex;

  str = str.replace('  ', ' ').replace(' -', '-').replace('- ', '-');

  // Remove titles
  regex = /(^ps|pastor|^pst|^rev|reverend|apostle|prophet|prophetess|bishop|minister|missionary|^ev\.|evangelist|^mr|^mrs|^ms|^sister|^sis\.|sr\.)(\.? ?)/gi;
  str = str.replace(regex, '');

  // Remove any non-word chars but keep Dr. or hyphenated names like Tony-Ann
  // remove initials if used before first name (L. Winston Frickley)
  // regex = /[\pL'’`-]{2,}/g
  regex = XRegExp("[\\p{L}A-zÀ-ÿ'’`-]{2,}", 'g');
  str = (str.match(regex) || [str]).map(capitalize).join(' ');

  return str
}


function cleanPhoneNumber(num) {

  if (!num) return '';

  const cleaned = String(num).trim()
    .replace(/(?<!^)\+|[^\d+]+/g, '')  // Remove non digits and keep the +
    .replace(/^00/, '+')               // Remove preceding '00'
    .replace(/^\+?1(?=\d{10}$)/, '');    // Remove preceding '+1' or '1' for American numbers     

  return cleaned;
}

function formatPhone(phone, format = '$1-$2-$3') {
  return String(cleanPhoneNumber(phone)).replace(/^\(?(\d{3}).*(\d{3}).*(\d{4})/, format);
}


/**
 * Returns a iso date string (YYYY-MM-DDTHH:MM:SS)
 * 
 * @param {string=} date
 * 
 * @returns {string} mpDate
 */

function isoDateString(date = undefined) {
  return Util.formatDate(date, 'YYYY-MM-DDTHH:mm:ss')
}



/**
* @typedef Contact
* 
* @property {number} contactId
* @property {string} firstName
* @property {string} lastName
* @property {number} contactId
* @property {boolean} company
* @property {string | null} companyName
* @property {string} displayName
* @property {number | null} prefixId
* @property {string | null} firstName
* @property {string | null} middleName
* @property {string | null} lastName
* @property {string | null} nickname
* @property {string | null} dateOfBirth
* @property {number | null} genderId
* @property {number | null} maritalStatusId
* @property {number} contactStatusId
* @property {number | null} householdId
* @property {number | null} householdPositionId
* @property {string | null} anniversaryDate
* @property {number | null} participantRecord
* @property {number | null} donorRecord
* @property {string | null} emailAddress
* @property {string | null} mobilePhone
* @property {string | null} companyPhone
* @property {string | null} pagerPhone
* @property {string | null} faxPhone
* @property {string | null} facebookAccount
* @property {string | null} twitterAccount
* @property {string | null} webPage
* @property {number | null} industryId
* @property {number | null} occupationId
* @property {number | null} hsGraduationYear
* @property {boolean} bulkEmailOptOut
* @property {boolean} emailUnlisted
* @property {boolean} doNotText
* @property {boolean} mobilePhoneUnlisted
* @property {boolean} removeFromDirectory
* @property {number | null} userAccount
* @property {string | null} idCard
* @property {string} contactGUId
* @property {string} _contactSetupDate
* @property {string | null} occupationName
* @property {boolean} emailVerified
* @property {boolean} mobilePhoneVerified
* @property {string | null} maidenName
*/

/**
* @typedef EmailAddress
* 
* @property {number} emailAddressId
* @property {string} emailAddress
* @property {number} contactId
* @property {number} emailTypeId
* @property {string} endDate
* @property {string} notes
*/



