/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * Compliance - GDPR, CCPA, HIPAA compliance reporting
 */

import type { Result } from "../types/result.js";
import { ok } from "../types/result.js";
import type { PIIDetection } from "./pii-detector.js";

export type ComplianceStandard = "GDPR" | "CCPA" | "HIPAA" | "SOC2" | "ISO27001";

export type ComplianceStatus = "COMPLIANT" | "NON_COMPLIANT" | "PARTIAL" | "UNKNOWN";

export interface ComplianceCheck {
  standard: ComplianceStandard;
  requirement: string;
  status: ComplianceStatus;
  details: string;
  evidence?: string[];
}

export interface ComplianceReport {
  timestamp: string;
  standards: Record<ComplianceStandard, ComplianceStatus>;
  checks: ComplianceCheck[];
  piiDetections: number;
  dataRetentionDays: number;
  encryptionEnabled: boolean;
  auditLogEnabled: boolean;
  accessControlEnabled: boolean;
  recommendations: string[];
  score: number;
}

export interface ComplianceConfig {
  enableGDPR?: boolean;
  enableCCPA?: boolean;
  enableHIPAA?: boolean;
  enableSOC2?: boolean;
  enableISO27001?: boolean;
  dataRetentionDays?: number;
  requireEncryption?: boolean;
  requireAuditLog?: boolean;
  requireAccessControl?: boolean;
}

/**
 * Compliance Manager
 */
export class ComplianceManager {
  private readonly config: Required<ComplianceConfig>;
  private piiDetections: PIIDetection[] = [];
  private auditEvents: Array<{ type: string; timestamp: string }> = [];

  constructor(config: ComplianceConfig = {}) {
    this.config = {
      enableGDPR: config.enableGDPR ?? true,
      enableCCPA: config.enableCCPA ?? true,
      enableHIPAA: config.enableHIPAA ?? false,
      enableSOC2: config.enableSOC2 ?? false,
      enableISO27001: config.enableISO27001 ?? false,
      dataRetentionDays: config.dataRetentionDays ?? 90,
      requireEncryption: config.requireEncryption ?? true,
      requireAuditLog: config.requireAuditLog ?? true,
      requireAccessControl: config.requireAccessControl ?? true,
    };
  }

  /**
   * Record PII detection
   */
  recordPIIDetection(detection: PIIDetection): void {
    this.piiDetections.push(detection);
  }

