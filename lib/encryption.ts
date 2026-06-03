/**
 * lib/encryption.ts
 *
 * Microsoft SEAL (FHE) encryption utilities for PrivateStream Arbitrum.
 *
 * Implementation details:
 *   - SEAL BFV scheme for encryption
 *   - Server-side key management
 *   - Decryption happens exclusively inside server-side API routes
 *   - Encrypted ciphertext stored on IPFS
 *
 * SECURITY: This module must ONLY be imported in server-side code.
 *           Never import in client components or pages.
 */

import Seal from "node-seal";

// Cached SEAL instance and keys (initialized once)
let seal: any = null;
let context: any = null;
let secretKey: any = null;
let publicKey: any = null;
let encryptor: any = null;
let decryptor: any = null;
let batchEncoder: any = null;

async function initSeal() {
  if (seal) return;

  console.log("🔐 Initializing Microsoft SEAL FHE...");
  seal = await Seal();

  // Set up BFV encryption parameters
  const parms = seal.EncryptionParameters(seal.SchemeType.bfv);
  parms.setPolyModulusDegree(4096);
  parms.setCoeffModulus(seal.CoeffModulus.BFVDefault(4096));
  parms.setPlainModulus(seal.PlainModulus.Batching(4096, 20));

  // Create SEAL context
  context = seal.Context(parms, true, seal.SecurityLevel.tc128);
  if (!context.parametersSet()) {
    throw new Error("SEAL parameters are not valid!");
  }

  // Generate keys
  const keyGenerator = seal.KeyGenerator(context);
  secretKey = keyGenerator.secretKey();
  publicKey = keyGenerator.createPublicKey();

  // Create encryptor, decryptor, and batch encoder
  encryptor = seal.Encryptor(context, publicKey);
  decryptor = seal.Decryptor(context, secretKey);
  batchEncoder = seal.BatchEncoder(context);

  console.log("✅ Microsoft SEAL FHE initialized successfully!");
}

/**
 * Encodes a string into a SEAL Plaintext using batch encoding
 */
function encodeString(str: string): any {
  const textEncoder = new TextEncoder();
  const bytes = textEncoder.encode(str);
  const intArray = Array.from(bytes);

  // Pad to batch size if needed
  const slotCount = batchEncoder.slotCount();
  const padded = new Array(slotCount).fill(0);
  for (let i = 0; i < intArray.length; i++) {
    padded[i] = intArray[i];
  }

  const plaintext = seal.Plaintext();
  batchEncoder.encode(padded, plaintext);
  return plaintext;
}

/**
 * Decodes a SEAL Plaintext back into a string
 */
function decodeString(plaintext: any): string {
  const intArray = batchEncoder.decode(plaintext);

  // Find the end of the actual data (before trailing zeros)
  let end = intArray.length;
  while (end > 0 && intArray[end - 1] === 0) {
    end--;
  }

  const bytes = new Uint8Array(intArray.slice(0, end));
  const textDecoder = new TextDecoder();
  return textDecoder.decode(bytes);
}

/**
 * Encrypts a plaintext string using Microsoft SEAL FHE
 * @returns Base64-encoded ciphertext string
 */
export async function encryptText(plaintext: string): Promise<string> {
  await initSeal();

  const plain = encodeString(plaintext);
  const cipher = seal.Ciphertext();
  encryptor.encrypt(plain, cipher);

  return cipher.save();
}

/**
 * Decrypts a SEAL-encrypted ciphertext
 * @param ciphertextBase64 Base64-encoded ciphertext from encryptText
 * @returns Decrypted plaintext string
 */
export async function decryptText(ciphertextBase64: string): Promise<string> {
  await initSeal();

  const cipher = seal.Ciphertext();
  cipher.load(context, ciphertextBase64);

  const plain = seal.Plaintext();
  decryptor.decrypt(cipher, plain);

  return decodeString(plain);
}
