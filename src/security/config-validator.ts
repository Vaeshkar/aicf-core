/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Dennis van Leeuwen
 * 
 * Configuration Validator - Secure configuration defaults
 */

export interface SecurityConfig {
  maxFileSize: number;
  maxMemoryUsage: number;
  enablePIIRedaction: boolean;
  enablePathValidation: boolean;
  enableRateLimit: boolean;
  rateLimitOperations: number;
  rateLimitWindow: number;
  allowedExtensions: string[];
  maxStringLength: number;
  maxObjectSize: number;
}

/**
 * Secure default configuration
 */
export const SECURE_DEFAULTS: SecurityConfig = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  maxMemoryUsage: 500 * 1024 * 1024, // 500MB
  enablePIIRedaction: true,
  enablePathValidation: true,
  enableRateLimit: true,
  rateLimitOperations: 100,
  rateLimitWindow: 60000,
  allowedExtensions: ['.aicf'],
  maxStringLength: 10000,
  maxObjectSize: 1000000,
};

/**
 * Validate and merge configuration with secure defaults
 */
export function validateConfig(
  config: Partial<SecurityConfig> = {}
): SecurityConfig {
  return { ...SECURE_DEFAULTS, ...config };
}

/**
 * Check if file size is within limits
 */
export function isFileSizeValid(size: number, config: SecurityConfig): boolean {
  return size <= config.maxFileSize;
}

/**
 * Check if string length is within limits
 */
export function isStringLengthValid(
  str: string,
  config: SecurityConfig
): boolean {
  return str.length <= config.maxStringLength;
}

/**
 * Check if object size is within limits
 */
export function isObjectSizeValid(
  obj: unknown,
  config: SecurityConfig
): boolean {
  const size = JSON.stringify(obj).length;
  return size <= config.maxObjectSize;
}

/**
 * Check if file extension is allowed
 */
export function isExtensionAllowed(
  filename: string,
  config: SecurityConfig
): boolean {
  return config.allowedExtensions.some((ext) => filename.endsWith(ext));
}

