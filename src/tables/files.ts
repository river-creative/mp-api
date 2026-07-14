import { MP_BASE_URL } from '../api';

/**
 * A file's actual content, as returned by `downloadFile`.
 *
 * `contentType` is what MP said, not what the bytes are: MP commonly answers
 * `application/octet-stream` for a perfectly good JPEG, and its `FileExtension` is empty whenever the
 * file was uploaded without a filename. A caller that must know the real type (to serve it to a browser,
 * say) should sniff the magic number. This reports MP faithfully rather than guessing on its behalf.
 */
export interface DownloadedFile {
  bytes: ArrayBuffer;
  contentType: string;
  /** From Content-Disposition, when MP sends one. */
  fileName: string | null;
  size: number;
}

export interface AttachedFile {
  FileId: number;
  FileName: string;
  /** Empty whenever the file was uploaded without a filename — a canvas blob, say. */
  FileExtension: string;
  /**
   * `dp_Files.Summary`. A free-text label on the file, and often the ONLY thing that distinguishes one
   * attachment on a record from another — MP exposes no other per-file tag.
   *
   * Was declared `null` (the literal type, inferred from a sample response that happened to carry none),
   * which silently defeated every attempt to compare it: `file.Description === 'Competitor'` type-checked
   * to `never` and TypeScript raised nothing, so a caller identifying a file by its description had no
   * protection at all. MP returns the string it was given, `""` when there is none.
   */
  Description: string;
  FileSize: number;
  ImageHeight: number;
  ImageWidth: number;
  IsImage: boolean;
  IsDefaultImage: boolean;
  TableName: string;
  RecordId: number;
  UniqueFileId: string;
  LastUpdated: string;
  InclusionType: string;
}

/**
 * The public URL MP serves a file from.
 *
 * Keyed by `UniqueFileId` (the file's GUID, `dp_Files.Unique_Name`) and NOT by the numeric `FileId`: the
 * number is an internal key that means nothing outside an authenticated API call, whereas this URL
 * answers 200 to anyone holding it, with **no credentials at all**. That is what makes it the only thing
 * worth handing to an `<img>`, a spreadsheet, or anything else that is not this client.
 *
 * Exposed because callers were otherwise forced to hardcode the MP host to build it, which is a second
 * source of truth for the instance this client already knows.
 */
export const fileUrl = (uniqueFileId: string): string => `${MP_BASE_URL}/files/${uniqueFileId}`;
