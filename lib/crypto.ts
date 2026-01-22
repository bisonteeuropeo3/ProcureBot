/**
 * Encryption Utilities for Sensitive Credentials
 * 
 * Uses AES-256-GCM for symmetric encryption of IMAP passwords.
 * The encryption key is stored in the ENCRYPTION_KEY environment variable.
 * 
 * Format of encrypted data: base64(iv):base64(authTag):base64(ciphertext)
 */

import * as crypto from 'crypto';

// AES-256-GCM configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits - recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Get the encryption key from environment variable
 * @throws Error if key is missing or invalid length
 */
function getEncryptionKey(): Buffer {
    const keyHex = process.env.ENCRYPTION_KEY;

    if (!keyHex) {
        throw new Error(
            'ENCRYPTION_KEY environment variable is not set. ' +
            'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
        );
    }

    const key = Buffer.from(keyHex, 'hex');

    if (key.length !== 32) {
        throw new Error(
            `Invalid ENCRYPTION_KEY length: expected 32 bytes (64 hex chars), got ${key.length} bytes. ` +
            'Generate a new key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
        );
    }

    return key;
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in format: base64(iv):base64(authTag):base64(ciphertext)
 */
export function encrypt(plaintext: string): string {
    const key = getEncryptionKey();

    // Generate random IV for each encryption
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
        authTagLength: AUTH_TAG_LENGTH
    });

    // Encrypt the plaintext
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get the authentication tag
    const authTag = cipher.getAuthTag();

    // Return as: iv:authTag:ciphertext (all base64 encoded)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt an encrypted string using AES-256-GCM
 * @param encryptedData - Encrypted string in format: base64(iv):base64(authTag):base64(ciphertext)
 * @returns Decrypted plaintext string
 * @throws Error if decryption fails (invalid key, tampered data, etc.)
 */
export function decrypt(encryptedData: string): string {
    const key = getEncryptionKey();

    // Parse the encrypted data
    const parts = encryptedData.split(':');

    if (parts.length !== 3) {
        throw new Error(
            'Invalid encrypted data format. Expected format: iv:authTag:ciphertext. ' +
            'The data may be corrupted or stored in plaintext.'
        );
    }

    const [ivBase64, authTagBase64, ciphertext] = parts;

    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
        authTagLength: AUTH_TAG_LENGTH
    });

    // Set the authentication tag
    decipher.setAuthTag(authTag);

    // Decrypt
    try {
        let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error: any) {
        throw new Error(
            `Decryption failed: ${error.message}. ` +
            'This may indicate the encryption key has changed or data is corrupted.'
        );
    }
}

/**
 * Check if a string appears to be encrypted (has the expected format)
 * @param data - String to check
 * @returns true if the string looks like encrypted data
 */
export function isEncrypted(data: string): boolean {
    if (!data) return false;

    const parts = data.split(':');
    if (parts.length !== 3) return false;

    // Check if parts look like base64
    const base64Regex = /^[A-Za-z0-9+/=]+$/;
    return parts.every(part => base64Regex.test(part));
}
