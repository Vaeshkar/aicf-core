/**
 * AICF Security Fuzzing Tests
 * Advanced fuzzing and stress testing for security vulnerabilities
 * 
 * @author GitHub Copilot (Security Expert)
 * @date 2025-10-06
 * @version 3.1.1
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const AICFWriter = require('../src/aicf-writer');
const AICFReader = require('../src/aicf-reader');
const SecurityFixes = require('../src/security-fixes');

class SecurityFuzzingTests {
    constructor() {
        this.testDir = path.join(os.tmpdir(), 'aicf-fuzzing-tests');
        this.results = {
            totalTests: 0,
            passed: 0,
            failed: 0,
            crashes: 0,
            hangs: 0,
            vulnerabilities: []
        };
        
        if (!fs.existsSync(this.testDir)) {
            fs.mkdirSync(this.testDir, { recursive: true });
        }
    }

    /**
     * Generate random fuzzing data
     */
    generateFuzzData(size = 1000) {
        const chars = [];
        
        // Add normal characters
        for (let i = 32; i < 127; i++) {
            chars.push(String.fromCharCode(i));
        }
        
        // Add dangerous characters
        chars.push(...[
            '\x00', '\x01', '\x02', '\x03', '\x04', '\x05', '\x06', '\x07',
            '\x08', '\x09', '\x0A', '\x0B', '\x0C', '\x0D', '\x0E', '\x0F',
            '|', '\n', '\r', '@', '\\', '/', '.', '%', '&', '$', '#',
            '<', '>', '"', "'", '`', '{', '}', '[', ']', '(', ')'
        ]);
        
        // Add Unicode characters
        chars.push(...[
            '\u0000', '\u0001', '\u0008', '\u0009', '\u000A', '\u000B',
            '\u000C', '\u000D', '\u0020', '\u007F', '\u0080', '\u009F',
            '\u00A0', '\u1680', '\u2000', '\u2001', '\u2002', '\u2003',
            '\u2004', '\u2005', '\u2006', '\u2007', '\u2008', '\u2009',
            '\u200A', '\u2028', '\u2029', '\u202F', '\u205F', '\u3000',
            '\uFEFF', '\uFFFE', '\uFFFF'
        ]);
        
        let fuzzData = '';
        for (let i = 0; i < size; i++) {
            fuzzData += chars[Math.floor(Math.random() * chars.length)];
        }
        
        return fuzzData;
    }

    /**
     * Generate structured fuzzing payloads
     */
    generateStructuredPayloads() {
        return [
            // AICF injection attempts
            '@CONVERSATION:fuzz|user|message|meta=value',
            '|@STATE:evil|status=compromised',
            '\n@INSIGHTS:injection\n|data=stolen',
            '@DECISION:bypass|action=escalate|reason=test',
            '@FLOW:malicious|step=compromise|next=profit',
            
            // Format string attacks
            '%s%s%s%s%s%s%s%s%s%s',
            '%x%x%x%x%x%x%x%x%x%x',
            '%n%n%n%n%n%n%n%n%n%n',
            '%.1000000s',
            '%*.*s',
            
            // Buffer overflow attempts
            'A'.repeat(1000000),
            'B'.repeat(10000) + '\x00' + 'C'.repeat(10000),
            'overflow' + '\x00'.repeat(1000),
            
            // SQL injection patterns (for future database backends)
            "'; DROP TABLE conversations; --",
            "' OR '1'='1",
            "'; INSERT INTO conversations VALUES('evil'); --",
            
            // Script injection
            '<script>alert("xss")</script>',
            'javascript:alert("xss")',
            '${7*7}',
            '#{7*7}',
            '{{7*7}}',
            
            // Command injection
            '; cat /etc/passwd',
            '| ls -la',
            '`id`',
            '$(whoami)',
            
            // Path manipulation
            '../../../etc/passwd',
            '..\\..\\..\\windows\\system32\\config\\sam',
            '/dev/null',
            '/dev/random',
            '/proc/self/mem',
            
            // Encoding attacks
            '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
            '..%252f..%252f..%252fetc%252fpasswd',
            '\u002e\u002e\u002f\u002e\u002e\u002f\u002e\u002e\u002fetc\u002fpasswd',
            
            // Regular expression DoS
            'a'.repeat(50000) + '!',
            '(' + 'a?'.repeat(1000) + ')' + 'a'.repeat(1000),
            
            // Compression bombs
            'AAAA'.repeat(250000), // 1MB of repeated data
            
            // Memory exhaustion
            Array(1000000).fill('memory').join(''),
            
            // Null bytes and terminators
            'test\x00hidden',
            'visible\x00\x00\x00hidden',
            'data\r\n\r\nHTTP/1.1 200 OK\r\n\r\ninjected',
            
            // Unicode attacks
            '\uFEFF' + 'BOM attack',
            '\u202E' + 'rtl override attack',
            'test\u0000hidden',
            
            // Binary data
            Buffer.from([0, 1, 2, 3, 4, 5, 255, 254, 253]).toString('binary'),
            
            // Extremely long strings
            'x'.repeat(1024 * 1024), // 1MB string
            
            // Special JSON characters
            '{"key": "value", "injection": true}',
            '[1,2,3,"injection"]',
            '\\"escaped\\"',
            
            // YAML injection
            '!!python/object/apply:os.system ["echo pwned"]',
            
            // LDAP injection
            '*)(uid=*',
            '*)(&(objectClass=user)(cn=*',
            
            // XML/HTML entities
            '&lt;script&gt;alert("xss")&lt;/script&gt;',
            '&#60;script&#62;alert("xss")&#60;/script&#62;',
            
            // Protocol confusion
            'file:///etc/passwd',
            'ftp://evil.com/backdoor',
            'data:text/html,<script>alert("xss")</script>',
            
            // Time-based attacks
            'test; sleep 10',
            'test && timeout 10',
            
            // Race condition triggers
            'AAAA' + '\x00'.repeat(1000) + 'BBBB',
            
            // Locale attacks
            'İstanbul', // Turkish dotted I
            'Κόσμος', // Greek
            '漢字', // Chinese
            '🚀💻🔒', // Emojis
            
            // Edge case numbers
            '9'.repeat(1000),
            '-' + '9'.repeat(1000),
            '0.0000000001',
            'NaN',
            'Infinity',
            '-Infinity'
        ];
    }

    /**
     * Run all fuzzing tests
     */
    async runAllFuzzingTests() {
        console.log('🔥 AICF Security Fuzzing Suite v3.1.1');
        console.log('=' .repeat(60));
        
        await this.fuzzConversationData();
        await this.fuzzMetadata();
        await this.fuzzFilePaths();
        await this.fuzzLargeInputs();
        await this.fuzzBinaryData();
        await this.fuzzConcurrentAccess();
        await this.fuzzCorruptedFiles();
        await this.fuzzEdgeCases();
        
        this.printResults();
        return this.results;
    }

    /**
     * Fuzz conversation data
     */
    async fuzzConversationData() {
        console.log('\n🎯 Fuzzing Conversation Data...');
        
        const testFile = path.join(this.testDir, 'fuzz-conversation.aicf');
        const payloads = this.generateStructuredPayloads();
        
        for (let i = 0; i < 100; i++) {
            const fuzzData = this.generateFuzzData(Math.floor(Math.random() * 10000) + 100);
            payloads.push(fuzzData);
        }
        
        for (const payload of payloads) {
            await this.testWithTimeout(async () => {
                const writer = new AICFWriter(testFile);
                await writer.appendConversation(
                    `fuzz-${this.results.totalTests}`,
                    'user',
                    payload,
                    {}
                );
                
                // Try to read it back
                const reader = new AICFReader(testFile);
                await reader.getLastConversations(1);
                
            }, 5000, `Conversation fuzz test ${this.results.totalTests}`);
        }
        
        if (fs.existsSync(testFile)) {
            fs.unlinkSync(testFile);
        }
    }

    /**
     * Fuzz metadata
     */
    async fuzzMetadata() {
        console.log('\n🎯 Fuzzing Metadata...');
        
        const testFile = path.join(this.testDir, 'fuzz-metadata.aicf');
        
        for (let i = 0; i < 50; i++) {
            const fuzzKey = this.generateFuzzData(Math.floor(Math.random() * 100) + 1);
            const fuzzValue = this.generateFuzzData(Math.floor(Math.random() * 1000) + 1);
            
            const metadata = {};
            metadata[fuzzKey] = fuzzValue;
            
            // Add some structured payloads
            if (i % 10 === 0) {
                metadata['injection|test'] = '@CONVERSATION:evil';
                metadata['newline\ntest'] = 'value\nwith\nnewlines';
                metadata['pipe|injection'] = 'value|with|pipes';
            }
            
            await this.testWithTimeout(async () => {
                const writer = new AICFWriter(testFile);
                await writer.appendConversation(
                    `meta-fuzz-${i}`,
                    'user',
                    'Test message',
                    metadata
                );
                
                const reader = new AICFReader(testFile);
                await reader.getLastConversations(1);
                
            }, 5000, `Metadata fuzz test ${i}`);
        }
        
        if (fs.existsSync(testFile)) {
            fs.unlinkSync(testFile);
        }
    }

    /**
     * Fuzz file paths
     */
    async fuzzFilePaths() {
        console.log('\n🎯 Fuzzing File Paths...');
        
        const maliciousPaths = [
            '/dev/null',
            '/dev/zero',
            '/dev/random',
            '/proc/self/mem',
            '\\\\?\\C:\\Windows\\System32\\',
            'CON', 'PRN', 'AUX', 'NUL', // Windows reserved names
            'LPT1', 'COM1', 'COM2',
            'file' + '\x00' + '.aicf',
            'test\r\nfile.aicf',
            'very' + 'long'.repeat(1000) + '.aicf'
        ];
        
        // Add random path fuzzing
        for (let i = 0; i < 20; i++) {
            maliciousPaths.push(this.generateFuzzData(Math.floor(Math.random() * 500) + 10));
        }
        
        for (const maliciousPath of maliciousPaths) {
            await this.testWithTimeout(async () => {
                const writer = new AICFWriter(maliciousPath);
                await writer.appendConversation('path-test', 'user', 'test', {});
                
            }, 3000, `Path fuzz test: ${maliciousPath.substring(0, 50)}`);
        }
    }

    /**
     * Fuzz with large inputs
     */
    async fuzzLargeInputs() {
        console.log('\n🎯 Fuzzing Large Inputs...');
        
        const testFile = path.join(this.testDir, 'fuzz-large.aicf');
        const sizes = [1024, 10240, 102400, 1048576, 10485760]; // 1KB to 10MB
        
        for (const size of sizes) {
            await this.testWithTimeout(async () => {
                const largeData = this.generateFuzzData(size);
                const writer = new AICFWriter(testFile);
                await writer.appendConversation(
                    `large-${size}`,
                    'user',
                    largeData,
                    {}
                );
                
                // Test memory usage
                const memBefore = process.memoryUsage().heapUsed;
                const reader = new AICFReader(testFile);
                await reader.getLastConversations(1);
                const memAfter = process.memoryUsage().heapUsed;
                
                const memoryIncrease = memAfter - memBefore;
                if (memoryIncrease > size * 2) {
                    this.recordVulnerability('MEMORY_EXHAUSTION', 'HIGH', 
                        `Large input caused excessive memory usage: ${memoryIncrease} bytes for ${size} byte input`);
                }
                
            }, 30000, `Large input test: ${size} bytes`);
        }
        
        if (fs.existsSync(testFile)) {
            fs.unlinkSync(testFile);
        }
    }

    /**
     * Fuzz with binary data
     */
    async fuzzBinaryData() {
        console.log('\n🎯 Fuzzing Binary Data...');
        
        const testFile = path.join(this.testDir, 'fuzz-binary.aicf');
        
        for (let i = 0; i < 20; i++) {
            const binarySize = Math.floor(Math.random() * 10000) + 100;
            const binaryData = crypto.randomBytes(binarySize);
            
            await this.testWithTimeout(async () => {
                const writer = new AICFWriter(testFile);
                await writer.appendConversation(
                    `binary-${i}`,
                    'user',
                    binaryData.toString('binary'),
                    {}
                );
                
                const reader = new AICFReader(testFile);
                await reader.getLastConversations(1);
                
            }, 10000, `Binary data test ${i}`);
        }
        
        if (fs.existsSync(testFile)) {
            fs.unlinkSync(testFile);
        }
    }

    /**
     * Fuzz concurrent access
     */
    async fuzzConcurrentAccess() {
        console.log('\n🎯 Fuzzing Concurrent Access...');
        
        const testFile = path.join(this.testDir, 'fuzz-concurrent.aicf');
        const concurrentOperations = 50;
        
        const promises = [];
        for (let i = 0; i < concurrentOperations; i++) {
            const operation = this.testWithTimeout(async () => {
                const fuzzData = this.generateFuzzData(Math.floor(Math.random() * 1000) + 100);
                const writer = new AICFWriter(testFile);
                await writer.appendConversation(
                    `concurrent-${i}`,
                    'user',
                    fuzzData,
                    { index: i, random: Math.random() }
                );
                
                // Random delay
                await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
                
                const reader = new AICFReader(testFile);
                await reader.getLastConversations(Math.floor(Math.random() * 5) + 1);
                
            }, 15000, `Concurrent operation ${i}`, false);
            
            promises.push(operation);
        }
        
        const results = await Promise.allSettled(promises);
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        console.log(`   Concurrent operations: ${concurrentOperations}`);
        console.log(`   Successful: ${successful}`);
        console.log(`   Failed: ${failed}`);
        
        // Check file integrity
        if (fs.existsSync(testFile)) {
            try {
                const reader = new AICFReader(testFile);
                await reader.getLastConversations(100);
                this.recordSuccess('Concurrent access integrity maintained');
                fs.unlinkSync(testFile);
            } catch (error) {
                this.recordVulnerability('FILE_CORRUPTION', 'HIGH', 
                    `Concurrent access caused file corruption: ${error.message}`);
            }
        }
    }

    /**
     * Fuzz with corrupted files
     */
    async fuzzCorruptedFiles() {
        console.log('\n🎯 Fuzzing Corrupted Files...');
        
        const testFile = path.join(this.testDir, 'fuzz-corrupted.aicf');
        
        // Create various types of corrupted files
        const corruptedContents = [
            '', // Empty file
            '\x00\x00\x00\x00', // Null bytes
            'not aicf format at all',
            '@CONVERSATION:incomplete|user|message', // Incomplete entry
            '@CONVERSATION:test|user|message|meta=value\n@CONVERSATION:test2|user|message2', // No final newline
            '@INVALID:section|data=test',
            '@CONVERSATION:test|user|' + 'A'.repeat(1000000), // Extremely long message
            '@CONVERSATION:test|user|message\n\x00\x00\x00corrupted middle\n@CONVERSATION:test2|user|message2',
            'random binary data: ' + crypto.randomBytes(1000).toString('binary')
        ];
        
        for (let i = 0; i < corruptedContents.length; i++) {
            const content = corruptedContents[i];
            
            await this.testWithTimeout(async () => {
                fs.writeFileSync(testFile, content);
                
                const reader = new AICFReader(testFile);
                await reader.getLastConversations(10);
                
            }, 5000, `Corrupted file test ${i}`);
        }
        
        if (fs.existsSync(testFile)) {
            fs.unlinkSync(testFile);
        }
    }

    /**
     * Fuzz edge cases
     */
    async fuzzEdgeCases() {
        console.log('\n🎯 Fuzzing Edge Cases...');
        
        const testFile = path.join(this.testDir, 'fuzz-edge.aicf');
        
        const edgeCases = [
            { id: '', role: 'user', message: 'empty id' },
            { id: 'test', role: '', message: 'empty role' },
            { id: 'test', role: 'user', message: '' },
            { id: null, role: 'user', message: 'null id' },
            { id: 'test', role: null, message: 'null role' },
            { id: 'test', role: 'user', message: null },
            { id: undefined, role: 'user', message: 'undefined id' },
            { id: 'test', role: undefined, message: 'undefined role' },
            { id: 'test', role: 'user', message: undefined },
            { id: 123, role: 'user', message: 'numeric id' },
            { id: 'test', role: 123, message: 'numeric role' },
            { id: 'test', role: 'user', message: 123 },
            { id: ['array'], role: 'user', message: 'array id' },
            { id: 'test', role: ['array'], message: 'array role' },
            { id: 'test', role: 'user', message: ['array'] },
            { id: {object: true}, role: 'user', message: 'object id' },
            { id: 'test', role: {object: true}, message: 'object role' },
            { id: 'test', role: 'user', message: {object: true} }
        ];
        
        for (let i = 0; i < edgeCases.length; i++) {
            const testCase = edgeCases[i];
            
            await this.testWithTimeout(async () => {
                const writer = new AICFWriter(testFile);
                await writer.appendConversation(
                    testCase.id,
                    testCase.role,
                    testCase.message,
                    { testCase: i }
                );
                
                const reader = new AICFReader(testFile);
                await reader.getLastConversations(1);
                
            }, 5000, `Edge case test ${i}`);
        }
        
        if (fs.existsSync(testFile)) {
            fs.unlinkSync(testFile);
        }
    }

    /**
     * Test with timeout and error handling
     */
    async testWithTimeout(testFunction, timeoutMs, testName, countAsTest = true) {
        if (countAsTest) {
            this.results.totalTests++;
        }
        
        try {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Test timeout')), timeoutMs);
            });
            
            await Promise.race([testFunction(), timeoutPromise]);
            
            if (countAsTest) {
                this.results.passed++;
                console.log(`   ✅ ${testName}`);
            }
            
        } catch (error) {
            if (error.message === 'Test timeout') {
                this.results.hangs++;
                console.log(`   ⏰ HANG: ${testName}`);
                this.recordVulnerability('HANG', 'MEDIUM', `Test hung: ${testName}`);
            } else if (error.message.includes('segmentation fault') || 
                       error.message.includes('core dumped')) {
                this.results.crashes++;
                console.log(`   💥 CRASH: ${testName} - ${error.message}`);
                this.recordVulnerability('CRASH', 'CRITICAL', `Test crashed: ${testName} - ${error.message}`);
            } else {
                if (countAsTest) {
                    this.results.failed++;
                }
                console.log(`   ❌ ${testName} - ${error.message.substring(0, 100)}`);
            }
        }
    }

    /**
     * Record vulnerability
     */
    recordVulnerability(type, severity, description) {
        this.results.vulnerabilities.push({
            type,
            severity,
            description,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Record success
     */
    recordSuccess(message) {
        console.log(`   ✅ ${message}`);
    }

    /**
     * Print results summary
     */
    printResults() {
        console.log('\n' + '='.repeat(60));
        console.log('🔥 SECURITY FUZZING TEST RESULTS');
        console.log('='.repeat(60));
        
        console.log(`📊 Total Tests: ${this.results.totalTests}`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`💥 Crashes: ${this.results.crashes}`);
        console.log(`⏰ Hangs: ${this.results.hangs}`);
        console.log(`🔴 Vulnerabilities: ${this.results.vulnerabilities.length}`);
        
        if (this.results.vulnerabilities.length > 0) {
            console.log('\n🚨 VULNERABILITIES FOUND:');
            this.results.vulnerabilities.forEach((vuln, index) => {
                console.log(`${index + 1}. ${vuln.type} (${vuln.severity})`);
                console.log(`   ${vuln.description}`);
            });
        }
        
        const totalTests = this.results.totalTests;
        const successRate = totalTests > 0 ? (this.results.passed / totalTests * 100).toFixed(1) : 0;
        const stabilityRate = totalTests > 0 ? ((totalTests - this.results.crashes - this.results.hangs) / totalTests * 100).toFixed(1) : 0;
        
        console.log(`\n📈 Success Rate: ${successRate}%`);
        console.log(`🛡️ Stability Rate: ${stabilityRate}%`);
        
        if (this.results.crashes === 0 && this.results.hangs === 0 && this.results.vulnerabilities.length === 0) {
            console.log('\n🎉 ALL FUZZING TESTS PASSED - SYSTEM IS ROBUST');
        } else {
            console.log('\n⚠️  SECURITY ISSUES DETECTED - REVIEW REQUIRED');
        }
        
        // Cleanup
        try {
            fs.rmSync(this.testDir, { recursive: true, force: true });
        } catch (error) {
            console.log(`⚠️  Could not cleanup test directory: ${error.message}`);
        }
    }
}

// Export for testing
module.exports = SecurityFuzzingTests;

// Run tests if called directly
if (require.main === module) {
    const tests = new SecurityFuzzingTests();
    tests.runAllFuzzingTests().catch(console.error);
}