/**
 * Password hashing for the local account provider.
 *
 * PBKDF2-SHA256, 150k iterations, per-account random salt, via WebCrypto — so
 * the prototype never stores a raw password. This is still a client-side
 * prototype: real deployment moves account storage behind a server, and this
 * module becomes the client half of that exchange.
 */

const ITERATIONS = 150_000;
const KEY_BITS = 256;

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomSalt(bytes = 16): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return toHex(array.buffer);
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: fromHex(salt) as unknown as BufferSource,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    key,
    KEY_BITS,
  );
  return toHex(bits);
}

/** Constant-time-ish comparison — avoids leaking the match position. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
