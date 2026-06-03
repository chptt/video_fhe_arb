/**
 * lib/encryption.ts
 *
 * AES-256-GCM encryption utilities for PrivateStream Arbitrum.
 *
 * Implementation details:
 *   - AES-256-GCM for authenticated encryption
 *   - Server-side key management
 *   - Decryption happens exclusively inside server-side API routes
 *   - Encrypted ciphertext stored on IPFS
 *
 * SECURITY: This module must ONLY be imported in server-side code.
 *           Never import in client components or pages.
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits recommended for GCM

function getMasterKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_MASTER_KEY;
  if (!keyHex) {
    throw new Error("ENCRYPTION_MASTER_KEY environment variable is not set");
  }
  const keyBuffer = Buffer.from(keyHex, "hex");
  if (keyBuffer.length !== 32) {
    throw new Error("ENCRYPTION_MASTER_KEY must be 32 bytes (64 hex characters)");
  }
  return keyBuffer;
}

export interface EncryptedPayload {
  iv: string;
  ciphertext: string;
  authTag: string;
}

/**
 * Encrypts a plaintext string with AES-256-GCM.
 * @param plaintext - The string to encrypt
 * @returns Encrypted payload with iv, ciphertext, authTag (base64 encoded)
 */
export function encryptText(plaintext: string): EncryptedPayload {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getMasterKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString("base64"),
    ciphertext: encrypted,
    authTag: authTag.toString("base64"),
  };
}

/**
 * Decrypts an AES-256-GCM payload.
 * @param payload - Encrypted payload object
 * @returns Decrypted plaintext string
 */
export function decryptText(payload: EncryptedPayload): string {
  const key = getMasterKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(payload.iv, "base64")
  );

  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));

  let decrypted = decipher.update(payload.ciphertext, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Generates a secure random 256-bit (32-byte) key for ENCRYPTION_MASTER_KEY.
 * Run this once locally and store the result in your .env file.
 * Never commit this key to git!
 */
export function generateMasterKey(): string {
  return crypto.randomBytes(32).toString("hex");
}