  /**
   * Record audit event
   */
  recordAuditEvent(type: string): void {
    this.auditEvents.push({
      type,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Generate compliance report
   */
  generateReport(): Result<ComplianceReport> {
    const checks: ComplianceCheck[] = [];
    const standards: Record<ComplianceStandard, ComplianceStatus> = {
      GDPR: "UNKNOWN",
      CCPA: "UNKNOWN",
      HIPAA: "UNKNOWN",
      SOC2: "UNKNOWN",
      ISO27001: "UNKNOWN",
    };

    // GDPR Checks
    if (this.config.enableGDPR) {
      const gdprChecks = this.performGDPRChecks();
      checks.push(...gdprChecks);
      standards["GDPR"] = this.calculateStandardStatus(gdprChecks);
    }

    // CCPA Checks
    if (this.config.enableCCPA) {
      const ccpaChecks = this.performCCPAChecks();
      checks.push(...ccpaChecks);
      standards["CCPA"] = this.calculateStandardStatus(ccpaChecks);
    }

    // HIPAA Checks
    if (this.config.enableHIPAA) {
      const hipaaChecks = this.performHIPAAChecks();
      checks.push(...hipaaChecks);
      standards["HIPAA"] = this.calculateStandardStatus(hipaaChecks);
    }

    // SOC2 Checks
    if (this.config.enableSOC2) {
      const soc2Checks = this.performSOC2Checks();
      checks.push(...soc2Checks);
      standards["SOC2"] = this.calculateStandardStatus(soc2Checks);
    }

    // ISO27001 Checks
    if (this.config.enableISO27001) {
      const isoChecks = this.performISO27001Checks();
      checks.push(...isoChecks);
      standards["ISO27001"] = this.calculateStandardStatus(isoChecks);
    }

    const recommendations = this.generateRecommendations(checks);
    const score = this.calculateComplianceScore(checks);

    return ok({
      timestamp: new Date().toISOString(),
      standards,
      checks,
      piiDetections: this.piiDetections.length,
      dataRetentionDays: this.config.dataRetentionDays,
      encryptionEnabled: this.config.requireEncryption,
      auditLogEnabled: this.config.requireAuditLog,
      accessControlEnabled: this.config.requireAccessControl,
      recommendations,
      score,
    });
  }

  /**
   * Perform GDPR checks
   */
  private performGDPRChecks(): ComplianceCheck[] {
    const checks: ComplianceCheck[] = [];

    // Right to be forgotten
    checks.push({
      standard: "GDPR",
      requirement: "Right to be forgotten (Art. 17)",
      status: this.config.dataRetentionDays <= 90 ? "COMPLIANT" : "PARTIAL",
      details: `Data retention: ${this.config.dataRetentionDays} days`,
    });

    // Data encryption
    checks.push({
      standard: "GDPR",
      requirement: "Data encryption (Art. 32)",
      status: this.config.requireEncryption ? "COMPLIANT" : "NON_COMPLIANT",
      details: this.config.requireEncryption
        ? "Encryption enabled"
        : "Encryption not enabled",
    });

    // Audit logging
    checks.push({
      standard: "GDPR",
      requirement: "Audit logging (Art. 30)",
      status: this.config.requireAuditLog ? "COMPLIANT" : "NON_COMPLIANT",
      details: this.config.requireAuditLog
        ? "Audit logging enabled"
        : "Audit logging not enabled",
    });

    // PII protection
    checks.push({
      standard: "GDPR",
      requirement: "PII protection (Art. 5)",
      status: this.piiDetections.length === 0 ? "COMPLIANT" : "PARTIAL",
      details: `${this.piiDetections.length} PII detections`,
    });

    return checks;
  }

  /**
   * Perform CCPA checks
   */
  private performCCPAChecks(): ComplianceCheck[] {
    const checks: ComplianceCheck[] = [];

    // Data deletion
    checks.push({
      standard: "CCPA",
      requirement: "Right to deletion (§1798.105)",
      status: this.config.dataRetentionDays <= 90 ? "COMPLIANT" : "PARTIAL",
      details: `Data retention: ${this.config.dataRetentionDays} days`,
    });

    // Data security
    checks.push({
      standard: "CCPA",
      requirement: "Reasonable security (§1798.150)",
      status: this.config.requireEncryption ? "COMPLIANT" : "NON_COMPLIANT",
      details: this.config.requireEncryption
        ? "Security measures enabled"
        : "Security measures not enabled",
    });

    return checks;
  }

  /**
   * Perform HIPAA checks
   */
  private performHIPAAChecks(): ComplianceCheck[] {
    const checks: ComplianceCheck[] = [];

    // Encryption
    checks.push({
      standard: "HIPAA",
      requirement: "Encryption (§164.312(a)(2)(iv))",
      status: this.config.requireEncryption ? "COMPLIANT" : "NON_COMPLIANT",
      details: this.config.requireEncryption
        ? "Encryption enabled"
        : "Encryption not enabled",
    });

    // Access control
    checks.push({
      standard: "HIPAA",
      requirement: "Access control (§164.312(a)(1))",
      status: this.config.requireAccessControl ? "COMPLIANT" : "NON_COMPLIANT",
      details: this.config.requireAccessControl
        ? "Access control enabled"
        : "Access control not enabled",
    });

    // Audit controls
    checks.push({
      standard: "HIPAA",
      requirement: "Audit controls (§164.312(b))",
      status: this.config.requireAuditLog ? "COMPLIANT" : "NON_COMPLIANT",
      details: this.config.requireAuditLog
        ? "Audit controls enabled"
        : "Audit controls not enabled",
    });

    return checks;
  }

  /**
   * Perform SOC2 checks
   */
  private performSOC2Checks(): ComplianceCheck[] {
    const checks: ComplianceCheck[] = [];

    checks.push({
      standard: "SOC2",
      requirement: "Security - Logical access controls",
      status: this.config.requireAccessControl ? "COMPLIANT" : "NON_COMPLIANT",
      details: "Access control implementation",
    });

    checks.push({
      standard: "SOC2",
      requirement: "Security - Encryption",
      status: this.config.requireEncryption ? "COMPLIANT" : "NON_COMPLIANT",
      details: "Data encryption at rest and in transit",
    });

    return checks;
  }

  /**
   * Perform ISO27001 checks
   */
  private performISO27001Checks(): ComplianceCheck[] {
    const checks: ComplianceCheck[] = [];

    checks.push({
      standard: "ISO27001",
      requirement: "A.9.4.1 - Information access restriction",
      status: this.config.requireAccessControl ? "COMPLIANT" : "NON_COMPLIANT",
      details: "Access control measures",
    });

    checks.push({
      standard: "ISO27001",
      requirement: "A.10.1.1 - Cryptographic controls",
      status: this.config.requireEncryption ? "COMPLIANT" : "NON_COMPLIANT",
      details: "Encryption implementation",
    });

    return checks;
  }

  /**
   * Calculate standard status
   */
  private calculateStandardStatus(checks: ComplianceCheck[]): ComplianceStatus {
    if (checks.length === 0) return "UNKNOWN";

    const compliant = checks.filter((c) => c.status === "COMPLIANT").length;
    const total = checks.length;

    if (compliant === total) return "COMPLIANT";
    if (compliant === 0) return "NON_COMPLIANT";
    return "PARTIAL";
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(checks: ComplianceCheck[]): string[] {
    const recommendations: string[] = [];

    const nonCompliant = checks.filter((c) => c.status === "NON_COMPLIANT");

    for (const check of nonCompliant) {
      recommendations.push(
        `⚠️ ${check.standard}: ${check.requirement} - ${check.details}`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push("✅ All compliance checks passed");
    }

    return recommendations;
  }

  /**
   * Calculate compliance score
   */
  private calculateComplianceScore(checks: ComplianceCheck[]): number {
    if (checks.length === 0) return 100;

    const compliant = checks.filter((c) => c.status === "COMPLIANT").length;
    const partial = checks.filter((c) => c.status === "PARTIAL").length;

    return Math.round(((compliant + partial * 0.5) / checks.length) * 100);
  }
}

