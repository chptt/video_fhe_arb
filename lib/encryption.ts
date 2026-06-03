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

// Cached SEAL instance
let sealInstance: any = null;
let context: any = null;
let secretKey: any = null;
let publicKey: any = null;
let encryptor: any = null;
let decryptor: any = null;
let batchEncoder: any = null;
let isInitialized = false;

async function initSeal(): Promise<void> {
  if (isInitialized) return;

  console.log("🔐 Initializing Microsoft SEAL...");
  sealInstance = await Seal();

  // Set up BFV parameters with smaller poly modulus for better performance
  const parms = sealInstance.EncryptionParameters(sealInstance.SchemeType.bfv);
  parms.setPolyModulusDegree(4096);
  parms.setCoeffModulus(sealInstance.CoeffModulus.BFVDefault(4096));
  parms.setPlainModulus(sealInstance.PlainModulus.Batching(4096, 20));

  // Create context
  context = sealInstance.Context(parms, true, sealInstance.SecurityLevel.none);
  if (!context.parametersSet()) {
    throw new Error("Failed to set SEAL parameters");
  }

  // Generate keys
  const keyGenerator = sealInstance.KeyGenerator(context);
  secretKey = keyGenerator.secretKey();
  publicKey = keyGenerator.createPublicKey();

  // Create encryptor, decryptor, and encoder
  encryptor = sealInstance.Encryptor(context, publicKey);
  decryptor = sealInstance.Decryptor(context, secretKey);
  batchEncoder = sealInstance.BatchEncoder(context);

  isInitialized = true;
  console.log("✅ SEAL initialized successfully");
}

export async function encryptText(plaintext: string): Promise<string> {
  await initSeal();

  // Encode string to bytes, then to an array of numbers
  const bytes = new TextEncoder().encode(plaintext);
  const numArray = Array.from(bytes);

  // Pad to batch size (fill remaining slots with 0)
  const slotCount = batchEncoder.slotCount();
  const padded = new Array(slotCount).fill(0);
  for (let i = 0; i < numArray.length; i++) {
    padded[i] = numArray[i];
  }

  // Encode, encrypt, and serialize
  const plain = sealInstance.Plaintext();
  batchEncoder.encode(padded, plain);

  const cipher = sealInstance.Ciphertext();
  encryptor.encrypt(plain, cipher);

  return cipher.save();
}

export async function decryptText(ciphertextBase64: string): Promise<string> {
  await initSeal();

  // Deserialize ciphertext
  const cipher = sealInstance.Ciphertext();
  cipher.load(context, ciphertextBase64);

  // Decrypt and decode
  const plain = sealInstance.Plaintext();
  decryptor.decrypt(cipher, plain);

  const decodedArray = batchEncoder.decode(plain);

  // Find the end of the actual data (before trailing zeros)
  let end = decodedArray.length;
  while (end > 0 && decodedArray[end - 1] === 0) {
    end--;
  }

  // Convert back to bytes and string
  const resultBytes = new Uint8Array(decodedArray.slice(0, end));
  return new TextDecoder().decode(resultBytes);
}
