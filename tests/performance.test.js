#!/usr/bin/env node

/*
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 */

/**
 * AICF Performance Tests
 *
 * Tests:
 * - Large file handling (10MB, 100MB, 1GB)
 * - Memory usage validation
 * - Streaming vs memory loading
 * - Concurrent operations performance
 * - PII detection performance
 */

const fs = require("fs");
const path = require("path");
const AICFWriter = require("../src/aicf-writer");
const AICFReader = require("../src/aicf-reader");
const AICFStreamReader = require("../src/aicf-stream-reader");
const PIIDetector = require("../src/pii-detector");

// Test configuration
const TEST_DIR = ".test-aicf-performance";
const RESULTS = {
  tests: [],
};

// Utility functions
function log(message, type = "info") {
  const colors = {
    info: "\x1b[36m",
    success: "\x1b[32m",
    error: "\x1b[31m",
    warn: "\x1b[33m",
  };
  console.log(`${colors[type]}${message}\x1b[0m`);
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
  if (bytes < 1024 * 1024 * 1024)
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}

function formatTime(ms) {
  if (ms < 1000) return ms.toFixed(2) + " ms";
  return (ms / 1000).toFixed(2) + " s";
}

function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: usage.rss,
    heapUsed: usage.heapUsed,
    heapTotal: usage.heapTotal,
    external: usage.external,
  };
}

function cleanup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

