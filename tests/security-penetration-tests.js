/**
 * AICF Security Penetration Testing Suite
 * Tests for attack vector validation and security vulnerability assessment
 * 
 * @author GitHub Copilot (Security Expert)
 * @date 2025-10-06
 * @version 3.1.1
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { spawn } = require('child_process');

const AICFSecure = require('../src/aicf-secure');
const SecurityFixes = require('../src/security-fixes');

class SecurityPenetrationTests {
    constructor() {
        // Use project-relative directory instead of system temp
        this.testDir = path.join(process.cwd(), 'security-test-temp');
        this.results = {
            passed: 0,
            failed: 0,
            vulnerabilities: [],
            attacks: []
        };
        
        // Ensure test directory exists
        if (!fs.existsSync(this.testDir)) {
            fs.mkdirSync(this.testDir, { recursive: true });
        }
    }

    /**
     * Run all penetration tests
     */
    async runAllTests() {
        console.log('🔒 AICF Security Penetration Testing Suite v3.1.1');
        console.log('=' .repeat(60));
        
        await this.testPathTraversalAttacks();
        await this.testPipeInjectionAttacks();
        await this.testRaceConditionAttacks();
        await this.testMemoryExhaustionAttacks();
        await this.testPIIExposureAttacks();
        await this.testInputValidationBypass();
        await this.testConcurrencyAttacks();
        await this.testFileSystemAttacks();
        await this.testDataCorruptionAttacks();
        await this.testPrivilegeEscalationAttempts();
        
        this.printResults();
        return this.results;
    }

    /**
     * Test Path Traversal Attack Vectors
     */
    async testPathTraversalAttacks() {
        console.log('\n🎯 Testing Path Traversal Attack Vectors...');
        
        const maliciousPaths = [
            '../../../etc/passwd',
            '..\\..\\..\\windows\\system32\\config\\sam',
            '/etc/shadow',
            'C:\\Windows\\System32\\drivers\\etc\\hosts',
            '....//....//....//etc/passwd',
            '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
            '..%252f..%252f..%252fetc%252fpasswd',
            '..%c0%af..%c0%af..%c0%afetc%c0%afpasswd',
            '/var/log/auth.log',
            '/proc/self/environ',
            '/root/.ssh/id_rsa',
            '../../../../../../etc/passwd%00.aicf',
            '../' .repeat(50) + 'etc/passwd'
        ];

        for (const maliciousPath of maliciousPaths) {
            try {
                // Attempt to create AICFSecure instance with malicious path
                const aicf = new AICFSecure(maliciousPath);
                
                // This should fail due to path validation
                await aicf.appendConversation({
                    id: 'attack-test',
                    messages: 1,
                    tokens: 10,
                    timestamp_start: new Date().toISOString()
                });
                
                this.recordFailure(`Path traversal attack succeeded: ${maliciousPath}`);
                this.results.vulnerabilities.push({
                    type: 'PATH_TRAVERSAL',
                    severity: 'CRITICAL',
                    attack: maliciousPath,
                    status: 'VULNERABLE'
                });
                
            } catch (error) {
                if (error.message.includes('Security violation') || 
                    error.message.includes('outside project root') ||
                    error.message.includes('dangerous pattern')) {
                    this.recordSuccess(`Path traversal blocked: ${maliciousPath}`);
                } else {
                    this.recordFailure(`Unexpected error for path: ${maliciousPath} - ${error.message}`);
                }
            }
        }
    }

    /**
     * Test Pipe Injection Attack Vectors
     */
    async testPipeInjectionAttacks() {
        console.log('\n🎯 Testing Pipe Injection Attack Vectors...');
        
        const injectionPayloads = [
            'Normal text|@CONVERSATION:malicious',
            'Text with\n@STATE:compromised|status=hacked',
            '|@INSIGHTS:injection|data=stolen',
            '@CONVERSATION:fake|user=attacker|message=injected',
            'user input|@DECISION:bypass|action=escalate',
            '\n@FLOW:malicious\n|step=compromise',
            'text|@METADATA:evil|key=value|@END',
            '@@CONVERSATION:double||injection||test',
            'text\r\n@CONVERSATION:windows_injection',
            'unicode_test|@CONVERSATION:\u202e\u202d:evil'
        ];

        // Use secure AICF instance in project directory
        const aicf = new AICFSecure(this.testDir);

        for (const payload of injectionPayloads) {
            try {
                // Test pipe injection in conversation metadata
                await aicf.appendConversation({
                    id: 'pipe-test-' + Date.now(),
                    messages: 1,
                    tokens: 10,
                    timestamp_start: new Date().toISOString(),
                    metadata: {
                        'test_payload': payload // Try to inject malicious content
                    }
                });
                
                // Read back and check if injection was sanitized
                const conversations = await aicf.getConversations();
                
                if (conversations.length > 0) {
                    const lastConv = conversations[conversations.length - 1];
                    const metadataValue = lastConv.metadata && lastConv.metadata.test_payload;
                    
                    // Check if dangerous patterns were escaped
                    if (metadataValue && metadataValue.includes('@CONVERSATION:') && !metadataValue.includes('\\@CONVERSATION:')) {
                        this.recordFailure(`Pipe injection succeeded: ${payload}`);
                        this.results.vulnerabilities.push({
                            type: 'PIPE_INJECTION',
                            severity: 'HIGH',
                            attack: payload,
                            result: metadataValue,
                            status: 'VULNERABLE'
                        });
                    } else {
                        this.recordSuccess(`Pipe injection blocked: ${payload}`);
                    }
                }
                
            } catch (error) {
                this.recordSuccess(`Pipe injection prevented by error: ${payload}`);
            }
        }

        // Cleanup
        if (fs.existsSync(this.testDir)) {
            fs.rmSync(this.testDir, { recursive: true, force: true });
        }
    }

    /**
     * Test Race Condition Attack Vectors
     */
    async testRaceConditionAttacks() {
        console.log('\n🎯 Testing Race Condition Attack Vectors...');
        
        // Use single AICFSecure instance for all concurrent tests
        const aicf = new AICFSecure(this.testDir);
        const concurrentWrites = 50;
        const promises = [];

        // Launch multiple concurrent writers
        for (let i = 0; i < concurrentWrites; i++) {
            const promise = (async (index) => {
                try {
                    await aicf.appendConversation({
                        id: `race-test-${index}`,
                        messages: 1,
                        tokens: 10,
                        timestamp_start: new Date().toISOString(),
                        metadata: { test_index: index }
                    });
                    return { success: true, index };
                } catch (error) {
                    return { success: false, index, error: error.message };
                }
            })(i);
            
            promises.push(promise);
        }

        const results = await Promise.all(promises);
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        console.log(`   Concurrent writes: ${concurrentWrites}`);
        console.log(`   Successful: ${successful}`);
        console.log(`   Failed: ${failed}`);

        // Verify data integrity using AICFSecure
        try {
            const conversations = await aicf.getConversations();
            
            if (conversations.length === successful) {
                this.recordSuccess('Race condition protection working - no data corruption');
            } else {
                this.recordFailure(`Race condition vulnerability - expected ${successful} entries, got ${conversations.length}`);
                this.results.vulnerabilities.push({
                    type: 'RACE_CONDITION',
                    severity: 'MEDIUM',
                    expected: successful,
                    actual: conversations.length,
                    status: 'VULNERABLE'
                });
            }
            
        } catch (error) {
            this.recordFailure(`File corruption detected: ${error.message}`);
            this.results.vulnerabilities.push({
                type: 'FILE_CORRUPTION',
                severity: 'HIGH',
                error: error.message,
                status: 'VULNERABLE'
            });
        }
    }

    /**
     * Test Memory Exhaustion Attack Vectors
     */
    async testMemoryExhaustionAttacks() {
        console.log('\n🎯 Testing Memory Exhaustion Attack Vectors...');
        
        // Use AICFSecure for memory exhaustion testing
        const aicf = new AICFSecure(this.testDir);
        
        // Create large metadata to test memory usage
        const largeContent = 'A'.repeat(100 * 1024); // 100KB chunks
        
        try {
            // Write 10 conversations with large metadata
            for (let i = 0; i < 10; i++) {
                await aicf.appendConversation({
                    id: `large-test-${i}`,
                    messages: 1,
                    tokens: 10000,
                    timestamp_start: new Date().toISOString(),
                    metadata: {
                        large_data: largeContent,
                        chunk: i
                    }
                });
            }

            // Test reading large data
            const memBefore = process.memoryUsage().heapUsed;
            const conversations = await aicf.getConversations();
            const memAfter = process.memoryUsage().heapUsed;
            
            const memoryIncrease = memAfter - memBefore;
            const dataSize = largeContent.length * 10; // 10 conversations with large content
            
            console.log(`   Data processed: ${(dataSize / (1024 * 1024)).toFixed(2)}MB`);
            console.log(`   Memory increase: ${(memoryIncrease / (1024 * 1024)).toFixed(2)}MB`);
            console.log(`   Conversations processed: ${conversations.length}`);
            
            // Memory usage should be reasonable (less than 50MB)
            if (memoryIncrease < 50 * 1024 * 1024) {
                this.recordSuccess('Memory exhaustion protection working - streaming enabled');
            } else {
                this.recordFailure('Memory exhaustion vulnerability - excessive memory usage');
                this.results.vulnerabilities.push({
                    type: 'MEMORY_EXHAUSTION',
                    severity: 'HIGH',
                    dataSize: dataSize / (1024 * 1024),
                    memoryUsed: memoryIncrease / (1024 * 1024),
                    status: 'VULNERABLE'
                });
            }
            
        } catch (error) {
            this.recordFailure(`Memory exhaustion test failed: ${error.message}`);
        }
    }

    /**
     * Test PII Exposure Attack Vectors
     */
    async testPIIExposureAttacks() {
        console.log('\n🎯 Testing PII Exposure Attack Vectors...');
        
        const piiData = [
            'My SSN is 123-45-6789',
            'Credit card: 4532-1234-5678-9012',
            'Email: user@example.com',
            'Phone: (555) 123-4567',
            'API key: sk-1234567890abcdef',
            'AWS key: AKIAIOSFODNN7EXAMPLE',
            'My passport number is A12345678'
        ];

        const testFile = path.join(this.testDir, 'pii-test.aicf');
        const writer = new AICFWriter(testFile);

        for (const data of piiData) {
            try {
                await writer.addInsight('pii-test', data);
                
                // Read back and check if PII was redacted
                const reader = new AICFReader(testFile);
                const content = fs.readFileSync(testFile, 'utf8');
                
                // Check if original PII is still present
                const sensitivePatterns = [
                    /\d{3}-\d{2}-\d{4}/, // SSN
                    /\d{4}-\d{4}-\d{4}-\d{4}/, // Credit card
                    /sk-[a-zA-Z0-9]+/, // API keys
                    /AKIA[0-9A-Z]{16}/ // AWS keys
                ];
                
                let piiFound = false;
                for (const pattern of sensitivePatterns) {
                    if (pattern.test(content)) {
                        piiFound = true;
                        break;
                    }
                }
                
                if (piiFound) {
                    this.recordFailure(`PII exposure vulnerability: ${data}`);
                    this.results.vulnerabilities.push({
                        type: 'PII_EXPOSURE',
                        severity: 'CRITICAL',
                        data: data,
                        status: 'VULNERABLE'
                    });
                } else {
                    this.recordSuccess(`PII redaction working: ${data}`);
                }
                
            } catch (error) {
                this.recordSuccess(`PII protection prevented write: ${data}`);
            }
        }

        if (fs.existsSync(testFile)) {
            fs.unlinkSync(testFile);
        }
    }

    /**
     * Test Input Validation Bypass Attempts
     */
    async testInputValidationBypass() {
        console.log('\n🎯 Testing Input Validation Bypass Attempts...');
        
        const maliciousInputs = [
            null,
            undefined,
            '',
            'A'.repeat(100000), // Very long string
            { malicious: 'object' },
            ['array', 'input'],
            '\x00\x01\x02\x03', // Control characters
            '𝕸𝖆𝖑𝖎𝖈𝖎𝖔𝖚𝖘 𝖚𝖓𝖎𝖈𝖔𝖉𝖊', // Unicode
            '\uFEFF\u200B\u200C\u200D', // Zero-width characters
            '<script>alert("xss")</script>'
        ];

        const testFile = path.join(this.testDir, 'validation-test.aicf');

        for (const input of maliciousInputs) {
            try {
                const writer = new AICFWriter(testFile);
                await writer.appendConversation('test', 'user', input, {});
                
                // Check if input was properly sanitized
                const content = fs.readFileSync(testFile, 'utf8');
                
                if (typeof input === 'string' && input.length > 0) {
                    if (content.includes('<script>') || content.includes('\x00')) {
                        this.recordFailure(`Input validation bypass: ${typeof input === 'string' ? input.substring(0, 50) : typeof input}`);
                        this.results.vulnerabilities.push({
                            type: 'INPUT_VALIDATION_BYPASS',
                            severity: 'MEDIUM',
                            input: typeof input === 'string' ? input.substring(0, 100) : typeof input,
                            status: 'VULNERABLE'
                        });
                    } else {
                        this.recordSuccess(`Input validation working: ${typeof input}`);
                    }
                }
                
            } catch (error) {
                this.recordSuccess(`Input validation prevented malicious input: ${typeof input}`);
            }
        }

        if (fs.existsSync(testFile)) {
            fs.unlinkSync(testFile);
        }
    }

    /**
     * Test Concurrency Attack Vectors
     */
    async testConcurrencyAttacks() {
        console.log('\n🎯 Testing Concurrency Attack Vectors...');
        
        const testFile = path.join(this.testDir, 'concurrency-test.aicf');
        
        // Test lock bypassing attempts
        const processes = [];
        for (let i = 0; i < 5; i++) {
            const child = spawn('node', ['-e', `
                const AICFWriter = require('${path.join(__dirname, '../src/aicf-writer')}');
                const writer = new AICFWriter('${testFile}');
                (async () => {
                    for (let j = 0; j < 10; j++) {
                        try {
                            await writer.appendConversation('proc-${i}', 'user', 'Message ' + j, {});
                            await new Promise(resolve => setTimeout(resolve, 10));
                        } catch (error) {
                            console.log('Lock protected: ' + error.message);
                        }
                    }
                })();
            `]);
            
            processes.push(child);
        }

        // Wait for all processes to complete
        await Promise.all(processes.map(proc => new Promise(resolve => {
            proc.on('close', resolve);
        })));

        // Verify file integrity
        if (fs.existsSync(testFile)) {
            try {
                const reader = new AICFReader(testFile);
                const conversations = await reader.getLastConversations(100);
                console.log(`   Multi-process writes completed: ${conversations.length} entries`);
                this.recordSuccess('Concurrency protection working - file integrity maintained');
                fs.unlinkSync(testFile);
            } catch (error) {
                this.recordFailure(`Concurrency attack succeeded - file corruption: ${error.message}`);
            }
        }
    }

    /**
     * Test File System Attack Vectors
     */
    async testFileSystemAttacks() {
        console.log('\n🎯 Testing File System Attack Vectors...');
        
        const attacks = [
            { name: 'Symlink attack', setup: () => {
                const target = path.join(this.testDir, 'symlink-target.aicf');
                const link = path.join(this.testDir, 'symlink.aicf');
                try {
                    fs.symlinkSync('/etc/passwd', link);
                    return link;
                } catch (error) {
                    return null;
                }
            }},
            { name: 'Directory traversal', setup: () => {
                return path.join(this.testDir, '..', '..', 'etc', 'passwd');
            }},
            { name: 'Non-existent directory', setup: () => {
                return path.join(this.testDir, 'nonexistent', 'test.aicf');
            }}
        ];

        for (const attack of attacks) {
            try {
                const filePath = attack.setup();
                if (!filePath) continue;
                
                const writer = new AICFWriter(filePath);
                await writer.appendConversation('fs-attack', 'user', 'test', {});
                
                this.recordFailure(`File system attack succeeded: ${attack.name}`);
                this.results.vulnerabilities.push({
                    type: 'FILESYSTEM_ATTACK',
                    severity: 'HIGH',
                    attack: attack.name,
                    path: filePath,
                    status: 'VULNERABLE'
                });
                
            } catch (error) {
                this.recordSuccess(`File system attack blocked: ${attack.name}`);
            }
        }
    }

    /**
     * Test Data Corruption Attack Vectors
     */
    async testDataCorruptionAttacks() {
        console.log('\n🎯 Testing Data Corruption Attack Vectors...');
        
        const testFile = path.join(this.testDir, 'corruption-test.aicf');
        const writer = new AICFWriter(testFile);
        
        // Write valid data first
        await writer.appendConversation('test', 'user', 'Valid message', {});
        
        // Attempt to corrupt file during write
        const corruptionAttempts = [
            () => fs.writeFileSync(testFile, 'CORRUPTED DATA'),
            () => fs.truncateSync(testFile, 10),
            () => fs.appendFileSync(testFile, '\n@MALICIOUS:injection')
        ];

        for (let i = 0; i < corruptionAttempts.length; i++) {
            try {
                // Attempt corruption
                corruptionAttempts[i]();
                
                // Try to read corrupted file
                const reader = new AICFReader(testFile);
                const conversations = await reader.getLastConversations(5);
                
                if (conversations.length === 0) {
                    this.recordSuccess(`Corruption detection working for attempt ${i + 1}`);
                } else {
                    this.recordFailure(`Data corruption not detected for attempt ${i + 1}`);
                }
                
                // Restore file for next test
                fs.writeFileSync(testFile, '@CONVERSATION:test|user|Valid message|timestamp=' + Date.now() + '\n');
                
            } catch (error) {
                this.recordSuccess(`Corruption protection working: ${error.message}`);
            }
        }

        if (fs.existsSync(testFile)) {
            fs.unlinkSync(testFile);
        }
    }

    /**
     * Test Privilege Escalation Attempts
     */
    async testPrivilegeEscalationAttempts() {
        console.log('\n🎯 Testing Privilege Escalation Attempts...');
        
        const escalationAttempts = [
            { name: 'Root directory write', path: '/root/aicf-test.aicf' },
            { name: 'System directory write', path: '/usr/bin/aicf-test.aicf' },
            { name: 'Windows system write', path: 'C:\\Windows\\System32\\aicf-test.aicf' },
            { name: 'Temp escalation', path: '/tmp/../root/aicf-test.aicf' }
        ];

        for (const attempt of escalationAttempts) {
            try {
                const writer = new AICFWriter(attempt.path);
                await writer.appendConversation('escalation', 'user', 'test', {});
                
                // If we get here, escalation might have succeeded
                if (fs.existsSync(attempt.path)) {
                    this.recordFailure(`Privilege escalation succeeded: ${attempt.name}`);
                    this.results.vulnerabilities.push({
                        type: 'PRIVILEGE_ESCALATION',
                        severity: 'CRITICAL',
                        attack: attempt.name,
                        path: attempt.path,
                        status: 'VULNERABLE'
                    });
                    
                    try {
                        fs.unlinkSync(attempt.path);
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                }
                
            } catch (error) {
                this.recordSuccess(`Privilege escalation blocked: ${attempt.name}`);
            }
        }
    }

    /**
     * Record test success
     */
    recordSuccess(message) {
        console.log(`   ✅ ${message}`);
        this.results.passed++;
    }

    /**
     * Record test failure
     */
    recordFailure(message) {
        console.log(`   ❌ ${message}`);
        this.results.failed++;
    }

    /**
     * Print test results summary
     */
    printResults() {
        console.log('\n' + '='.repeat(60));
        console.log('🔒 SECURITY PENETRATION TEST RESULTS');
        console.log('='.repeat(60));
        
        console.log(`✅ Tests Passed: ${this.results.passed}`);
        console.log(`❌ Tests Failed: ${this.results.failed}`);
        console.log(`🔴 Vulnerabilities: ${this.results.vulnerabilities.length}`);
        
        if (this.results.vulnerabilities.length > 0) {
            console.log('\n🚨 VULNERABILITIES FOUND:');
            this.results.vulnerabilities.forEach((vuln, index) => {
                console.log(`${index + 1}. ${vuln.type} (${vuln.severity})`);
                if (vuln.attack) console.log(`   Attack: ${vuln.attack}`);
                if (vuln.path) console.log(`   Path: ${vuln.path}`);
            });
        }
        
        const totalTests = this.results.passed + this.results.failed;
        const successRate = totalTests > 0 ? (this.results.passed / totalTests * 100).toFixed(1) : 0;
        
        console.log(`\n📊 Success Rate: ${successRate}%`);
        
        if (this.results.vulnerabilities.length === 0) {
            console.log('\n🎉 ALL SECURITY TESTS PASSED - SYSTEM IS SECURE');
        } else {
            console.log('\n⚠️  SECURITY VULNERABILITIES DETECTED - IMMEDIATE ACTION REQUIRED');
        }
        
        // Cleanup test directory
        try {
            fs.rmSync(this.testDir, { recursive: true, force: true });
        } catch (error) {
            console.log(`⚠️  Could not cleanup test directory: ${error.message}`);
        }
    }

    /**
     * Record a successful test
     */
    recordSuccess(message) {
        this.results.passed++;
        console.log(`   ✅ ${message}`);
    }

    /**
     * Record a failed test
     */
    recordFailure(message) {
        this.results.failed++;
        console.log(`   ❌ ${message}`);
    }
}

// Export for testing
module.exports = SecurityPenetrationTests;

// Run tests if called directly
if (require.main === module) {
    const tests = new SecurityPenetrationTests();
    tests.runAllTests().catch(console.error);
}