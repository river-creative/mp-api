import assert from 'assert';
import { convertToSnakeCase, stringifyURLParams, toCapitalSnakeCase, toQueryParameters } from '../src/utils/converters';

describe('toCapitalSnakeCase', function () {

  // Every write goes through this (createOne/createMany/updateMany -> convertToSnakeCase), and MP drops
  // a column it does not recognise from a write WITHOUT reporting anything — 200, nothing stored. So a
  // name this gets wrong is not an error anyone sees; it is a value that silently never saves. The
  // function had no tests at all until the same class of bug cost the sibling C# client four columns.

  it('keeps a run of capitals together', function () {
    // Was Attendant_P_I_N_Hash / Front_Desk_S_M_S_Phone: only the literal `ID` was special-cased, so
    // every other acronym MP uses was split apart when a caller spelled it in capitals.
    assert.strictEqual(toCapitalSnakeCase('attendantPINHash'), 'Attendant_PIN_Hash');
    assert.strictEqual(toCapitalSnakeCase('frontDeskSMSPhone'), 'Front_Desk_SMS_Phone');
    assert.strictEqual(toCapitalSnakeCase('rsvpStatusChangeDate'), 'Rsvp_Status_Change_Date');
  });

  it('splits the last capital of a run only when a lowercase word follows', function () {
    assert.strictEqual(toCapitalSnakeCase('idCard'), 'Id_Card');
    assert.strictEqual(toCapitalSnakeCase('contactID', { capitalIds: true }), 'Contact_ID');
    assert.strictEqual(toCapitalSnakeCase('imageFileID', { capitalIds: true }), 'Image_File_ID');
  });

  it('returns an MP column name unchanged', function () {
    // Callers do pass real column names. Every one of these used to gain a leading underscore — and the
    // acronyms were split on top of that — naming a column MP does not have.
    for (const column of [
      'Display_Name', 'Contact_ID', 'Attendant_PIN_Hash', 'IP_Address', 'ID_Card',
      'Allow_ID_Card_Barcode', 'Front_Desk_SMS_Phone', 'Address_Line_1', '_Approved'
    ]) {
      assert.strictEqual(toCapitalSnakeCase(column, { capitalIds: true }), column);
    }
  });

  it('still converts the ordinary camelCase spelling', function () {
    assert.strictEqual(toCapitalSnakeCase('displayName'), 'Display_Name');
    assert.strictEqual(toCapitalSnakeCase('contactId', { capitalIds: true }), 'Contact_ID');
    assert.strictEqual(toCapitalSnakeCase('householdId', { capitalIds: true }), 'Household_ID');
    // MP matches column names case-insensitively, which is why the lowercased acronym has always worked.
    assert.strictEqual(toCapitalSnakeCase('attendantPinHash'), 'Attendant_Pin_Hash');
    assert.strictEqual(toCapitalSnakeCase('ipAddress'), 'Ip_Address');
  });

  it('treats an existing separator as the boundary', function () {
    assert.strictEqual(toCapitalSnakeCase('state/Region'), 'State/Region');
    assert.strictEqual(toCapitalSnakeCase('_approved'), '_Approved');
    assert.strictEqual(toCapitalSnakeCase(''), '');
  });

  it('separates a number from the word it follows, keeping the number whole', function () {
    // Only the FIRST digit of a run takes the separator, matching the sibling C# policy: the two
    // clients write the same MP instance and must agree on what a column is called. This used to
    // split every digit, so Active_Days_Past_30_Days came out as Active_Days_Past_3_0_Days — a column
    // MP does not have, and one it would have discarded from a write in silence.
    assert.strictEqual(toCapitalSnakeCase('addressLine1'), 'Address_Line_1');
    assert.strictEqual(toCapitalSnakeCase('person1'), 'Person_1');
    assert.strictEqual(toCapitalSnakeCase('activeDaysPast30Days'), 'Active_Days_Past_30_Days');
    assert.strictEqual(toCapitalSnakeCase('field123Name'), 'Field_123_Name');
  });

  it('cannot produce a column whose digit is glued to letters — a known limitation', function () {
    // Not a rule that could be improved: Code2 and Code_2 are different columns and nothing in the
    // property name says which one MP has. 72 of the 2,204 columns on the live instance are like this
    // (Code2, Form_I9, Vision2_Program_ID, the __F1* imports); they need their literal spelling. None
    // is written by any of our apps.
    assert.strictEqual(toCapitalSnakeCase('code2'), 'Code_2');
    assert.strictEqual(toCapitalSnakeCase('vision2ProgramID', { capitalIds: true }), 'Vision_2_Program_ID');
  });

  it('converts the keys of a write payload, which is where it is actually used', function () {
    // The unit above is only worth anything if the write path applies it — createOne/createMany/
    // updateMany all send convertToSnakeCase(payload).
    assert.deepStrictEqual(
      convertToSnakeCase({ attendantPINHash: 'x', ipAddress: '10.0.0.1', contactId: 7 }),
      { Attendant_PIN_Hash: 'x', Ip_Address: '10.0.0.1', Contact_ID: 7 }
    );
  });
});

