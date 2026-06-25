import { createMPInstance } from '../src/index';
import * as dotenv from 'dotenv';
import * as assert from 'assert';
import { v4 } from 'uuid';

dotenv.config();

const { MP_USERNAME, MP_PASSWORD } = process.env as {
    MP_USERNAME: string;
    MP_PASSWORD: string;
};

const mp = createMPInstance({
    auth: { username: MP_USERNAME, password: MP_PASSWORD },
});

describe('MP Instance', function () {
    it('should find many contacts by filter', async function () {
        const contacts = await mp.getContacts({
            filter: 'Last_Name LIKE \'Ferreira\'',
        });
        if ('error' in contacts) {
            const { error } = contacts;
            if (
                typeof error === 'object' &&
                error !== null &&
                'response' in error &&
                typeof error.response === 'object' &&
                error.response !== null &&
                'data' in error.response
            ) {
                console.error(error.response.data);
            } else {
                console.error(error);
            }
            assert.fail();
        } else {
            assert(contacts instanceof Array, 'response is an array');
            assert(contacts.length > 0, 'array length is greater than 0');
        }
    });
    it('should find one contact by id', async function () {
        const contactID = 111129;
        const contact = await mp.getContact(contactID);
        if (!contact) {
            assert.fail('no contact found');
        } else if ('error' in contact) {
            const { error } = contact;
            if (error instanceof Error) {
                assert.fail(error);
            } else {
                assert.fail(`Error: ${JSON.stringify(error, null, 2)}`);
            }
        } else {
            assert.equal(contact.firstName, 'Daniel', 'contact first name is Daniel');
            assert.equal(contact.middleName, 'Barbosa', 'contact middle name is Barbosa');
            assert.equal(contact.lastName, 'Ferreira', 'contact last name is Ferreira');
        }
    });
    it('should find many events with options: filter, select, top', async function () {
        const events = await mp.getEvents({
            filter: `Event_Start_Date <= '2022-12-31' AND Event_Start_Date >= '2022-01-01'`,
            select: 'Event_ID,Event_Title,Event_Start_Date',
            top: 10
        });
        if ('error' in events) {
            const { error } = events;
            if (error?.data) {
                assert.fail(`AxiosError: ${JSON.stringify(error.data, null, 2)}`);
            } else if (error instanceof Error) {
                assert.fail(error);
            } else {
                assert.fail(JSON.stringify(error, null, 2));
            }
        } else {
            assert(events instanceof Array, 'response is an array');
            assert.equal(events.length, 10, 'array length is 10');
        }
    });
    it('should create one contact', async function () {
        const contact = await mp.createContact({
            firstName: 'John',
            lastName: 'Doe',
            emailAddress: `test${v4().replace(/-/g, '')}@revival.com`,
            dateOfBirth: '1999-01-01',
            company: false,
            displayName: 'Doe, John'
        });

        if ('error' in contact) {
            const { error } = contact;
            console.log(error);
            if (error?.data) {
                assert.fail(`AxiosError: ${JSON.stringify(error.data, null, 2)}`);
            } else if (error instanceof Error) {
                assert.fail(error);
            } else {
                assert.fail(JSON.stringify(error, null, 2));
            }
        }
    });
    it('should create then delete a participation detail (roundtrip)', async function () {
        // Live delete is destructive, so this test only operates on a record it
        // creates itself. It needs a disposable Event_Participant_ID to attach to;
        // skip cleanly when one is not configured so CI without setup is unaffected.
        const epId = Number(process.env.MP_TEST_EVENT_PARTICIPANT_ID);
        const itemId = Number(process.env.MP_TEST_PARTICIPATION_ITEM_ID) || 1;
        if (!epId) {
            this.skip();
        }

        const created = await mp.createParticipationDetail({
            eventParticipantID: epId,
            participationItemID: itemId,
            numericValue: 0,
            notes: `mp-js-api delete roundtrip ${v4()}`,
        });
        if ('error' in created) {
            assert.fail(`create failed: ${JSON.stringify(created.error, null, 2)}`);
        }
        assert(created.participationDetailID > 0, 'created record has an id');

        const deleted = await mp.deleteParticipationDetails([created.participationDetailID]);
        if ('error' in deleted) {
            assert.fail(`delete failed: ${JSON.stringify(deleted.error, null, 2)}`);
        }
        assert(deleted instanceof Array, 'delete returns an array of deleted records');
        assert(
            deleted.some(r => r.participationDetailID === created.participationDetailID),
            'the deleted record is returned in the response'
        );

        const after = await mp.getParticipationDetail(created.participationDetailID);
        assert(after === undefined, 'record no longer exists after delete');
    });
});
