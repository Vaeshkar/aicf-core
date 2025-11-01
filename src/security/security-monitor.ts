/**
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * Security Monitor - Real-time security threat detection and monitoring
 */

import type { Result } from "../types/result.js";
import { ok } from "../types/result.js";

export type ThreatLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ThreatType =
  | "path_traversal"
  | "injection_attempt"
  | "pii_exposure"
  | "rate_limit_exceeded"
  | "unauthorized_access"
  | "suspicious_pattern"
  | "data_exfiltration"
  | "brute_force";

export interface SecurityThreat {
  id: string;
  type: ThreatType;
  level: ThreatLevel;
  timestamp: string;
  description: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface SecurityMetrics {
  totalThreats: number;
  threatsByLevel: Record<ThreatLevel, number>;
  threatsByType: Record<ThreatType, number>;
  lastThreat?: SecurityThreat;
  timeWindow: string;
}

export interface MonitoringConfig {
  enableRealTimeAlerts?: boolean;
  alertThreshold?: ThreatLevel;
  maxThreatsInMemory?: number;
  anomalyDetection?: boolean;
}

/**
 * Security Monitor
 */
export class SecurityMonitor {
  private threats: SecurityThreat[] = [];
  private readonly config: Required<MonitoringConfig>;
  private alertCallbacks: Array<(threat: SecurityThreat) => void> = [];

  constructor(config: MonitoringConfig = {}) {
    this.config = {
      enableRealTimeAlerts: config.enableRealTimeAlerts ?? true,
      alertThreshold: config.alertThreshold ?? "MEDIUM",
      maxThreatsInMemory: config.maxThreatsInMemory ?? 1000,
      anomalyDetection: config.anomalyDetection ?? true,
    };
  }

