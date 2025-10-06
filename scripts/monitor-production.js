#!/usr/bin/env node

/**
 * AICF v3.1.1 Production Monitoring Dashboard
 * 24-48 hour system stability verification and ongoing monitoring
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class AICFProductionMonitor {
  constructor(options = {}) {
    this.options = {
      monitoringInterval: options.monitoringInterval || 60000, // 1 minute
      alertThresholds: {
        memoryUsageMB: options.memoryThreshold || 100,
        errorRate: options.errorRate || 0.05, // 5%
        responseTimeMs: options.responseTime || 1000
      },
      logRetentionHours: options.logRetention || 48,
      ...options
    };
    
    this.metrics = {
      startTime: Date.now(),
      totalRequests: 0,
      successfulRequests: 0,
      errors: 0,
      averageResponseTime: 0,
      memoryUsage: [],
      systemHealth: 'healthy'
    };
    
    this.alerts = [];
    this.isMonitoring = false;
  }

  /**
   * Start continuous monitoring
   */
  async startMonitoring() {
    console.log('🔍 Starting AICF v3.1.1 Production Monitoring...');
    console.log(`📊 Monitoring interval: ${this.options.monitoringInterval / 1000}s`);
    console.log(`⏰ Will monitor for ${this.options.logRetentionHours} hours`);
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics().catch(console.error);
    }, this.options.monitoringInterval);
    
    // Set monitoring duration
    setTimeout(() => {
      this.stopMonitoring();
    }, this.options.logRetentionHours * 60 * 60 * 1000);
    
    // Initial metrics collection
    await this.collectMetrics();
    
    console.log('✅ Production monitoring started successfully!');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    this.isMonitoring = false;
    
    console.log('\n📊 Monitoring session completed!');
    this.generateMonitoringReport();
  }

  /**
   * Collect system and application metrics
   */
  async collectMetrics() {
    const timestamp = new Date().toISOString();
    
    try {
      // System metrics
      const systemMetrics = await this.getSystemMetrics();
      
      // AICF-specific metrics
      const aicfMetrics = await this.getAICFMetrics();
      
      // Combined metrics
      const currentMetrics = {
        timestamp,
        system: systemMetrics,
        aicf: aicfMetrics
      };
      
      // Update running metrics
      this.updateRunningMetrics(currentMetrics);
      
      // Check for alerts
      this.checkAlerts(currentMetrics);
      
      // Log current status
      this.logCurrentStatus(currentMetrics);
      
      // Save metrics to file
      this.saveMetrics(currentMetrics);
      
    } catch (error) {
      console.error(`❌ Error collecting metrics: ${error.message}`);
      this.recordError('metrics_collection', error);
    }
  }

  /**
   * Get system metrics
   */
  async getSystemMetrics() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memory: {
        heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        rssMB: Math.round(memoryUsage.rss / 1024 / 1024)
      },
      cpu: {
        userCPU: cpuUsage.user,
        systemCPU: cpuUsage.system
      },
      system: {
        uptime: process.uptime(),
        loadAverage: os.loadavg(),
        freeMem: Math.round(os.freemem() / 1024 / 1024),
        totalMem: Math.round(os.totalmem() / 1024 / 1024)
      }
    };
  }

  /**
   * Get AICF-specific metrics
   */
  async getAICFMetrics() {
    try {
      // Test basic AICF operations
      const testStartTime = Date.now();
      
      // Create temporary test to measure response time
      const testDir = path.join(process.cwd(), 'monitoring-test-temp');
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }
      
      // Basic operation test
      const AICFSecure = require(path.resolve('src/aicf-secure.js'));
      const aicf = new AICFSecure(testDir);
      
      // Test write operation
      await aicf.appendConversation({
        id: `monitoring-test-${Date.now()}`,
        messages: 1,
        tokens: 10,
        timestamp_start: new Date().toISOString()
      });
      
      // Test read operation
      const conversations = await aicf.getConversations();
      
      const responseTime = Date.now() - testStartTime;
      
      // Cleanup
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
      
      this.metrics.totalRequests++;
      this.metrics.successfulRequests++;
      
      return {
        responseTimeMs: responseTime,
        conversationsFound: conversations.length,
        operationSuccess: true,
        lastTestedAt: new Date().toISOString()
      };
      
    } catch (error) {
      this.metrics.totalRequests++;
      this.metrics.errors++;
      
      return {
        responseTimeMs: null,
        operationSuccess: false,
        error: error.message,
        lastTestedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Update running metrics
   */
  updateRunningMetrics(currentMetrics) {
    // Update average response time
    if (currentMetrics.aicf.responseTimeMs) {
      const totalResponseTime = this.metrics.averageResponseTime * (this.metrics.successfulRequests - 1) + currentMetrics.aicf.responseTimeMs;
      this.metrics.averageResponseTime = Math.round(totalResponseTime / this.metrics.successfulRequests);
    }
    
    // Track memory usage
    this.metrics.memoryUsage.push({
      timestamp: currentMetrics.timestamp,
      heapUsedMB: currentMetrics.system.memory.heapUsedMB
    });
    
    // Keep only last 100 memory readings
    if (this.metrics.memoryUsage.length > 100) {
      this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-100);
    }
  }

  /**
   * Check for alerts
   */
  checkAlerts(currentMetrics) {
    const alerts = [];
    
    // Memory usage alert
    if (currentMetrics.system.memory.heapUsedMB > this.options.alertThresholds.memoryUsageMB) {
      alerts.push({
        type: 'high_memory_usage',
        severity: 'warning',
        message: `Memory usage high: ${currentMetrics.system.memory.heapUsedMB}MB`,
        threshold: this.options.alertThresholds.memoryUsageMB
      });
    }
    
    // Error rate alert
    const errorRate = this.metrics.totalRequests > 0 ? this.metrics.errors / this.metrics.totalRequests : 0;
    if (errorRate > this.options.alertThresholds.errorRate) {
      alerts.push({
        type: 'high_error_rate',
        severity: 'critical',
        message: `Error rate high: ${(errorRate * 100).toFixed(1)}%`,
        threshold: `${(this.options.alertThresholds.errorRate * 100)}%`
      });
    }
    
    // Response time alert
    if (currentMetrics.aicf.responseTimeMs && currentMetrics.aicf.responseTimeMs > this.options.alertThresholds.responseTimeMs) {
      alerts.push({
        type: 'slow_response',
        severity: 'warning',
        message: `Response time slow: ${currentMetrics.aicf.responseTimeMs}ms`,
        threshold: `${this.options.alertThresholds.responseTimeMs}ms`
      });
    }
    
    // Process alerts
    for (const alert of alerts) {
      this.processAlert(alert);
    }
    
    // Update system health
    if (alerts.some(a => a.severity === 'critical')) {
      this.metrics.systemHealth = 'critical';
    } else if (alerts.some(a => a.severity === 'warning')) {
      this.metrics.systemHealth = 'warning';
    } else {
      this.metrics.systemHealth = 'healthy';
    }
  }

  /**
   * Process an alert
   */
  processAlert(alert) {
    const alertWithTimestamp = {
      ...alert,
      timestamp: new Date().toISOString()
    };
    
    this.alerts.push(alertWithTimestamp);
    
    // Log alert
    const emoji = alert.severity === 'critical' ? '🚨' : '⚠️';
    console.log(`${emoji} ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
  }

  /**
   * Record an error
   */
  recordError(source, error) {
    this.alerts.push({
      type: 'error',
      severity: 'error',
      source,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log current status
   */
  logCurrentStatus(currentMetrics) {
    const healthEmoji = this.metrics.systemHealth === 'healthy' ? '💚' : 
                       this.metrics.systemHealth === 'warning' ? '🟡' : '🔴';
    
    const uptimeHours = Math.floor((Date.now() - this.metrics.startTime) / 1000 / 60 / 60);
    const uptimeMinutes = Math.floor(((Date.now() - this.metrics.startTime) / 1000 / 60) % 60);
    
    const status = [
      `${healthEmoji} Health: ${this.metrics.systemHealth}`,
      `⏱️  Uptime: ${uptimeHours}h ${uptimeMinutes}m`,
      `📊 Memory: ${currentMetrics.system.memory.heapUsedMB}MB`,
      `🔄 Requests: ${this.metrics.totalRequests}`,
      `✅ Success: ${this.metrics.successfulRequests}`,
      `❌ Errors: ${this.metrics.errors}`,
      `⚡ Avg Response: ${this.metrics.averageResponseTime}ms`
    ].join(' | ');
    
    console.log(`[${currentMetrics.timestamp}] ${status}`);
  }

  /**
   * Save metrics to file
   */
  saveMetrics(currentMetrics) {
    const metricsFile = path.join(process.cwd(), 'production-metrics.json');
    
    let allMetrics = [];
    if (fs.existsSync(metricsFile)) {
      try {
        allMetrics = JSON.parse(fs.readFileSync(metricsFile, 'utf8'));
      } catch (error) {
        console.warn('⚠️ Could not read existing metrics file, starting fresh');
      }
    }
    
    allMetrics.push(currentMetrics);
    
    // Keep only last 1000 metrics to prevent file from growing too large
    if (allMetrics.length > 1000) {
      allMetrics = allMetrics.slice(-1000);
    }
    
    fs.writeFileSync(metricsFile, JSON.stringify(allMetrics, null, 2));
  }

  /**
   * Generate monitoring report
   */
  generateMonitoringReport() {
    const uptime = Date.now() - this.metrics.startTime;
    const uptimeHours = Math.floor(uptime / 1000 / 60 / 60);
    const uptimeMinutes = Math.floor((uptime / 1000 / 60) % 60);
    
    const errorRate = this.metrics.totalRequests > 0 ? (this.metrics.errors / this.metrics.totalRequests * 100) : 0;
    const successRate = this.metrics.totalRequests > 0 ? (this.metrics.successfulRequests / this.metrics.totalRequests * 100) : 0;
    
    const report = {
      monitoringSummary: {
        startTime: new Date(this.metrics.startTime).toISOString(),
        endTime: new Date().toISOString(),
        uptimeHours: `${uptimeHours}h ${uptimeMinutes}m`,
        finalHealthStatus: this.metrics.systemHealth
      },
      performanceMetrics: {
        totalRequests: this.metrics.totalRequests,
        successfulRequests: this.metrics.successfulRequests,
        errors: this.metrics.errors,
        successRate: `${successRate.toFixed(2)}%`,
        errorRate: `${errorRate.toFixed(2)}%`,
        averageResponseTimeMs: this.metrics.averageResponseTime
      },
      memoryMetrics: {
        samples: this.metrics.memoryUsage.length,
        averageMemoryMB: this.metrics.memoryUsage.reduce((sum, m) => sum + m.heapUsedMB, 0) / this.metrics.memoryUsage.length,
        peakMemoryMB: Math.max(...this.metrics.memoryUsage.map(m => m.heapUsedMB))
      },
      alerts: {
        totalAlerts: this.alerts.length,
        criticalAlerts: this.alerts.filter(a => a.severity === 'critical').length,
        warningAlerts: this.alerts.filter(a => a.severity === 'warning').length,
        errorAlerts: this.alerts.filter(a => a.severity === 'error').length,
        recentAlerts: this.alerts.slice(-10) // Last 10 alerts
      }
    };
    
    // Save report
    const reportFile = path.join(process.cwd(), 'production-monitoring-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    // Print summary
    console.log('\n📊 PRODUCTION MONITORING REPORT');
    console.log('================================');
    console.log(`✅ Total Uptime: ${report.monitoringSummary.uptimeHours}`);
    console.log(`📊 Total Requests: ${report.performanceMetrics.totalRequests}`);
    console.log(`✅ Success Rate: ${report.performanceMetrics.successRate}`);
    console.log(`❌ Error Rate: ${report.performanceMetrics.errorRate}`);
    console.log(`⚡ Average Response: ${report.performanceMetrics.averageResponseTimeMs}ms`);
    console.log(`💾 Average Memory: ${report.memoryMetrics.averageMemoryMB.toFixed(1)}MB`);
    console.log(`🚨 Total Alerts: ${report.alerts.totalAlerts} (${report.alerts.criticalAlerts} critical)`);
    console.log(`🟢 Final Status: ${report.monitoringSummary.finalHealthStatus.toUpperCase()}`);
    
    if (report.monitoringSummary.finalHealthStatus === 'healthy' && errorRate < 1) {
      console.log('\n🎉 PRODUCTION MONITORING SUCCESSFUL!');
      console.log('✅ System is stable and ready for full production use!');
    } else {
      console.log('\n⚠️  ISSUES DETECTED DURING MONITORING');
      console.log('❌ Review alerts and consider investigating before full production use.');
    }
    
    console.log(`\n📄 Full report saved to: ${reportFile}`);
    
    return report;
  }

  /**
   * Get current status
   */
  getCurrentStatus() {
    const uptime = Date.now() - this.metrics.startTime;
    const errorRate = this.metrics.totalRequests > 0 ? (this.metrics.errors / this.metrics.totalRequests) : 0;
    
    return {
      isMonitoring: this.isMonitoring,
      health: this.metrics.systemHealth,
      uptime,
      metrics: this.metrics,
      errorRate,
      recentAlerts: this.alerts.slice(-5)
    };
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'start';
  
  switch (command) {
    case 'start':
      const monitor = new AICFProductionMonitor({
        monitoringInterval: 60000, // 1 minute
        logRetentionHours: 48,     // 48 hours
        memoryThreshold: 100,      // 100MB
        errorRate: 0.05,          // 5%
        responseTime: 1000        // 1 second
      });
      
      await monitor.startMonitoring();
      
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log('\n📊 Received shutdown signal, generating final report...');
        monitor.stopMonitoring();
        process.exit(0);
      });
      
      break;
      
    case 'status':
      console.log('📊 Production Status Check...');
      
      // Quick status check without long-term monitoring
      const quickMonitor = new AICFProductionMonitor();
      await quickMonitor.collectMetrics();
      
      const status = quickMonitor.getCurrentStatus();
      console.log(`Health: ${status.health}`);
      console.log(`Recent Requests: ${status.metrics.totalRequests}`);
      console.log(`Error Rate: ${(status.errorRate * 100).toFixed(2)}%`);
      console.log(`Average Response: ${status.metrics.averageResponseTime}ms`);
      
      break;
      
    case 'report':
      const reportFile = path.join(process.cwd(), 'production-monitoring-report.json');
      if (fs.existsSync(reportFile)) {
        const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
        console.log('📊 Latest Production Monitoring Report:');
        console.log(JSON.stringify(report, null, 2));
      } else {
        console.log('❌ No monitoring report found. Run monitoring first.');
      }
      break;
      
    default:
      console.log('Usage: node monitor-production.js [start|status|report]');
      console.log('  start  - Start continuous monitoring (default)');
      console.log('  status - Quick status check');
      console.log('  report - Display latest monitoring report');
      break;
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Monitoring failed:', error);
    process.exit(1);
  });
}

module.exports = { AICFProductionMonitor };