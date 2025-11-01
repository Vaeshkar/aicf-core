/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * PII Detection Patterns
 */

export interface PIIPattern {
  pattern: RegExp;
  replacement: string;
  validator?: (value: string) => boolean;
}

export type PIIType =
  | "ssn"
  | "creditCard"
  | "email"
  | "phone"
  | "apiKey"
  | "awsKey"
  | "githubToken"
  | "openaiKey"
  | "anthropicKey"
  | "ipAddress"
  | "dateOfBirth"
  | "passport";

/**
 * PII detection patterns
 */
export const PII_PATTERNS: Record<PIIType, PIIPattern> = {
  // SSN: 123-45-6789 or 123456789
  ssn: {
    pattern: /\b\d{3}-?\d{2}-?\d{4}\b/g,
    replacement: "[SSN-REDACTED]",
    validator: validateSSN,
  },

  // Credit Cards: Visa, MasterCard, Amex, Discover
  creditCard: {
    pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    replacement: "[CREDIT-CARD-REDACTED]",
    validator: validateCreditCard,
  },

  // Email addresses
  email: {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: "[EMAIL-REDACTED]",
  },

  // Phone numbers: (123) 456-7890, 123-456-7890, 1234567890
  phone: {
    pattern:
      /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
    replacement: "[PHONE-REDACTED]",
  },

  // API Keys (common patterns)
  apiKey: {
    pattern:
      /\b(?:api[_-]?key|token|secret|password|bearer)[\s:=]+['\"]?([a-zA-Z0-9_\-]{20,})['\"]?/gi,
    replacement: "[API-KEY-REDACTED]",
  },

  // AWS Keys
  awsKey: {
    pattern: /\b(AKIA[0-9A-Z]{16})\b/g,
    replacement: "[AWS-KEY-REDACTED]",
  },

  // GitHub Tokens
  githubToken: {
    pattern:
      /\b(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59})\b/g,
    replacement: "[GITHUB-TOKEN-REDACTED]",
  },

  // OpenAI API Keys
  openaiKey: {
    pattern: /\b(sk-[a-zA-Z0-9]{48})\b/g,
    replacement: "[OPENAI-KEY-REDACTED]",
  },

  // Anthropic API Keys (sk-ant-api03-...)
  anthropicKey: {
    pattern: /\b(sk-ant-[a-zA-Z0-9_-]{95,})\b/g,
    replacement: "[ANTHROPIC-KEY-REDACTED]",
  },

  // IP Addresses (IPv4)
  ipAddress: {
    pattern:
      /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    replacement: "[IP-REDACTED]",
  },

  // Date of Birth: MM/DD/YYYY, MM-DD-YYYY, YYYY-MM-DD
  dateOfBirth: {
    pattern:
      /\b(?:0[1-9]|1[0-2])[-/](?:0[1-9]|[12][0-9]|3[01])[-/](?:19|20)\d{2}\b/g,
    replacement: "[DOB-REDACTED]",
  },

  // Passport Numbers (US format)
  passport: {
    pattern: /\b[A-Z]{1,2}[0-9]{6,9}\b/g,
    replacement: "[PASSPORT-REDACTED]",
  },
};

/**
 * Validate credit card using Luhn algorithm
 */
export function validateCreditCard(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) {
    return false;
  }

  let sum = 0;
  let isEven = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i] ?? "0", 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Validate SSN format
 */
export function validateSSN(ssn: string): boolean {
  const cleaned = ssn.replace(/\D/g, "");
  if (cleaned.length !== 9) {
    return false;
  }

  // Invalid SSN patterns
  const area = cleaned.substring(0, 3);
  const group = cleaned.substring(3, 5);
  const serial = cleaned.substring(5, 9);

  // Check for invalid patterns
  if (area === "000" || area === "666" || area[0] === "9") {
    return false;
  }
  if (group === "00") {
    return false;
  }
  if (serial === "0000") {
    return false;
  }

  return true;
}

/**
 * Smart masking - show first 4 and last 4 characters
 * Example: sk-ant-api03-...abc123 → sk-a****3xyz
 */
export function smartMask(value: string, showChars: number = 4): string {
  if (value.length <= showChars * 2) {
    // Too short to mask meaningfully
    return "*".repeat(value.length);
  }

  const start = value.substring(0, showChars);
  const end = value.substring(value.length - showChars);
  const maskLength = Math.min(value.length - showChars * 2, 4); // Max 4 asterisks

  return `${start}${"*".repeat(maskLength)}${end}`;
}

/**
 * Mask API key with smart masking
 * Preserves context while protecting the secret
 */
export function maskAPIKey(key: string): string {
  return smartMask(key, 4);
}