function setup() {
  cleanup();
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

// Generate test data
function generateConversation(id, size = "small") {
  const sizes = {
    small: 100, // 100 chars
    medium: 1000, // 1KB
    large: 10000, // 10KB
  };

  const textSize = sizes[size] || sizes.small;
  const text = "x".repeat(textSize);

  return {
    id: `conv_${id}`,
    messages: Math.floor(Math.random() * 100),
    tokens: Math.floor(Math.random() * 10000),
    metadata: {
      user: `user_${id}`,
      description: text,
    },
  };
}

function generateLargeFile(filePath, targetSizeMB) {
  log(`📝 Generating ${targetSizeMB}MB test file...`, "info");

  const writer = new AICFWriter(TEST_DIR);
  const conversationsPerMB = 100; // Approximate
  const totalConversations = targetSizeMB * conversationsPerMB;

  const startTime = Date.now();

  for (let i = 0; i < totalConversations; i++) {
    const conv = generateConversation(i, "large");
    fs.appendFileSync(
      filePath,
      `${i * 10}|@CONVERSATION:${conv.id}\n` +
        `${i * 10 + 1}|messages=${conv.messages}\n` +
        `${i * 10 + 2}|tokens=${conv.tokens}\n` +
        `${i * 10 + 3}|user=${conv.metadata.user}\n` +
        `${i * 10 + 4}|description=${conv.metadata.description}\n`
    );

    if (i % 1000 === 0) {
      process.stdout.write(
        `\r  Progress: ${((i / totalConversations) * 100).toFixed(1)}%`
      );
    }
  }

  const elapsed = Date.now() - startTime;
  const fileSize = fs.statSync(filePath).size;

  console.log(""); // New line after progress
  log(
    `  ✅ Generated ${formatBytes(fileSize)} in ${formatTime(elapsed)}`,
    "success"
  );

  return fileSize;
}

// Test Suite 1: Large File Handling
async function testLargeFileHandling() {
  log("\n⚡ Test Suite 1: Large File Handling", "info");

  const fileSizes = [
    { name: "10MB", sizeMB: 10 },
    { name: "50MB", sizeMB: 50 },
    { name: "100MB", sizeMB: 100 },
  ];

  for (const { name, sizeMB } of fileSizes) {
    log(`\n📊 Testing ${name} file:`, "info");

    const filePath = path.join(TEST_DIR, `large-${name}.aicf`);
    const fileSize = generateLargeFile(filePath, sizeMB);

    // Test 1.1: Memory loading (old approach)
    log(`  🔍 Testing memory loading...`, "info");
    const memBefore = getMemoryUsage();
    const startMem = Date.now();

    try {
      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n");

      const memAfter = getMemoryUsage();
      const elapsedMem = Date.now() - startMem;
      const memUsed = memAfter.heapUsed - memBefore.heapUsed;

      log(`    Time: ${formatTime(elapsedMem)}`, "info");
      log(`    Memory: ${formatBytes(memUsed)}`, "info");
      log(
        `    Ratio: ${((memUsed / fileSize) * 100).toFixed(1)}% of file size`,
        "info"
      );

      RESULTS.tests.push({
        test: `${name} - Memory Loading`,
        time: elapsedMem,
        memory: memUsed,
        fileSize: fileSize,
      });
    } catch (error) {
      log(`    ❌ Failed: ${error.message}`, "error");
    }

    // Force garbage collection if available
    if (global.gc) global.gc();
    await new Promise((r) => setTimeout(r, 1000));

    // Test 1.2: Streaming (new approach)
    log(`  🔍 Testing streaming...`, "info");
    const streamBefore = getMemoryUsage();
    const startStream = Date.now();

    try {
      const reader = new AICFStreamReader();
      let lineCount = 0;

      await reader.streamFile(filePath, (line) => {
        lineCount++;
        return true;
      });

      const streamAfter = getMemoryUsage();
      const elapsedStream = Date.now() - startStream;
      const memUsedStream = streamAfter.heapUsed - streamBefore.heapUsed;

      log(`    Time: ${formatTime(elapsedStream)}`, "info");
      log(`    Memory: ${formatBytes(memUsedStream)}`, "info");
      log(
        `    Ratio: ${((memUsedStream / fileSize) * 100).toFixed(1)}% of file size`,
        "info"
      );
      log(`    Lines: ${lineCount}`, "info");

      RESULTS.tests.push({
        test: `${name} - Streaming`,
        time: elapsedStream,
        memory: memUsedStream,
        fileSize: fileSize,
        lines: lineCount,
      });

      // Calculate improvement
      const memImprovement = (
        ((memUsed - memUsedStream) / memUsed) *
        100
      ).toFixed(1);
      log(`    💡 Memory improvement: ${memImprovement}%`, "success");
    } catch (error) {
      log(`    ❌ Failed: ${error.message}`, "error");
    }

    // Cleanup large file
    fs.unlinkSync(filePath);
  }
}

// Test Suite 2: Memory Usage Validation
async function testMemoryUsageValidation() {
  log("\n⚡ Test Suite 2: Memory Usage Validation", "info");

  // Test 2.1: Constant memory usage with increasing file sizes
  log("\n📊 Testing memory scaling:", "info");

  const sizes = [1, 5, 10, 20, 50];
  const memoryUsages = [];

  for (const sizeMB of sizes) {
    const filePath = path.join(TEST_DIR, `scale-${sizeMB}MB.aicf`);
    generateLargeFile(filePath, sizeMB);

    const memBefore = getMemoryUsage();

    const reader = new AICFStreamReader();
    await reader.streamFile(filePath, () => true);

    const memAfter = getMemoryUsage();
    const memUsed = memAfter.heapUsed - memBefore.heapUsed;

    memoryUsages.push({ size: sizeMB, memory: memUsed });
    log(`  ${sizeMB}MB file: ${formatBytes(memUsed)} memory`, "info");

    fs.unlinkSync(filePath);

    if (global.gc) global.gc();
    await new Promise((r) => setTimeout(r, 500));
  }

  // Validate constant memory usage
  const avgMemory =
    memoryUsages.reduce((sum, m) => sum + m.memory, 0) / memoryUsages.length;
  const maxDeviation = Math.max(
    ...memoryUsages.map((m) => Math.abs(m.memory - avgMemory))
  );
  const deviationPercent = ((maxDeviation / avgMemory) * 100).toFixed(1);

  log(`\n  Average memory: ${formatBytes(avgMemory)}`, "info");
  log(`  Max deviation: ${deviationPercent}%`, "info");

  if (deviationPercent < 50) {
    log(`  ✅ Memory usage is constant (deviation < 50%)`, "success");
  } else {
    log(`  ⚠️  Memory usage varies significantly`, "warn");
  }

  RESULTS.tests.push({
    test: "Memory Scaling",
    avgMemory: avgMemory,
    deviation: deviationPercent,
  });
}

// Test Suite 3: Concurrent Operations Performance
async function testConcurrentOperations() {
  log("\n⚡ Test Suite 3: Concurrent Operations Performance", "info");

  const writer = new AICFWriter(TEST_DIR);

  // Test 3.1: Sequential writes
  log("\n📊 Testing sequential writes:", "info");
  const startSeq = Date.now();

  for (let i = 0; i < 100; i++) {
    await writer.appendConversation(generateConversation(i, "medium"));
  }

  const elapsedSeq = Date.now() - startSeq;
  log(`  Time: ${formatTime(elapsedSeq)}`, "info");
  log(
    `  Throughput: ${(100 / (elapsedSeq / 1000)).toFixed(2)} ops/sec`,
    "info"
  );

  // Test 3.2: Concurrent writes
  log("\n📊 Testing concurrent writes:", "info");
  const startConc = Date.now();

  const promises = [];
  for (let i = 100; i < 200; i++) {
    promises.push(writer.appendConversation(generateConversation(i, "medium")));
  }
  await Promise.all(promises);

  const elapsedConc = Date.now() - startConc;
  log(`  Time: ${formatTime(elapsedConc)}`, "info");
  log(
    `  Throughput: ${(100 / (elapsedConc / 1000)).toFixed(2)} ops/sec`,
    "info"
  );

  const speedup = (elapsedSeq / elapsedConc).toFixed(2);
  log(`  💡 Speedup: ${speedup}x`, speedup > 1 ? "success" : "warn");

  RESULTS.tests.push({
    test: "Concurrent Operations",
    sequential: elapsedSeq,
    concurrent: elapsedConc,
    speedup: speedup,
  });
}

// Test Suite 4: PII Detection Performance
async function testPIIDetectionPerformance() {
  log("\n⚡ Test Suite 4: PII Detection Performance", "info");

  const detector = new PIIDetector();

  // Test 4.1: Small text (100 chars)
  const smallText =
    "Contact John at john@example.com or call (555) 123-4567. SSN: 123-45-6789.";
  const startSmall = Date.now();

  for (let i = 0; i < 1000; i++) {
    detector.detect(smallText);
  }

  const elapsedSmall = Date.now() - startSmall;
  log(`  Small text (1000 iterations): ${formatTime(elapsedSmall)}`, "info");
  log(
    `  Throughput: ${(1000 / (elapsedSmall / 1000)).toFixed(2)} ops/sec`,
    "info"
  );

  // Test 4.2: Large text (10KB)
  const largeText = smallText.repeat(100);
  const startLarge = Date.now();

  for (let i = 0; i < 100; i++) {
    detector.detect(largeText);
  }

  const elapsedLarge = Date.now() - startLarge;
  log(`  Large text (100 iterations): ${formatTime(elapsedLarge)}`, "info");
  log(
    `  Throughput: ${(100 / (elapsedLarge / 1000)).toFixed(2)} ops/sec`,
    "info"
  );

  RESULTS.tests.push({
    test: "PII Detection",
    smallText: elapsedSmall,
    largeText: elapsedLarge,
  });
}

// Main test runner
async function runTests() {
  log("⚡ AICF Performance Tests\n", "info");
  log(
    "⚠️  Note: Run with --expose-gc for accurate memory measurements",
    "warn"
  );
  log("   Example: node --expose-gc tests/performance.test.js\n", "warn");

  setup();

  try {
    await testLargeFileHandling();
    await testMemoryUsageValidation();
    await testConcurrentOperations();
    await testPIIDetectionPerformance();

    // Print summary
    log("\n📊 Performance Test Summary:", "info");
    log("═".repeat(60), "info");

    RESULTS.tests.forEach((test) => {
      log(`\n${test.test}:`, "info");
      Object.entries(test).forEach(([key, value]) => {
        if (key !== "test") {
          if (typeof value === "number") {
            if (
              key.includes("time") ||
              key.includes("Time") ||
              key === "sequential" ||
              key === "concurrent"
            ) {
              log(`  ${key}: ${formatTime(value)}`, "info");
            } else if (
              key.includes("memory") ||
              key.includes("Memory") ||
              key === "fileSize"
            ) {
              log(`  ${key}: ${formatBytes(value)}`, "info");
            } else {
              log(`  ${key}: ${value}`, "info");
            }
          } else {
            log(`  ${key}: ${value}`, "info");
          }
        }
      });
    });

    log("\n🎉 Performance tests complete!", "success");
  } catch (error) {
    log(`\n💥 Test suite error: ${error.message}`, "error");
    console.error(error);
  } finally {
    cleanup();
  }
}

// Run tests if called directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
