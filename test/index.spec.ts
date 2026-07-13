import { createMPInstance } from '../src/index';
import * as dotenv from 'dotenv';
// Default import, not `* as assert`: the namespace form is not callable under TS, so every bare
// `assert(...)` in this file failed to compile and the suite could not run at all. esModuleInterop is on.
import assert from 'assert';
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

    it('should list the files attached to a record', async function () {
        // Regression: getFiles used to delegate to getMany, which speaks the *table* convention — it
        // POSTs to `path + '/get'` — so the call resolved to POST /files/contacts/1/get and MP answered
        // 404 every single time. The Files API is a plain GET.
        const files = await mp.getFiles('contacts', 1);
        if ('error' in files) {
            assert.fail(`getFiles failed: ${JSON.stringify(files.error, null, 2)}`);
        }

        assert(files instanceof Array, 'response is an array');
        assert(files.length > 0, 'the record has attached files');

        // The Files API answers in PascalCase, which is exactly what AttachedFile declares. getMany
        // would have camel-cased the reply and renamed every field out from under the type.
        const [file] = files;
        assert(typeof file.FileId === 'number', 'FileId is present, in PascalCase');
        assert(typeof file.IsDefaultImage === 'boolean', 'IsDefaultImage is present, in PascalCase');
    });

    it('should download a file by FileId, and by UniqueFileId', async function () {
        // Closes the gap getFiles left: the client could describe a file but never fetch it, and
        // dp_Files is not readable over the table API either, so its bytes were unreachable entirely.
        const files = await mp.getFiles('contacts', 1);
        if ('error' in files) {
            assert.fail(`getFiles failed: ${JSON.stringify(files.error, null, 2)}`);
        }
        const image = files.find(f => f.IsDefaultImage && f.IsImage);
        assert(image, 'contact 1 has a default image to download');

        const byId = await mp.downloadFile(image.FileId);
        if ('error' in byId) {
            assert.fail(`downloadFile failed: ${JSON.stringify(byId.error, null, 2)}`);
        }
        assert(byId.bytes instanceof ArrayBuffer, 'bytes are a real ArrayBuffer, not a Node Buffer');
        assert(byId.size > 0, 'the file has content');
        assert.strictEqual(byId.size, byId.bytes.byteLength, 'size agrees with the bytes');
        assert.strictEqual(byId.size, image.FileSize, 'every byte MP reported was received');

        // The bytes open with a real image signature — the proof that nothing was mangled by the
        // pooled-Buffer slice (Node hands axios a Buffer carved out of a shared slab, so handing over
        // its `.buffer` would have yielded the slab, not the file).
        //
        // Not pinned to one format on purpose: MP's filenames lie. This record is called "DoNotEdit.jpg"
        // and its bytes are a PNG — which is exactly why a caller must sniff rather than trust the name.
        const head = [...new Uint8Array(byId.bytes, 0, 4)];
        const signatures = [
            [0xff, 0xd8, 0xff],                    // JPEG
            [0x89, 0x50, 0x4e, 0x47],              // PNG
            [0x47, 0x49, 0x46, 0x38]               // GIF
        ];
        assert(
            signatures.some(sig => sig.every((byte, i) => head[i] === byte)),
            `the bytes open with an image signature, got [${head}]`
        );

        // MP serves the same file from its GUID.
        const byGuid = await mp.downloadFile(image.UniqueFileId);
        if ('error' in byGuid) {
            assert.fail(`downloadFile by UniqueFileId failed: ${JSON.stringify(byGuid.error, null, 2)}`);
        }
        assert.strictEqual(byGuid.size, byId.size, 'FileId and UniqueFileId fetch the same file');
    });

    it('should report an error for a file that does not exist, not throw', async function () {
        const missing = await mp.downloadFile(999999999);
        assert('error' in missing, 'a missing file comes back as an error result');
    });
});