describe('toQueryParameters', function () {

  it('names a read query the way MP binds it — PascalCase QueryParameters', function () {
    // The whole bug: the generic snake_case converter produced Order_By, which MP binds to nothing
    // and silently ignores, so no read this client made was ever actually ordered.
    assert.deepStrictEqual(
      toQueryParameters({ filter: 'Contact_ID > 20', select: 'Contact_ID', orderBy: 'Contact_ID ASC', top: 1000 }),
      { Filter: 'Contact_ID > 20', Select: 'Contact_ID', OrderBy: 'Contact_ID ASC', Top: 1000 }
    );
  });

  it('carries every multi-word parameter the old converter dropped', function () {
    assert.deepStrictEqual(
      toQueryParameters({ groupBy: 'Household_ID', having: 'COUNT(*) > 1', userId: 7, globalFilterId: 3 }),
      { GroupBy: 'Household_ID', Having: 'COUNT(*) > 1', UserId: 7, GlobalFilterId: 3 }
    );
  });

  it('throws on a parameter MP has no name for, instead of dropping it silently', function () {
    assert.throws(() => toQueryParameters({ orderby: 'Contact_ID ASC' }), /Unknown MP query parameter 'orderby'/);
  });

  it('escapes apostrophes in the values, as the read path always has', function () {
    assert.deepStrictEqual(
      toQueryParameters({ filter: "Last_Name='O'Brien'" }),
      { Filter: "Last_Name='O''Brien'" }
    );
  });
});

describe('stringifyURLParams', function () {

  it('lowercases the parameters MP spells lowercase', function () {
    // MP answers to $orderby / $groupby, never $orderBy / $groupBy. It does not reject the wrong
    // spelling — it ignores it — so this is the whole bug: an ordered read that was never ordered.
    assert.strictEqual(
      stringifyURLParams({ orderBy: 'Contact_ID ASC' }),
      '?$orderby=Contact_ID ASC'
    );
    assert.strictEqual(
      stringifyURLParams({ groupBy: 'Household_ID' }),
      '?$groupby=Household_ID'
    );
  });

  it('leaves the parameters MP spells camelCase alone', function () {
    assert.strictEqual(stringifyURLParams({ userId: 42 }), '?$userId=42');
    assert.strictEqual(stringifyURLParams({ select: 'Contact_ID' }), '?$select=Contact_ID');
    assert.strictEqual(stringifyURLParams({ top: 10 }), '?$top=10');
  });

  it('joins several parameters, mapping only the ones that need it', function () {
    assert.strictEqual(
      stringifyURLParams({ filter: 'Contact_ID > 20', orderBy: 'Contact_ID ASC', top: 1000 }),
      '?$filter=Contact_ID > 20&$orderby=Contact_ID ASC&$top=1000'
    );
  });

  it('is empty for no options', function () {
    assert.strictEqual(stringifyURLParams(), '');
    assert.strictEqual(stringifyURLParams({}), '');
  });

  it('still escapes the filter it is given', function () {
    // escapeSql doubles an intraword apostrophe and percent-encodes a wildcard — unchanged behaviour.
    assert.strictEqual(
      stringifyURLParams({ filter: "Last_Name='O'Brien'" }),
      "?$filter=Last_Name='O''Brien'"
    );
    assert.strictEqual(
      stringifyURLParams({ filter: "First_Name LIKE 'Jo%'" }),
      "?$filter=First_Name LIKE 'Jo%25'"
    );
  });
});
