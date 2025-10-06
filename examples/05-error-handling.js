/**
 * AICF-Core Example 5: Error Handling
 * 
 * This example demonstrates robust error handling:
 * - Handling missing directories
 * - Dealing with corrupted files
 * - Validation errors
 * - Recovery strategies
 * - Graceful degradation
 */

const { AICF, AICFReader, AICFWriter } = require('aicf-core');
const path = require('path');
const fs = require('fs');

async function errorHandlingExample() {
  console.log('🚀 AICF-Core Error Handling Example\n');

  // ===== HANDLING MISSING DIRECTORIES =====
  console.log('📁 Handling Missing Directories\n');

  const nonExistentDir = path.join(__dirname, '.aicf-nonexistent');

  try {
    console.log('Attempting to read from non-existent directory...');
    const reader = new AICFReader(nonExistentDir);
    const stats = reader.getStats();
    console.log('✅ Gracefully handled missing directory');
    console.log('   Stats:', stats);
  } catch (error) {
    console.log('❌ Error caught:', error.message);
    console.log('💡 Solution: Create directory first or handle gracefully');
  }
  console.log('');

  // ===== SAFE DIRECTORY CREATION =====
  console.log('🛡️  Safe Directory Creation\n');

  const safeDir = path.join(__dirname, '.aicf-safe');

  try {
    console.log('Creating directory safely...');
    if (!fs.existsSync(safeDir)) {
      fs.mkdirSync(safeDir, { recursive: true });
      console.log('✅ Directory created:', safeDir);
    } else {
      console.log('✅ Directory already exists');
    }

    const aicf = AICF.create(safeDir);
    console.log('✅ AICF instance created successfully');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  console.log('');

  // ===== VALIDATION ERRORS =====
  console.log('✅ Validation Errors\n');

  const aicfDir = path.join(__dirname, '.aicf-demo');
  const aicf = AICF.create(aicfDir);

  // Invalid conversation data
  try {
    console.log('Attempting to log invalid conversation...');
    await aicf.logConversation({
      // Missing required 'id' field
      messages: 10,
      tokens: 500
    });
  } catch (error) {
    console.log('❌ Validation error caught:', error.message);
    console.log('💡 Solution: Ensure all required fields are present');
  }
  console.log('');

  // Valid conversation with error handling
  try {
    console.log('Logging valid conversation with error handling...');
    await aicf.logConversation({
      id: 'conv_error_handling',
      messages: 10,
      tokens: 500,
      metadata: { topic: 'error_handling' }
    });
    console.log('✅ Conversation logged successfully');
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
  console.log('');

  // ===== HANDLING CORRUPTED DATA =====
  console.log('🔧 Handling Corrupted Data\n');

  try {
    console.log('Checking for data corruption...');
    const health = aicf.healthCheck();
    
    if (health.status === 'healthy') {
      console.log('✅ No corruption detected');
    } else if (health.status === 'degraded') {
      console.log('⚠️  System degraded, issues found:');
      health.issues.forEach((issue, idx) => {
        console.log(`   ${idx + 1}. ${issue}`);
      });
      console.log('💡 Solution: Review and fix issues');
    } else {
      console.log('❌ System unhealthy');
    }
  } catch (error) {
    console.error('❌ Health check error:', error.message);
  }
  console.log('');

  // ===== GRACEFUL DEGRADATION =====
  console.log('🎯 Graceful Degradation Pattern\n');

  console.log('Example: Fallback to default values');
  console.log('');

  function safeGetStats(reader) {
    try {
      const stats = reader.getStats();
      return {
        conversations: stats.counts.conversations || 0,
        decisions: stats.counts.decisions || 0,
        insights: stats.counts.insights || 0,
        status: 'success'
      };
    } catch (error) {
      console.log('⚠️  Error reading stats, using defaults');
      return {
        conversations: 0,
        decisions: 0,
        insights: 0,
        status: 'error',
        error: error.message
      };
    }
  }

  const reader = new AICFReader(aicfDir);
  const stats = safeGetStats(reader);
  console.log('Stats retrieved:', stats);
  console.log('');

  // ===== RETRY LOGIC =====
  console.log('🔄 Retry Logic Pattern\n');

  async function writeWithRetry(writer, data, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries}...`);
        await writer.logConversation(data);
        console.log('✅ Write successful');
        return true;
      } catch (error) {
        console.log(`❌ Attempt ${attempt} failed:`, error.message);
        if (attempt === maxRetries) {
          console.log('💡 Max retries reached, giving up');
          return false;
        }
        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt) * 100;
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  const writer = new AICFWriter(aicfDir);
  await writeWithRetry(writer, {
    id: 'conv_retry_test',
    messages: 5,
    tokens: 250,
    metadata: { topic: 'retry_logic' }
  });
  console.log('');

  // ===== ERROR RECOVERY STRATEGIES =====
  console.log('🛠️  Error Recovery Strategies\n');

  console.log('1. ✅ Validate Input Data');
  console.log('   - Check required fields before writing');
  console.log('   - Validate data types and formats');
  console.log('   - Sanitize user input');
  console.log('');

  console.log('2. ✅ Use Try-Catch Blocks');
  console.log('   - Wrap all AICF operations in try-catch');
  console.log('   - Log errors for debugging');
  console.log('   - Provide meaningful error messages');
  console.log('');

  console.log('3. ✅ Implement Retry Logic');
  console.log('   - Retry transient failures');
  console.log('   - Use exponential backoff');
  console.log('   - Set maximum retry limits');
  console.log('');

  console.log('4. ✅ Graceful Degradation');
  console.log('   - Provide default values on error');
  console.log('   - Continue operation with reduced functionality');
  console.log('   - Alert users to degraded state');
  console.log('');

  console.log('5. ✅ Regular Health Checks');
  console.log('   - Monitor system health');
  console.log('   - Detect issues early');
  console.log('   - Automate recovery when possible');
  console.log('');

  // ===== PRODUCTION ERROR HANDLING PATTERN =====
  console.log('🏭 Production Error Handling Pattern\n');

  console.log('```javascript');
  console.log('class AICFService {');
  console.log('  constructor(aicfDir) {');
  console.log('    this.aicf = AICF.create(aicfDir);');
  console.log('    this.logger = console; // Use proper logger in production');
  console.log('  }');
  console.log('');
  console.log('  async logConversation(data) {');
  console.log('    try {');
  console.log('      // Validate input');
  console.log('      if (!data.id) throw new Error("Missing conversation ID");');
  console.log('      ');
  console.log('      // Log conversation');
  console.log('      await this.aicf.logConversation(data);');
  console.log('      ');
  console.log('      // Success');
  console.log('      this.logger.info("Conversation logged:", data.id);');
  console.log('      return { success: true };');
  console.log('    } catch (error) {');
  console.log('      // Log error');
  console.log('      this.logger.error("Failed to log conversation:", error);');
  console.log('      ');
  console.log('      // Return error response');
  console.log('      return { success: false, error: error.message };');
  console.log('    }');
  console.log('  }');
  console.log('  ');
  console.log('  async getStats() {');
  console.log('    try {');
  console.log('      return this.aicf.reader.getStats();');
  console.log('    } catch (error) {');
  console.log('      this.logger.error("Failed to get stats:", error);');
  console.log('      // Return safe defaults');
  console.log('      return { counts: { conversations: 0, decisions: 0 } };');
  console.log('    }');
  console.log('  }');
  console.log('}');
  console.log('```');
  console.log('');

  console.log('✨ Error handling example completed!');
}

// Run the example
if (require.main === module) {
  errorHandlingExample().catch(error => {
    console.error('❌ Fatal error:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  });
}

module.exports = errorHandlingExample;

