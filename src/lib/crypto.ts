/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EncryptedPayload } from '../types';

export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function generateSalt(length = 16): Uint8Array {
  const salt = new Uint8Array(length);
  window.crypto.getRandomValues(salt);
  return salt;
}

export function generateIV(): Uint8Array {
  const iv = new Uint8Array(12);
  window.crypto.getRandomValues(iv);
  return iv;
}

export async function deriveKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error(
      'Web Crypto is unavailable. Open Veritas over https:// or http://localhost (secure context required).'
    );
  }
  const saltCopy = new Uint8Array(salt.byteLength);
  saltCopy.set(salt);

  const encoder = new TextEncoder();
  const passphraseKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltCopy,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passphraseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptText(
  plaintext: string,
  key: CryptoKey,
  existingSalt?: Uint8Array
): Promise<EncryptedPayload> {
  const salt = existingSalt || generateSalt(16);
  const iv = generateIV();
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(plaintext);

  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    key,
    encodedData
  );

  return {
    cipherBuffer: bufferToBase64(ciphertext),
    iv: bufferToBase64(iv.buffer as ArrayBuffer),
    salt: bufferToBase64(salt.buffer as ArrayBuffer),
  };
}

export async function decryptText(
  payload: EncryptedPayload,
  key: CryptoKey
): Promise<string> {
  const ciphertext = base64ToBuffer(payload.cipherBuffer);
  const iv = new Uint8Array(base64ToBuffer(payload.iv));

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decryptedBuffer);
}

export async function computeSha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