  /**
   * Report security threat
   */
  reportThreat(
    type: ThreatType,
    level: ThreatLevel,
    description: string,
    metadata?: Record<string, unknown>
  ): Result<SecurityThreat> {
    const threat: SecurityThreat = {
      id: `threat_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      type,
      level,
      timestamp: new Date().toISOString(),
      description,
      ...(metadata && { metadata }),
    };

    this.threats.push(threat);

    // Limit memory usage
    if (this.threats.length > this.config.maxThreatsInMemory) {
      this.threats.shift();
    }

    // Trigger alerts
    if (this.config.enableRealTimeAlerts && this.shouldAlert(level)) {
      this.triggerAlert(threat);
    }

    return ok(threat);
  }

  /**
   * Check if should alert
   */
  private shouldAlert(level: ThreatLevel): boolean {
    const levels: ThreatLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
    const currentIndex = levels.indexOf(level);
    const thresholdIndex = levels.indexOf(this.config.alertThreshold);

    return currentIndex >= thresholdIndex;
  }

  /**
   * Trigger alert
   */
  private triggerAlert(threat: SecurityThreat): void {
    for (const callback of this.alertCallbacks) {
      try {
        callback(threat);
      } catch (error) {
        console.error("Error in alert callback:", error);
      }
    }
  }

  /**
   * Register alert callback
   */
  onAlert(callback: (threat: SecurityThreat) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Get security metrics
   */
  getMetrics(timeWindowMs = 3600000): SecurityMetrics {
    const now = Date.now();
    const windowStart = now - timeWindowMs;

    const recentThreats = this.threats.filter(
      (t) => new Date(t.timestamp).getTime() >= windowStart
    );

    const threatsByLevel: Record<ThreatLevel, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };

    const threatsByType: Record<ThreatType, number> = {
      path_traversal: 0,
      injection_attempt: 0,
      pii_exposure: 0,
      rate_limit_exceeded: 0,
      unauthorized_access: 0,
      suspicious_pattern: 0,
      data_exfiltration: 0,
      brute_force: 0,
    };

    for (const threat of recentThreats) {
      threatsByLevel[threat.level]++;
      threatsByType[threat.type]++;
    }

    const lastThreat = recentThreats[recentThreats.length - 1];

    return {
      totalThreats: recentThreats.length,
      threatsByLevel,
      threatsByType,
      ...(lastThreat && { lastThreat }),
      timeWindow: `${timeWindowMs / 1000}s`,
    };
  }

  /**
   * Get threats by level
   */
  getThreatsByLevel(level: ThreatLevel, limit = 100): SecurityThreat[] {
    return this.threats.filter((t) => t.level === level).slice(-limit);
  }

  /**
   * Get threats by type
   */
  getThreatsByType(type: ThreatType, limit = 100): SecurityThreat[] {
    return this.threats.filter((t) => t.type === type).slice(-limit);
  }

  /**
   * Get all threats
   */
  getAllThreats(limit = 100): SecurityThreat[] {
    return this.threats.slice(-limit);
  }

  /**
   * Clear threats
   */
  clearThreats(): void {
    this.threats.length = 0;
  }

  /**
   * Detect anomalies
   */
  detectAnomalies(): Result<SecurityThreat[]> {
    if (!this.config.anomalyDetection) {
      return ok([]);
    }

    const anomalies: SecurityThreat[] = [];
    const metrics = this.getMetrics(3600000); // Last hour

    // Check for rate limit abuse
    if (metrics.threatsByType["rate_limit_exceeded"] > 10) {
      const threat: SecurityThreat = {
        id: `anomaly_${Date.now()}`,
        type: "brute_force",
        level: "HIGH",
        timestamp: new Date().toISOString(),
        description: "Possible brute force attack detected",
        metadata: {
          rateLimitViolations: metrics.threatsByType["rate_limit_exceeded"],
        },
      };
      anomalies.push(threat);
    }

    // Check for path traversal attempts
    if (metrics.threatsByType["path_traversal"] > 5) {
      const threat: SecurityThreat = {
        id: `anomaly_${Date.now()}`,
        type: "path_traversal",
        level: "CRITICAL",
        timestamp: new Date().toISOString(),
        description: "Multiple path traversal attempts detected",
        metadata: {
          attempts: metrics.threatsByType["path_traversal"],
        },
      };
      anomalies.push(threat);
    }

    // Check for PII exposure
    if (metrics.threatsByType["pii_exposure"] > 3) {
      const threat: SecurityThreat = {
        id: `anomaly_${Date.now()}`,
        type: "pii_exposure",
        level: "HIGH",
        timestamp: new Date().toISOString(),
        description: "Multiple PII exposure incidents detected",
        metadata: {
          incidents: metrics.threatsByType["pii_exposure"],
        },
      };
      anomalies.push(threat);
    }

    return ok(anomalies);
  }

  /**
   * Get security status
   */
  getSecurityStatus(): Result<{
    status: "SECURE" | "WARNING" | "ALERT" | "CRITICAL";
    level: ThreatLevel;
    message: string;
    metrics: SecurityMetrics;
  }> {
    const metrics = this.getMetrics(3600000);

    let status: "SECURE" | "WARNING" | "ALERT" | "CRITICAL" = "SECURE";
    let level: ThreatLevel = "LOW";
    let message = "No security threats detected";

    if (metrics.threatsByLevel["CRITICAL"] > 0) {
      status = "CRITICAL";
      level = "CRITICAL";
      message = `${metrics.threatsByLevel["CRITICAL"]} critical threats detected`;
    } else if (metrics.threatsByLevel["HIGH"] > 0) {
      status = "ALERT";
      level = "HIGH";
      message = `${metrics.threatsByLevel["HIGH"]} high-level threats detected`;
    } else if (metrics.threatsByLevel["MEDIUM"] > 0) {
      status = "WARNING";
      level = "MEDIUM";
      message = `${metrics.threatsByLevel["MEDIUM"]} medium-level threats detected`;
    } else if (metrics.totalThreats > 0) {
      status = "WARNING";
      level = "LOW";
      message = `${metrics.totalThreats} low-level threats detected`;
    }

    return ok({
      status,
      level,
      message,
      metrics,
    });
  }
}

/**
 * Create global security monitor instance
 */
let globalMonitor: SecurityMonitor | null = null;

export function getGlobalMonitor(): SecurityMonitor {
  if (!globalMonitor) {
    globalMonitor = new SecurityMonitor();
  }
  return globalMonitor;
}

/**
 * Report threat to global monitor
 */
export function reportGlobalThreat(
  type: ThreatType,
  level: ThreatLevel,
  description: string,
  metadata?: Record<string, unknown>
): Result<SecurityThreat> {
  return getGlobalMonitor().reportThreat(type, level, description, metadata);
}
