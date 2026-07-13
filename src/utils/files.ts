/**
 * Helpers for reading a file back out of MP.
 *
 * The awkward parts of a binary download live here rather than in the endpoint, because both of them
 * are easy to get subtly wrong and neither is obvious from the call site.
 */

/**
 * Normalise whatever axios produced for `responseType: 'arraybuffer'` into a real ArrayBuffer.
 *
 * Axios does not answer with the same type on both platforms: in Node it hands back a **Buffer**, in the
 * browser an **ArrayBuffer**. Returning that difference to the caller would push it into every consumer.
 *
 * A Buffer cannot simply have its `.buffer` handed over, either — Node pools small allocations, so that
 * property is frequently a large shared slab of which this file is one slice. Exposing it would leak
 * unrelated memory and report a wildly wrong `byteLength`. The slice below is therefore a copy, and has
 * to be.
 */
export function toArrayBuffer(data: unknown): ArrayBuffer {
  if (data instanceof ArrayBuffer) return data;

  if (ArrayBuffer.isView(data)) {
    const view = data as ArrayBufferView;
    return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer;
  }

  throw new Error(`Expected binary data from MP, got ${typeof data}`);
}

/**
 * The filename MP suggests, from the Content-Disposition header.
 *
 * Prefers RFC 5987's `filename*=UTF-8''…` when present, because that is the form that survives a
 * non-ASCII name; falls back to the plain `filename=`. Null when the header is absent or unparseable —
 * MP does not always send one, and a missing filename is not an error.
 */
export function fileNameFromDisposition(disposition: unknown): string | null {
  if (typeof disposition !== 'string') return null;

  const encoded = /filename\*=(?:UTF-8|utf-8)''([^;]+)/.exec(disposition);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim());
    } catch {
      /* a malformed escape is not worth failing a download over — fall through to the plain form */
    }
  }

  const plain = /filename=("?)([^";]+)\1/.exec(disposition);
  return plain ? plain[2].trim() || null : null;
}
