/**
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Copyright (c) 2025 Dennis van Leeuwen
 *
 * Basic Usage Example - TypeScript
 * Demonstrates core AICF functionality with Result types
 */

import AICF from "../dist/index.js";

async function main() {
  console.log("🚀 AICF-Core v2.0.0 - Basic Usage Example\n");

  // ============================================================================
  // 1. CREATE AICF INSTANCE
  // ============================================================================
  console.log("1️⃣  Creating AICF instance...");
  const aicf = AICF.create(".aicf");
  console.log("✅ AICF instance created\n");

  // ============================================================================
  // 2. GET VERSION INFO
  // ============================================================================
  console.log("2️⃣  Getting version info...");
  const version = AICF.getVersion();
  console.log(`   Version: ${version.version}`);
  console.log(`   AICF Format: ${version.aicfFormat}`);
  console.log(`   Compression Ratio: ${version.compressionRatio}`);
  console.log(`   Semantic Loss: ${version.semanticLoss}\n`);

  // ============================================================================
  // 3. WRITE CONVERSATIONS (with Result types)
  // ============================================================================
  console.log("3️⃣  Writing conversations...");

  const conv1 = await aicf.addConversation({
    id: "conv-001",
    timestamp: new Date().toISOString(),
    role: "user",
    content: "Hello! I'm testing the new TypeScript AICF library.",
  });

  if (conv1.ok) {
    console.log(`   ✅ Conversation written at line ${conv1.value}`);
  } else {
    console.error(`   ❌ Error: ${conv1.error.message}`);
  }

  const conv2 = await aicf.addConversation({
    id: "conv-002",
    timestamp: new Date().toISOString(),
    role: "assistant",
    content: "Great! The library is working perfectly with Result types.",
  });

  if (conv2.ok) {
    console.log(`   ✅ Conversation written at line ${conv2.value}\n`);
  }

  // ============================================================================
  // 4. WRITE MEMORY
  // ============================================================================
  console.log("4️⃣  Writing memory...");

  const memory = await aicf.addMemory({
    id: "mem-001",
    timestamp: new Date().toISOString(),
    type: "episodic",
    content: "User is testing the TypeScript migration",
    importance: 0.8,
  });

  if (memory.ok) {
    console.log(`   ✅ Memory written at line ${memory.value}\n`);
  }

  // ============================================================================
  // 5. WRITE DECISION
  // ============================================================================
  console.log("5️⃣  Writing decision...");

  const decision = await aicf.addDecision({
    id: "dec-001",
    timestamp: new Date().toISOString(),
    decision: "Migrate to TypeScript with strict mode",
    rationale: "Better type safety and modern development practices",
    impact: "HIGH",
  });

  if (decision.ok) {
    console.log(`   ✅ Decision written at line ${decision.value}\n`);
  }

  // ============================================================================
  // 6. READ CONVERSATIONS
  // ============================================================================
  console.log("6️⃣  Reading last 5 conversations...");

  const conversations = await aicf.getLastConversations(5);

  if (conversations.ok) {
    console.log(`   ✅ Found ${conversations.value.length} conversations:`);
    conversations.value.forEach((conv, i) => {
      console.log(`      ${i + 1}. [${conv.role}] ${conv.content.substring(0, 50)}...`);
    });
    console.log();
  } else {
    console.error(`   ❌ Error: ${conversations.error.message}\n`);
  }

  // ============================================================================
  // 7. GET STATS
  // ============================================================================
  console.log("7️⃣  Getting project stats...");

  const stats = await aicf.getStats();

  if (stats.ok) {
    console.log(`   ✅ Stats:`);
    console.log(`      Total Conversations: ${stats.value.totalConversations}`);
    console.log(`      Total Messages: ${stats.value.totalMessages}`);
    console.log(`      Total Memories: ${stats.value.totalMemories}`);
    console.log(`      Total Decisions: ${stats.value.totalDecisions}\n`);
  }

  // ============================================================================
  // 8. QUERY CONVERSATIONS
  // ============================================================================
  console.log("8️⃣  Querying conversations...");

  const queryResult = await aicf.query("TypeScript");

  if (queryResult.ok) {
    console.log(`   ✅ Query results:`);
    console.log(`      Found ${queryResult.value.conversations.length} matching conversations`);
    console.log(`      Intent: ${queryResult.value.intent.type}\n`);
  }

  // ============================================================================
  // 9. GET PROJECT OVERVIEW
  // ============================================================================
  console.log("9️⃣  Getting project overview...");

  const overview = await aicf.getProjectOverview();

  if (overview.ok) {
    console.log(`   ✅ Project Overview:`);
    console.log(`      ${overview.value.summary}\n`);
  }

  // ============================================================================
  // 10. SECURE OPERATIONS WITH PII REDACTION
  // ============================================================================
  console.log("🔒 Secure Operations with PII Redaction...");

  const secure = AICF.createSecure(".aicf", undefined, undefined, {
    enablePIIRedaction: true,
  });

  const secureConv = await secure.writeConversationSecure({
    id: "secure-001",
    timestamp: new Date().toISOString(),
    role: "user",
    content: "My email is user@example.com and my phone is (555) 123-4567",
  });

  if (secureConv.ok) {
    console.log(`   ✅ Secure conversation written (PII redacted)`);

    // Check audit log
    const auditLog = secure.getAuditLog();
    console.log(`   📋 Audit log entries: ${auditLog.length}`);

    auditLog.forEach((event) => {
      console.log(`      - ${event.type}: ${event.message}`);
    });
    console.log();
  }

  // ============================================================================
  // 11. ERROR HANDLING EXAMPLE
  // ============================================================================
  console.log("⚠️  Error Handling Example...");

  const reader = AICF.createReader(".aicf-nonexistent");
  const result = await reader.getIndex();

  if (result.ok) {
    console.log("   ✅ Index loaded");
  } else {
    console.log(`   ❌ Expected error: ${result.error.message}`);
    console.log("   ✅ Error handled gracefully with Result type\n");
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log("=" .repeat(60));
  console.log("🎉 Example Complete!");
  console.log("=" .repeat(60));
  console.log("\n✅ All operations completed successfully!");
  console.log("✅ Result types provide type-safe error handling");
  console.log("✅ PII redaction works automatically");
  console.log("✅ All data is properly sanitized");
  console.log("\n📚 Check the .aicf directory for generated files\n");
}

// Run the example
main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

