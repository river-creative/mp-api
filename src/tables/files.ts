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
  FileExtension: string;
  Description: null;
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