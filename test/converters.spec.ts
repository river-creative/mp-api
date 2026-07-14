import assert from 'assert';
import { stringifyURLParams, toQueryParameters } from '../src/utils/converters';

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
