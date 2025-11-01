/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * Encryption - AES-256-GCM encryption for data at rest
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scrypt,
} from "node:crypto";
import { promisify } from "node:util";
import type { Result } from "../types/result.js";
import { ok, err } from "../types/result.js";

const scryptAsync = promisify(scrypt);

export interface EncryptionOptions {
  algorithm?: string;
  keyLength?: number;
  ivLength?: number;
  saltLength?: number;
  tagLength?: number;
}

export interface EncryptedData {
  encrypted: string;
  iv: string;
  salt: string;
  tag: string;
}

const DEFAULT_OPTIONS: Required<EncryptionOptions> = {
  algorithm: "aes-256-gcm",
  keyLength: 32,
  ivLength: 16,
  saltLength: 32,
  tagLength: 16,
};

/**
 * Encrypt data with password
 */
export async function encrypt(
  data: string,
  password: string,
  options: EncryptionOptions = {}
): Promise<Result<EncryptedData>> {
  try {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Generate random salt and IV
    const salt = randomBytes(opts.saltLength);
    const iv = randomBytes(opts.ivLength);

    // Derive key from password
    const key = (await scryptAsync(password, salt, opts.keyLength)) as Buffer;

    // Create cipher
    const cipher = createCipheriv(opts.algorithm, key, iv) as any;

    // Encrypt data
    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");

    // Get authentication tag
    const tag = cipher.getAuthTag() as Buffer;

    return ok({
      encrypted,
      iv: iv.toString("hex"),
      salt: salt.toString("hex"),
      tag: tag.toString("hex"),
    });
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Decrypt data with password
 */
export async function decrypt(
  encryptedData: EncryptedData,
  password: string,
  options: EncryptionOptions = {}
): Promise<Result<string>> {
  try {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Convert hex strings back to buffers
    const salt = Buffer.from(encryptedData.salt, "hex");
    const iv = Buffer.from(encryptedData.iv, "hex");
    const tag = Buffer.from(encryptedData.tag, "hex");

    // Derive key from password
    const key = (await scryptAsync(password, salt, opts.keyLength)) as Buffer;

    // Create decipher
    const decipher = createDecipheriv(opts.algorithm, key, iv) as any;
    decipher.setAuthTag(tag);

    // Decrypt data
    let decrypted = decipher.update(encryptedData.encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return ok(decrypted);
  } catch (error) {
    return err(error instanceof Error ? error : new Error("Decryption failed"));
  }
}

/**
 * Generate secure random password
 */
export function generatePassword(length = 32): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  const bytes = randomBytes(length);
  let password = "";

  for (let i = 0; i < length; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      password += chars[byte % chars.length];
    }
  }

  return password;
}

/**
 * Generate encryption key
 */
export function generateKey(length = 32): string {
  return randomBytes(length).toString("hex");
}

/**
 * Hash password with salt (for storage)
 */
export async function hashPassword(password: string): Promise<Result<string>> {
  try {
    const salt = randomBytes(32);
    const hash = (await scryptAsync(password, salt, 64)) as Buffer;

    return ok(`${salt.toString("hex")}:${hash.toString("hex")}`);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Verify password against hash
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<Result<boolean>> {
  try {
    const parts = hashedPassword.split(":");
    const saltHex = parts[0];
    const hashHex = parts[1];

    if (!saltHex || !hashHex) {
      return err(new Error("Invalid hash format"));
    }

    const salt = Buffer.from(saltHex, "hex");
    const hash = (await scryptAsync(password, salt, 64)) as Buffer;

    return ok(hash.toString("hex") === hashHex);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Encrypt file content
 */
export async function encryptFile(
  content: string,
  password: string
): Promise<Result<string>> {
  const encryptResult = await encrypt(content, password);
  if (!encryptResult.ok) {
    return err(encryptResult.error);
  }

  // Serialize encrypted data
  const serialized = JSON.stringify(encryptResult.value);
  return ok(serialized);
}

/**
 * Decrypt file content
 */
export async function decryptFile(
  encryptedContent: string,
  password: string
): Promise<Result<string>> {
  try {
    const encryptedData = JSON.parse(encryptedContent) as EncryptedData;
    return await decrypt(encryptedData, password);
  } catch (error) {
    return err(
      error instanceof Error
        ? error
        : new Error("Invalid encrypted file format")
    );
  }
}

/**
 * Secure key derivation
 */
export async function deriveKey(
  password: string,
  salt: string,
  keyLength = 32
): Promise<Result<Buffer>> {
  try {
    const saltBuffer = Buffer.from(salt, "hex");
    const key = (await scryptAsync(password, saltBuffer, keyLength)) as Buffer;
    return ok(key);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Constant-time comparison to prevent timing attacks
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Generate secure token
 */
export function generateToken(length = 32): string {
  return randomBytes(length).toString("base64url");
}

/**
 * Encrypt sensitive configuration
 */
export async function encryptConfig(
  config: Record<string, unknown>,
  password: string
): Promise<Result<string>> {
  try {
    const configString = JSON.stringify(config);
    return await encryptFile(configString, password);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Decrypt sensitive configuration
 */
export async function decryptConfig(
  encryptedConfig: string,
  password: string
): Promise<Result<Record<string, unknown>>> {
  const decryptResult = await decryptFile(encryptedConfig, password);
  if (!decryptResult.ok) {
    return err(decryptResult.error);
  }

  try {
    const config = JSON.parse(decryptResult.value) as Record<string, unknown>;
    return ok(config);
  } catch (error) {
    return err(
      error instanceof Error ? error : new Error("Invalid config format")
    );
  }
}
