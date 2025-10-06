/**
 * AICF Security Unit Tests
 * Comprehensive unit tests for path traversal, pipe injection, race conditions
 * 
 * @author GitHub Copilot (Security Expert)
 * @date 2025-10-06
 * @version 3.1.1
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { expect } = require('chai');

const AICFWriter = require('../src/aicf-writer');
const AICFReader = require('../src/aicf-reader');
const SecurityFixes = require('../src/security-fixes');

describe('AICF Security Unit Tests', function() {
    let testDir;
    
    before(function() {
        testDir = path.join(os.tmpdir(), 'aicf-security-unit-tests');
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
    });
    
    after(function() {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    describe('Path Traversal Protection', function() {
        it('should block basic path traversal attempts', function() {
            const maliciousPaths = [
                '../../../etc/passwd',
                '..\\..\\..\\windows\\system32\\config\\sam',
                '/etc/shadow',
                'C:\\Windows\\System32\\drivers\\etc\\hosts'
            ];

            maliciousPaths.forEach(maliciousPath => {
                expect(() => {
                    new AICFWriter(maliciousPath);
                }).to.throw(/Invalid file path|Path validation failed/);
            });
        });

        it('should block encoded path traversal attempts', function() {
            const encodedPaths = [
                '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
                '..%252f..%252f..%252fetc%252fpasswd',
                '..%c0%af..%c0%af..%c0%afetc%c0%afpasswd'
            ];

            encodedPaths.forEach(encodedPath => {
                expect(() => {
                    new AICFWriter(encodedPath);
                }).to.throw(/Invalid file path|Path validation failed/);
            });
        });

        it('should block double-encoded path traversal', function() {
            const doubleEncodedPaths = [
                '....//....//....//etc/passwd',
                '../' .repeat(50) + 'etc/passwd',
                '../../../../../../etc/passwd%00.aicf'
            ];

            doubleEncodedPaths.forEach(doublePath => {
                expect(() => {
                    new AICFWriter(doublePath);
                }).to.throw(/Invalid file path|Path validation failed/);
            });
        });

        it('should allow valid relative paths', function() {
            const validPaths = [
                path.join(testDir, 'valid.aicf'),
                path.join(testDir, 'subdir', 'valid.aicf'),
                path.join(testDir, 'deeply', 'nested', 'valid.aicf')
            ];

            validPaths.forEach(validPath => {
                expect(() => {
                    new AICFWriter(validPath);
                }).to.not.throw();
            });
        });

        it('should validate SecurityFixes.validatePath directly', function() {
            expect(() => {
                SecurityFixes.validatePath('../../../etc/passwd');
            }).to.throw(/Invalid file path/);

            expect(() => {
                SecurityFixes.validatePath('/etc/shadow');
            }).to.throw(/Invalid file path/);

            expect(() => {
                SecurityFixes.validatePath(path.join(testDir, 'valid.aicf'));
            }).to.not.throw();
        });
    });

    describe('Pipe Injection Protection', function() {
        let testFile;
        
        beforeEach(function() {
            testFile = path.join(testDir, `pipe-test-${Date.now()}.aicf`);
        });
        
        afterEach(function() {
            if (fs.existsSync(testFile)) {
                fs.unlinkSync(testFile);
            }
        });

        it('should sanitize pipe characters in conversation data', async function() {
            const writer = new AICFWriter(testFile);
            const maliciousInput = 'Normal text|@CONVERSATION:malicious';
            
            await writer.appendConversation('test', 'user', maliciousInput, {});
            
            const content = fs.readFileSync(testFile, 'utf8');
            expect(content).to.include('\\|');
            expect(content).to.include('\\@CONVERSATION:');
            expect(content).to.not.include('|@CONVERSATION:');
        });

        it('should sanitize newlines in conversation data', async function() {
            const writer = new AICFWriter(testFile);
            const maliciousInput = 'Text with\n@STATE:compromised|status=hacked';
            
            await writer.appendConversation('test', 'user', maliciousInput, {});
            
            const content = fs.readFileSync(testFile, 'utf8');
            expect(content).to.include('\\n');
            expect(content).to.include('\\@STATE:');
            expect(content).to.not.include('\n@STATE:');
        });

        it('should sanitize metadata properly', async function() {
            const writer = new AICFWriter(testFile);
            const maliciousMetadata = {
                'key|injection': 'value|@CONVERSATION:evil',
                'normal': 'safe value'
            };
            
            await writer.appendConversation('test', 'user', 'message', maliciousMetadata);
            
            const content = fs.readFileSync(testFile, 'utf8');
            expect(content).to.include('key\\|injection');
            expect(content).to.include('value\\|\\@CONVERSATION:evil');
            expect(content).to.not.include('|@CONVERSATION:');
        });

        it('should test SecurityFixes.sanitizePipeData directly', function() {
            const testCases = [
                { input: 'normal text', expected: 'normal text' },
                { input: 'text|with|pipes', expected: 'text\\|with\\|pipes' },
                { input: 'text\nwith\nnewlines', expected: 'text\\nwith\\nnewlines' },
                { input: '@CONVERSATION:evil', expected: '\\@CONVERSATION:evil' },
                { input: '@STATE:bad|@INSIGHTS:worse', expected: '\\@STATE:bad\\|\\@INSIGHTS:worse' }
            ];

            testCases.forEach(testCase => {
                const result = SecurityFixes.sanitizePipeData(testCase.input);
                expect(result).to.equal(testCase.expected);
            });
        });

        it('should handle complex injection patterns', async function() {
            const writer = new AICFWriter(testFile);
            const complexInjection = '@@CONVERSATION:double||injection||test';
            
            await writer.appendConversation('test', 'user', complexInjection, {});
            
            const content = fs.readFileSync(testFile, 'utf8');
            expect(content).to.include('\\@\\@CONVERSATION:double\\|\\|injection\\|\\|test');
            expect(content).to.not.include('@@CONVERSATION:');
        });

        it('should preserve data integrity after sanitization', async function() {
            const writer = new AICFWriter(testFile);
            const originalData = 'Important data|with|pipes\nand\nnewlines';
            
            await writer.appendConversation('test', 'user', originalData, {});
            
            const reader = new AICFReader(testFile);
            const conversations = await reader.getLastConversations(1);
            
            expect(conversations).to.have.length(1);
            expect(conversations[0].message).to.include('Important data');
            expect(conversations[0].message).to.include('with');
            expect(conversations[0].message).to.include('pipes');
        });
    });

    describe('Race Condition Protection', function() {
        let testFile;
        
        beforeEach(function() {
            testFile = path.join(testDir, `race-test-${Date.now()}.aicf`);
        });
        
        afterEach(function() {
            if (fs.existsSync(testFile)) {
                fs.unlinkSync(testFile);
            }
        });

        it('should handle sequential writes correctly', async function() {
            const writer = new AICFWriter(testFile);
            const numWrites = 10;
            
            for (let i = 0; i < numWrites; i++) {
                await writer.appendConversation(`seq-${i}`, 'user', `Message ${i}`, {});
            }
            
            const reader = new AICFReader(testFile);
            const conversations = await reader.getLastConversations(numWrites);
            
            expect(conversations).to.have.length(numWrites);
            conversations.forEach((conv, index) => {
                expect(conv.id).to.equal(`seq-${numWrites - 1 - index}`);
            });
        });

        it('should handle concurrent writes safely', async function() {
            const numConcurrent = 20;
            const promises = [];
            
            for (let i = 0; i < numConcurrent; i++) {
                const promise = (async (index) => {
                    const writer = new AICFWriter(testFile);
                    try {
                        await writer.appendConversation(`concurrent-${index}`, 'user', `Concurrent message ${index}`, {});
                        return { success: true, index };
                    } catch (error) {
                        return { success: false, index, error: error.message };
                    }
                })(i);
                
                promises.push(promise);
            }
            
            const results = await Promise.all(promises);
            const successful = results.filter(r => r.success);
            
            // At least some writes should succeed
            expect(successful.length).to.be.greaterThan(0);
            
            // Verify file integrity
            const reader = new AICFReader(testFile);
            const conversations = await reader.getLastConversations(numConcurrent);
            
            expect(conversations.length).to.equal(successful.length);
        });

        it('should prevent file corruption during concurrent access', async function() {
            const writer1 = new AICFWriter(testFile);
            const writer2 = new AICFWriter(testFile);
            
            // Attempt simultaneous writes
            const promises = [
                writer1.appendConversation('writer1-1', 'user', 'Message from writer 1-1', {}),
                writer2.appendConversation('writer2-1', 'user', 'Message from writer 2-1', {}),
                writer1.appendConversation('writer1-2', 'user', 'Message from writer 1-2', {}),
                writer2.appendConversation('writer2-2', 'user', 'Message from writer 2-2', {})
            ];
            
            const results = await Promise.allSettled(promises);
            const successful = results.filter(r => r.status === 'fulfilled');
            
            // File should remain readable regardless of concurrent access
            const reader = new AICFReader(testFile);
            const conversations = await reader.getLastConversations(10);
            
            expect(conversations.length).to.equal(successful.length);
            expect(() => {
                fs.readFileSync(testFile, 'utf8');
            }).to.not.throw();
        });

        it('should test lock acquisition timeout', async function() {
            this.timeout(10000); // Increase timeout for this test
            
            const writer = new AICFWriter(testFile);
            
            // Create a long-running operation
            const longOperation = writer.appendConversation('long', 'user', 'Long message', {})
                .then(async () => {
                    // Simulate long processing
                    await new Promise(resolve => setTimeout(resolve, 1000));
                });
            
            // Try to acquire lock immediately after
            const shortOperation = writer.appendConversation('short', 'user', 'Short message', {});
            
            const results = await Promise.allSettled([longOperation, shortOperation]);
            
            // At least one should succeed
            const successful = results.filter(r => r.status === 'fulfilled');
            expect(successful.length).to.be.greaterThan(0);
        });

        it('should clean up stale locks', async function() {
            const lockFile = testFile + '.lock';
            
            // Create a stale lock (older than 30 seconds)
            const staleLockData = {
                pid: 99999, // Non-existent PID
                timestamp: Date.now() - 35000, // 35 seconds ago
                id: 'stale-lock-' + crypto.randomUUID()
            };
            
            fs.writeFileSync(lockFile, JSON.stringify(staleLockData));
            
            // Should be able to acquire lock despite stale lock file
            const writer = new AICFWriter(testFile);
            await writer.appendConversation('test', 'user', 'Test message', {});
            
            const reader = new AICFReader(testFile);
            const conversations = await reader.getLastConversations(1);
            
            expect(conversations).to.have.length(1);
            expect(conversations[0].id).to.equal('test');
        });
    });

    describe('Input Validation Protection', function() {
        let testFile;
        
        beforeEach(function() {
            testFile = path.join(testDir, `validation-test-${Date.now()}.aicf`);
        });
        
        afterEach(function() {
            if (fs.existsSync(testFile)) {
                fs.unlinkSync(testFile);
            }
        });

        it('should handle null and undefined inputs', async function() {
            const writer = new AICFWriter(testFile);
            
            // These should not throw errors but handle gracefully
            await writer.appendConversation('test1', 'user', null, {});
            await writer.appendConversation('test2', 'user', undefined, {});
            await writer.appendConversation('test3', 'user', '', {});
            
            const reader = new AICFReader(testFile);
            const conversations = await reader.getLastConversations(5);
            
            expect(conversations).to.have.length(3);
        });

        it('should handle very long inputs', async function() {
            const writer = new AICFWriter(testFile);
            const longMessage = 'A'.repeat(50000); // 50KB message
            
            await writer.appendConversation('long-test', 'user', longMessage, {});
            
            const reader = new AICFReader(testFile);
            const conversations = await reader.getLastConversations(1);
            
            expect(conversations).to.have.length(1);
            expect(conversations[0].message).to.include('A');
        });

        it('should sanitize control characters', async function() {
            const writer = new AICFWriter(testFile);
            const controlChars = '\x00\x01\x02\x03\x04\x05\x06\x07\x08\x0B\x0C\x0E\x0F';
            
            await writer.appendConversation('control-test', 'user', `Message with${controlChars}control chars`, {});
            
            const content = fs.readFileSync(testFile, 'utf8');
            
            // Control characters should be removed or escaped
            expect(content).to.not.include('\x00');
            expect(content).to.not.include('\x01');
            expect(content).to.include('Message with');
            expect(content).to.include('control chars');
        });

        it('should handle Unicode and special characters', async function() {
            const writer = new AICFWriter(testFile);
            const unicodeMessage = '𝕸𝖆𝖑𝖎𝖈𝖎𝖔𝖚𝖘 𝖚𝖓𝖎𝖈𝖔𝖉𝖊 + emoji 🚀🔒💻';
            
            await writer.appendConversation('unicode-test', 'user', unicodeMessage, {});
            
            const reader = new AICFReader(testFile);
            const conversations = await reader.getLastConversations(1);
            
            expect(conversations).to.have.length(1);
            expect(conversations[0].message).to.include('𝖚𝖓𝖎𝖈𝖔𝖉𝖊');
            expect(conversations[0].message).to.include('🚀');
        });

        it('should validate metadata types', async function() {
            const writer = new AICFWriter(testFile);
            
            const validMetadata = {
                string: 'value',
                number: 123,
                boolean: true,
                null: null
            };
            
            await writer.appendConversation('metadata-test', 'user', 'Test message', validMetadata);
            
            const reader = new AICFReader(testFile);
            const conversations = await reader.getLastConversations(1);
            
            expect(conversations).to.have.length(1);
            expect(conversations[0].id).to.equal('metadata-test');
        });

        it('should handle XSS-like inputs safely', async function() {
            const writer = new AICFWriter(testFile);
            const xssInput = '<script>alert("xss")</script><img src="x" onerror="alert(1)">';
            
            await writer.appendConversation('xss-test', 'user', xssInput, {});
            
            const content = fs.readFileSync(testFile, 'utf8');
            
            // Should be stored safely (not executed, but preserved for context)
            expect(content).to.include('script');
            expect(content).to.include('alert');
            
            const reader = new AICFReader(testFile);
            const conversations = await reader.getLastConversations(1);
            
            expect(conversations).to.have.length(1);
        });
    });

    describe('PII Detection and Redaction', function() {
        let testFile;
        
        beforeEach(function() {
            testFile = path.join(testDir, `pii-test-${Date.now()}.aicf`);
        });
        
        afterEach(function() {
            if (fs.existsSync(testFile)) {
                fs.unlinkSync(testFile);
            }
        });

        it('should detect and redact Social Security Numbers', function() {
            const testCases = [
                '123-45-6789',
                '123456789',
                '123 45 6789'
            ];

            testCases.forEach(ssn => {
                const redacted = SecurityFixes.redactPII(`My SSN is ${ssn}`);
                expect(redacted).to.not.include(ssn);
                expect(redacted).to.include('[REDACTED-SSN]');
            });
        });

        it('should detect and redact credit card numbers', function() {
            const testCases = [
                '4532-1234-5678-9012',
                '4532123456789012',
                '4532 1234 5678 9012'
            ];

            testCases.forEach(cc => {
                const redacted = SecurityFixes.redactPII(`Credit card: ${cc}`);
                expect(redacted).to.not.include(cc);
                expect(redacted).to.include('[REDACTED-CREDIT-CARD]');
            });
        });

        it('should detect and redact email addresses', function() {
            const emails = [
                'user@example.com',
                'test.email+tag@domain.co.uk',
                'admin@localhost'
            ];

            emails.forEach(email => {
                const redacted = SecurityFixes.redactPII(`Contact: ${email}`);
                expect(redacted).to.not.include(email);
                expect(redacted).to.include('[REDACTED-EMAIL]');
            });
        });

        it('should detect and redact API keys', function() {
            const apiKeys = [
                'sk-1234567890abcdef',
                'AKIAIOSFODNN7EXAMPLE',
                'ghp_1234567890abcdef'
            ];

            apiKeys.forEach(key => {
                const redacted = SecurityFixes.redactPII(`API key: ${key}`);
                expect(redacted).to.not.include(key);
                expect(redacted).to.include('[REDACTED-API-KEY]');
            });
        });

        it('should redact PII in addInsight method', async function() {
            const writer = new AICFWriter(testFile);
            const piiText = 'My SSN is 123-45-6789 and email is user@example.com';
            
            await writer.addInsight('pii-insight', piiText);
            
            const content = fs.readFileSync(testFile, 'utf8');
            expect(content).to.not.include('123-45-6789');
            expect(content).to.not.include('user@example.com');
            expect(content).to.include('[REDACTED-SSN]');
            expect(content).to.include('[REDACTED-EMAIL]');
        });

        it('should preserve non-PII data during redaction', function() {
            const text = 'Normal text with PII: user@example.com and more normal text';
            const redacted = SecurityFixes.redactPII(text);
            
            expect(redacted).to.include('Normal text with PII:');
            expect(redacted).to.include('and more normal text');
            expect(redacted).to.not.include('user@example.com');
            expect(redacted).to.include('[REDACTED-EMAIL]');
        });
    });

    describe('Memory Safety', function() {
        it('should handle large data without memory exhaustion', async function() {
            this.timeout(30000); // 30 second timeout for large data test
            
            const testFile = path.join(testDir, 'memory-test.aicf');
            const writer = new AICFWriter(testFile);
            
            // Write 10MB of data in chunks
            const chunkSize = 1024 * 100; // 100KB chunks
            const totalChunks = 100; // 10MB total
            
            const memBefore = process.memoryUsage().heapUsed;
            
            for (let i = 0; i < totalChunks; i++) {
                const largeMessage = 'A'.repeat(chunkSize);
                await writer.appendConversation(`chunk-${i}`, 'user', largeMessage, {});
            }
            
            const memAfter = process.memoryUsage().heapUsed;
            const memoryIncrease = memAfter - memBefore;
            const fileSizeMB = fs.statSync(testFile).size / (1024 * 1024);
            
            console.log(`   File size: ${fileSizeMB.toFixed(2)}MB`);
            console.log(`   Memory increase: ${(memoryIncrease / (1024 * 1024)).toFixed(2)}MB`);
            
            // Memory increase should be reasonable (less than 50% of file size)
            expect(memoryIncrease).to.be.lessThan(fileSizeMB * 1024 * 1024 * 0.5);
            
            // Clean up
            fs.unlinkSync(testFile);
        });

        it('should use streaming for large file reads', async function() {
            this.timeout(30000);
            
            const testFile = path.join(testDir, 'streaming-test.aicf');
            const writer = new AICFWriter(testFile);
            
            // Create a file larger than 10MB threshold
            const largeMessage = 'B'.repeat(1024 * 1024); // 1MB message
            for (let i = 0; i < 15; i++) { // 15MB total
                await writer.appendConversation(`large-${i}`, 'user', largeMessage, {});
            }
            
            const memBefore = process.memoryUsage().heapUsed;
            const reader = new AICFReader(testFile);
            const conversations = await reader.getLastConversations(5);
            const memAfter = process.memoryUsage().heapUsed;
            
            const memoryIncrease = memAfter - memBefore;
            
            // Should use streaming (low memory usage)
            expect(memoryIncrease).to.be.lessThan(5 * 1024 * 1024); // Less than 5MB
            expect(conversations).to.have.length(5);
            
            fs.unlinkSync(testFile);
        });
    });
});

// Helper function to run tests programmatically
function runSecurityUnitTests() {
    return new Promise((resolve, reject) => {
        const Mocha = require('mocha');
        const mocha = new Mocha({
            timeout: 60000,
            reporter: 'spec'
        });
        
        mocha.addFile(__filename);
        
        mocha.run((failures) => {
            if (failures) {
                reject(new Error(`${failures} test(s) failed`));
            } else {
                resolve('All tests passed');
            }
        });
    });
}

module.exports = { runSecurityUnitTests };