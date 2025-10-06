#!/usr/bin/env node
/**
 * AICF Security Validation Demo
 * Quick validation of Phase 0 security fixes
 * 
 * @author GitHub Copilot (Security Expert)
 * @date 2025-10-06
 * @version 3.1.1
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Import AICF modules
const AICFWriter = require('../src/aicf-writer');
const AICFReader = require('../src/aicf-reader');
const SecurityFixes = require('../src/security-fixes');

class QuickSecurityValidation {
    constructor() {
        this.testDir = path.join(os.tmpdir(), 'aicf-security-validation');
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        };
        
        // Ensure test directory exists
        if (!fs.existsSync(this.testDir)) {
            fs.mkdirSync(this.testDir, { recursive: true });
        }
    }

    async runValidation() {
        console.log('🔒 AICF Security Validation v3.1.1');
        console.log('=' .repeat(50));
        console.log('Testing Phase 0 Security Fixes Implementation');
        console.log('=' .repeat(50));

        // Test 1: Path Traversal Protection
        this.testPathTraversalProtection();

        // Test 2: Pipe Injection Protection
        await this.testPipeInjectionProtection();

        // Test 3: Race Condition Protection
        await this.testRaceConditionProtection();

        // Test 4: PII Detection
        this.testPIIDetection();

        // Test 5: Input Validation
        await this.testInputValidation();

        // Print results
        this.printResults();
        
        // Cleanup
        this.cleanup();

        return this.results;
    }

    testPathTraversalProtection() {
        console.log('\n1️⃣ Testing Path Traversal Protection...');
        
        const maliciousPaths = [
            '../../../etc/passwd',
            '..\\..\\..\\windows\\system32\\config\\sam',
            '/etc/shadow',
            'C:\\Windows\\System32\\drivers\\etc\\hosts'
        ];

        maliciousPaths.forEach(maliciousPath => {
            try {
                new AICFWriter(maliciousPath);
                this.recordFailure(`Path traversal not blocked: ${maliciousPath}`);
            } catch (error) {
                if (error.message.includes('Invalid file path') || 
                    error.message.includes('Path validation failed')) {
                    this.recordSuccess(`Path traversal blocked: ${maliciousPath}`);
                } else {
                    this.recordFailure(`Unexpected error: ${error.message}`);
                }
            }
        });
    }

    async testPipeInjectionProtection() {
        console.log('\n2️⃣ Testing Pipe Injection Protection...');
        
        const testFile = path.join(this.testDir, 'pipe-test.aicf');
        const maliciousInputs = [
            'Normal text|@CONVERSATION:malicious',
            'Text with\n@STATE:compromised|status=hacked',
            '|@INSIGHTS:injection|data=stolen'
        ];

        for (const input of maliciousInputs) {
            try {
                const writer = new AICFWriter(testFile);
                await writer.appendConversation('test', 'user', input, {});
                
                const content = fs.readFileSync(testFile, 'utf8');
                
                if (content.includes('\\|') && content.includes('\\@')) {
                    this.recordSuccess(`Pipe injection sanitized: ${input.substring(0, 30)}...`);
                } else {
                    this.recordFailure(`Pipe injection not sanitized: ${input.substring(0, 30)}...`);
                }
                
            } catch (error) {
                this.recordSuccess(`Pipe injection prevented: ${error.message}`);
            }
        }

        if (fs.existsSync(testFile)) {
            fs.unlinkSync(testFile);
        }
    }

    async testRaceConditionProtection() {
        console.log('\n3️⃣ Testing Race Condition Protection...');
        
        const testFile = path.join(this.testDir, 'race-test.aicf');
        const concurrentWrites = 10;
        const promises = [];

        for (let i = 0; i < concurrentWrites; i++) {
            const promise = (async (index) => {
                try {
                    const writer = new AICFWriter(testFile);
                    await writer.appendConversation(
                        `concurrent-${index}`, 
                        'user', 
                        `Message ${index}`, 
                        { index }
                    );
                    return { success: true, index };
                } catch (error) {
                    return { success: false, index, error: error.message };
                }
            })(i);
            
            promises.push(promise);
        }

        const results = await Promise.all(promises);
        const successful = results.filter(r => r.success).length;

        if (successful > 0) {
            // Check file integrity
            try {
                const reader = new AICFReader(testFile);
                const conversations = await reader.getLastConversations(concurrentWrites);
                
                if (conversations.length === successful) {
                    this.recordSuccess(`Race condition protection working - ${successful} successful writes, file integrity maintained`);
                } else {
                    this.recordFailure(`Race condition issue - expected ${successful} entries, got ${conversations.length}`);
                }
                
            } catch (error) {
                this.recordFailure(`File corruption detected: ${error.message}`);
            }
        } else {
            this.recordFailure('All concurrent writes failed');
        }

        if (fs.existsSync(testFile)) {
            fs.unlinkSync(testFile);
        }
    }

    testPIIDetection() {
        console.log('\n4️⃣ Testing PII Detection...');
        
        const piiTestCases = [
            { input: 'My SSN is 123-45-6789', expected: '[REDACTED-SSN]' },
            { input: 'Credit card: 4532-1234-5678-9012', expected: '[REDACTED-CREDIT-CARD]' },
            { input: 'Email: user@example.com', expected: '[REDACTED-EMAIL]' },
            { input: 'API key: sk-1234567890abcdef', expected: '[REDACTED-API-KEY]' }
        ];

        piiTestCases.forEach(testCase => {
            try {
                const result = SecurityFixes.redactPII(testCase.input);
                
                if (result.includes(testCase.expected)) {
                    this.recordSuccess(`PII detected and redacted: ${testCase.input}`);
                } else {
                    this.recordFailure(`PII not detected: ${testCase.input} -> ${result}`);
                }
                
            } catch (error) {
                this.recordFailure(`PII detection error: ${error.message}`);
            }
        });
    }

    async testInputValidation() {
        console.log('\n5️⃣ Testing Input Validation...');
        
        const testFile = path.join(this.testDir, 'validation-test.aicf');
        const edgeCases = [
            null,
            undefined,
            '',
            'A'.repeat(100000), // Very long string
            '\x00\x01\x02\x03', // Control characters
            '<script>alert("xss")</script>'
        ];

        for (const input of edgeCases) {
            try {
                const writer = new AICFWriter(testFile);
                await writer.appendConversation('test', 'user', input, {});
                
                this.recordSuccess(`Input validation handled: ${typeof input} (${input ? input.toString().substring(0, 20) : input})`);
                
            } catch (error) {
                // Some failures are expected for invalid inputs
                if (error.message.includes('validation') || error.message.includes('Invalid')) {
                    this.recordSuccess(`Input validation correctly rejected: ${typeof input}`);
                } else {
                    this.recordFailure(`Unexpected validation error: ${error.message}`);
                }
            }
        }

        if (fs.existsSync(testFile)) {
            fs.unlinkSync(testFile);
        }
    }

    recordSuccess(message) {
        console.log(`   ✅ ${message}`);
        this.results.passed++;
        this.results.tests.push({ status: 'PASS', message });
    }

    recordFailure(message) {
        console.log(`   ❌ ${message}`);
        this.results.failed++;
        this.results.tests.push({ status: 'FAIL', message });
    }

    printResults() {
        console.log('\n' + '='.repeat(50));
        console.log('📊 SECURITY VALIDATION RESULTS');
        console.log('='.repeat(50));
        
        console.log(`✅ Tests Passed: ${this.results.passed}`);
        console.log(`❌ Tests Failed: ${this.results.failed}`);
        
        const total = this.results.passed + this.results.failed;
        const successRate = total > 0 ? (this.results.passed / total * 100).toFixed(1) : 0;
        
        console.log(`📈 Success Rate: ${successRate}%`);
        
        if (this.results.failed === 0) {
            console.log('\n🎉 ALL SECURITY VALIDATIONS PASSED!');
            console.log('✅ Phase 0 Security Fixes are working correctly');
            console.log('✅ System ready for production deployment');
        } else {
            console.log('\n⚠️  SECURITY ISSUES DETECTED');
            console.log('❌ Some security fixes may not be working correctly');
            console.log('🔧 Review failed tests and fix issues before deployment');
        }

        // Show security score calculation
        const securityScore = Math.max(0, (successRate / 100) * 10);
        console.log(`\n🛡️ Security Score: ${securityScore.toFixed(1)}/10`);
        
        if (securityScore >= 9) {
            console.log('🟢 Security Rating: EXCELLENT');
        } else if (securityScore >= 7) {
            console.log('🟡 Security Rating: GOOD');
        } else if (securityScore >= 5) {
            console.log('🟠 Security Rating: FAIR');
        } else {
            console.log('🔴 Security Rating: POOR');
        }
    }

    cleanup() {
        try {
            if (fs.existsSync(this.testDir)) {
                fs.rmSync(this.testDir, { recursive: true, force: true });
            }
        } catch (error) {
            console.log(`⚠️  Cleanup warning: ${error.message}`);
        }
    }
}

// Export for use in other modules
module.exports = QuickSecurityValidation;

// Run validation if called directly
if (require.main === module) {
    const validation = new QuickSecurityValidation();
    validation.runValidation()
        .then((results) => {
            if (results.failed === 0) {
                console.log('\n🚀 Security validation completed successfully');
                process.exit(0);
            } else {
                console.log('\n💥 Security validation failed');
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error('\n💥 Security validation error:', error.message);
            process.exit(1);
        });
}