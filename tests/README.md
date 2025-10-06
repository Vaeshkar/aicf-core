# AICF Tests

Comprehensive test suite for AICF v3.1.1 security and performance validation.

---

## 🚀 Quick Start

Run all tests:
```bash
./tests/run-all-tests.sh
```

Or run individually:
```bash
# Integration tests
node tests/integration-security.test.js

# Performance tests (with GC)
node --expose-gc tests/performance.test.js
```

---

## 📋 Test Files

### **Integration Tests**
- `integration-security.test.js` - End-to-end security validation
  - Path traversal prevention
  - Pipe injection protection
  - Race condition handling
  - PII detection and redaction
  - Multi-process concurrency
  - Input validation

### **Performance Tests**
- `performance.test.js` - Performance and memory validation
  - Large file handling (10MB, 50MB, 100MB)
  - Memory usage validation
  - Streaming vs memory loading
  - Concurrent operations
  - PII detection performance

### **Test Runner**
- `run-all-tests.sh` - Runs all tests with proper configuration

---

## ✅ Expected Results

### **Integration Tests**
```
✅ Passed: 20+
❌ Failed: 0
🎯 Success Rate: 100.0%
```

### **Performance Tests**
```
Memory improvement: 99.4%+ (streaming vs memory loading)
Constant memory usage: ~64KB regardless of file size
PII detection: >1000 ops/sec
```

---

## 📚 Documentation

See `docs/TESTING_GUIDE.md` for complete testing documentation.

---

## 🎯 Success Criteria

- ✅ All integration tests pass
- ✅ Memory usage < 100KB for large files
- ✅ Memory improvement > 99%
- ✅ No security vulnerabilities
- ✅ No data corruption

---

**Ready for production when all tests pass!** 🚀

