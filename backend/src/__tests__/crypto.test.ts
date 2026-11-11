import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../services/crypto.js';

describe('Crypto Engine - AES-256-GCM', () => {
  it('should encrypt and decrypt plaintext to identical original string', () => {
    const secretMessage = 'ghp_super_secret_github_personal_access_token_12345';
    const encrypted = encrypt(secretMessage);

    expect(encrypted).not.toBe(secretMessage);
    expect(encrypted.split(':')).toHaveLength(3); // iv : authTag : encryptedHex

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(secretMessage);
  });

  it('should throw an error on corrupted auth tags or tamper attempts', () => {
    const encrypted = encrypt('sensitive-api-key');
    const [iv, authTag, ciphertext] = encrypted.split(':');

    // Tamper with the ciphertext
    const tamperedCiphertext = ciphertext.slice(0, -2) + 'aa';
    const tamperedPayload = `${iv}:${authTag}:${tamperedCiphertext}`;

    expect(() => decrypt(tamperedPayload)).toThrow();
  });
});
