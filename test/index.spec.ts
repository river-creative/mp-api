import { createMPInstance, fileUrl, MP_BASE_URL } from '../src/index';
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

    it('should type a file Description as the string MP actually returns', async function () {
        // Regression: AttachedFile.Description was declared `null` — the literal type, inferred from a
        // sample response that happened to carry none. TypeScript raises nothing for `null === 'x'`, so
        // every attempt to identify a file BY its description compiled to a comparison that could never
        // be true, with no warning. A file's Summary is often the only thing telling two attachments on
        // one record apart, so this silently defeated the one thing it is for.
        const files = await mp.getFiles('contacts', 1);
        if ('error' in files) {
            assert.fail(`getFiles failed: ${JSON.stringify(files.error, null, 2)}`);
        }

        const [file] = files;
        assert.strictEqual(typeof file.Description, 'string', 'Description is a string, never null');

        // The comparison the type used to make impossible. It must compile AND be a real test.
        const named = files.filter(f => f.Description === file.Description);
        assert(named.length > 0, 'a file can be found by its description');
    });

    it('should build the public URL a file is served from', function () {
        // Keyed by the GUID and not the numeric FileId: MP answers this URL with no credentials at all,
        // which is what makes it the only thing worth handing to an <img> or a spreadsheet. Exposed
        // because callers were otherwise hardcoding the MP host to build it themselves.
        assert.strictEqual(fileUrl('abc-123'), `${MP_BASE_URL}/files/abc-123`);
        assert(fileUrl('abc-123').startsWith('https://'), 'absolute, not a path');
    });

    it('should upload then delete a file (roundtrip)', async function () {
        // deleteFile did not exist: there was no way to remove a file through this client at all, so
        // callers had to mint their own OAuth token and drop to raw HTTP. It cannot go through deleteMany
        // for the same reason getFiles cannot go through getMany — that speaks the table convention
        // (POST {path}/delete) and the Files API is a plain DELETE /files/{file}.
        const png = Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
            'base64'
        );
        const form = new FormData();
        form.append('File', new File([png], `${v4()}.png`, { type: 'image/png' }));
        form.append('Description', 'mp-js-api roundtrip test');
        form.append('Default', 'false');

        const uploaded = await mp.uploadFile('contacts', 1, form);
        if ('error' in uploaded) {
            assert.fail(`uploadFile failed: ${JSON.stringify(uploaded.error, null, 2)}`);
        }
        assert(typeof uploaded.FileId === 'number', 'the new file has an id');
        assert.strictEqual(uploaded.Description, 'mp-js-api roundtrip test', 'the description round-trips');

        const deleted = await mp.deleteFile(uploaded.FileId);
        if ('error' in deleted) {
            assert.fail(`deleteFile failed: ${JSON.stringify(deleted.error, null, 2)}`);
        }

        const after = await mp.getFiles('contacts', 1);
        if ('error' in after) {
            assert.fail(`getFiles failed: ${JSON.stringify(after.error, null, 2)}`);
        }
        assert(!after.some(f => f.FileId === uploaded.FileId), 'the file is gone from the record');
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

    it('should authenticate with a caller-supplied bearer token (getToken)', async function () {
        // Mint a service-account token by hand, then drive an instance that knows ONLY getToken — the
        // path that lets a caller run calls AS a signed-in user instead of the service account.
        const basic = Buffer.from(`${MP_USERNAME}:${MP_PASSWORD}`).toString('base64');
        const res = await fetch(`${MP_BASE_URL}/oauth/connect/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${basic}` },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                scope: 'http://www.thinkministry.com/dataplatform/scopes/all'
            }).toString()
        });
        assert(res.ok, 'minted a service-account token');
        const { access_token } = await res.json() as { access_token: string };

        let calls = 0;
        const bearerMp = createMPInstance({ auth: { getToken: () => { calls++; return access_token; } } });
        const contacts = await bearerMp.getContacts({ filter: 'Last_Name LIKE \'Ferreira\'', top: 1 });
        if ('error' in contacts) {
            assert.fail(`bearer read failed: ${JSON.stringify(contacts.error, null, 2)}`);
        }
        assert(contacts instanceof Array, 'the bearer path returns rows');
        assert(calls > 0, 'getToken was consulted to build the request');
    });

    it('should report an error when getToken yields an empty token, not send a blank bearer', async function () {
        const bad = createMPInstance({ auth: { getToken: () => '' } });
        const contacts = await bad.getContacts({ top: 1 });
        assert('error' in contacts, 'an empty token surfaces as an error result');
    });
});
