# Contributing to AICF-Core

Thank you for your interest in contributing to AICF-Core! This document provides guidelines and instructions for contributing to the project.

## 🌟 Ways to Contribute

- **Report bugs** - Help us identify and fix issues
- **Suggest features** - Share ideas for improvements
- **Improve documentation** - Help others understand AICF
- **Submit code** - Fix bugs or implement features
- **Write tests** - Improve test coverage
- **Share examples** - Show how you use AICF

## 🚀 Getting Started

### Prerequisites

- Node.js >= 16.0.0
- npm, yarn, or pnpm
- Git
- A GitHub account

### Development Setup

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/aicf-core.git
   cd aicf-core
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

4. **Run tests**
   ```bash
   npm test
   ```

5. **Make your changes**
   - Write code
   - Add tests
   - Update documentation

6. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

7. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

8. **Create a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your branch
   - Fill out the PR template

## 📝 Coding Standards

### JavaScript Style Guide

We follow standard JavaScript conventions:

```javascript
// ✅ Good
class AICFService {
  constructor(aicfDir) {
    this.aicfDir = aicfDir;
    this.reader = new AICFReader(aicfDir);
  }

  async logConversation(data) {
    // Validate input
    if (!data.id) {
      throw new Error('Missing conversation ID');
    }

    // Log conversation
    await this.writer.logConversation(data);
  }
}

// ❌ Bad
class aicfservice {
  constructor(dir) {
    this.dir=dir
    this.reader=new AICFReader(dir)
  }
  async logConversation(data){
    await this.writer.logConversation(data)
  }
}
```

### Code Style Rules

1. **Use 2 spaces for indentation**
2. **Use semicolons**
3. **Use single quotes for strings**
4. **Use camelCase for variables and functions**
5. **Use PascalCase for classes**
6. **Use UPPER_CASE for constants**
7. **Add JSDoc comments for public APIs**

### JSDoc Comments

```javascript
/**
 * Log a conversation to AICF
 * 
 * @param {Object} data - Conversation data
 * @param {string} data.id - Unique conversation identifier
 * @param {number} data.messages - Number of messages
 * @param {number} data.tokens - Approximate token count
 * @param {Object} [data.metadata] - Optional metadata
 * @returns {Promise<void>}
 * @throws {Error} If validation fails
 * 
 * @example
 * await aicf.logConversation({
 *   id: 'conv_001',
 *   messages: 10,
 *   tokens: 500,
 *   metadata: { topic: 'example' }
 * });
 */
async logConversation(data) {
  // Implementation
}
```

## 🧪 Testing Requirements

### Writing Tests

All new features and bug fixes must include tests.

```javascript
// tests/aicf-writer.test.js
const { AICFWriter } = require('../src/aicf-writer');

describe('AICFWriter', () => {
  let writer;

  beforeEach(() => {
    writer = new AICFWriter('.aicf-test');
  });

  afterEach(() => {
    // Cleanup
  });

  test('should log conversation successfully', async () => {
    const data = {
      id: 'test_conv',
      messages: 10,
      tokens: 500
    };

    await writer.logConversation(data);
    
    // Assertions
    expect(/* ... */).toBe(/* ... */);
  });

  test('should throw error for invalid data', async () => {
    await expect(writer.logConversation({}))
      .rejects.toThrow('Missing conversation ID');
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/aicf-writer.test.js

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

### Test Coverage Requirements

- **Minimum coverage**: 80%
- **New code**: 90%+ coverage
- **Critical paths**: 100% coverage

## 🔄 Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] Commit messages follow conventions
- [ ] No merge conflicts

### PR Title Format

Use conventional commit format:

```
feat: add natural language query support
fix: resolve memory leak in reader
docs: update API reference
test: add tests for writer
refactor: simplify query logic
perf: optimize date range filtering
```

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How was this tested?

## Checklist
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### Review Process

1. **Automated checks** - CI/CD runs tests
2. **Code review** - Maintainer reviews code
3. **Feedback** - Address review comments
4. **Approval** - Maintainer approves PR
5. **Merge** - PR is merged to main

## 🐛 Bug Reports

### Before Reporting

1. **Search existing issues** - Check if already reported
2. **Reproduce the bug** - Ensure it's reproducible
3. **Gather information** - Collect relevant details

### Bug Report Template

```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- AICF-Core version: 1.0.0
- Node.js version: 18.0.0
- OS: macOS 13.0

## Additional Context
Any other relevant information
```

## 💡 Feature Requests

### Feature Request Template

```markdown
## Feature Description
Clear description of the feature

## Use Case
Why is this feature needed?

## Proposed Solution
How should it work?

## Alternatives Considered
Other approaches you've thought about

## Additional Context
Any other relevant information
```

## 📚 Documentation

### Documentation Standards

1. **Clear and concise** - Easy to understand
2. **Code examples** - Show, don't just tell
3. **Up-to-date** - Keep in sync with code
4. **Well-organized** - Logical structure

### Documentation Locations

- **README.md** - Project overview and quick start
- **docs/GETTING_STARTED.md** - Beginner guide
- **docs/API_REFERENCE.md** - Complete API docs
- **docs/BEST_PRACTICES.md** - Production patterns
- **examples/** - Working code samples

## 🎯 Commit Message Guidelines

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **test**: Test changes
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **chore**: Maintenance tasks

### Examples

```bash
# Feature
git commit -m "feat(reader): add date range filtering"

# Bug fix
git commit -m "fix(writer): resolve race condition in concurrent writes"

# Documentation
git commit -m "docs: update API reference with new methods"

# Breaking change
git commit -m "feat(api): redesign query interface

BREAKING CHANGE: query() now returns Promise instead of sync result"
```

## 🏗️ Project Structure

```
aicf-core/
├── src/                    # Source code
│   ├── aicf-api.js        # Main API
│   ├── aicf-reader.js     # Reader implementation
│   ├── aicf-writer.js     # Writer implementation
│   ├── agents/            # Agent implementations
│   └── parsers/           # Parser utilities
├── tests/                 # Test files
├── docs/                  # Documentation
├── examples/              # Code examples
├── lib/                   # Built files (generated)
└── types/                 # TypeScript definitions
```

## 🔐 Security

### Reporting Security Issues

**DO NOT** open public issues for security vulnerabilities.

Instead, email: security@aicf-core.dev (or create a private security advisory on GitHub)

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## 📜 Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone.

### Our Standards

**Positive behavior:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community

**Unacceptable behavior:**
- Trolling, insulting/derogatory comments
- Public or private harassment
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate

### Enforcement

Violations may result in:
1. Warning
2. Temporary ban
3. Permanent ban

Report violations to: conduct@aicf-core.dev

## 🎓 Learning Resources

### For New Contributors

- [Getting Started Guide](docs/GETTING_STARTED.md)
- [API Reference](docs/API_REFERENCE.md)
- [Examples](examples/)

### For Advanced Contributors

- [AICF Specification](docs/AICF_SPEC_v3.0.md)
- [Best Practices](docs/BEST_PRACTICES.md)
- [Architecture Overview](docs/AICF-ASSESSMENT.md)

## 🙏 Recognition

Contributors are recognized in:
- **README.md** - Contributors section
- **CHANGELOG.md** - Release notes
- **GitHub** - Contributor graph

## 📞 Getting Help

- **GitHub Discussions** - Ask questions
- **GitHub Issues** - Report bugs
- **Documentation** - Read the docs
- **Examples** - Check code samples

## 📄 License

By contributing, you agree that your contributions will be licensed under the AGPL-3.0-or-later license.

---

**Thank you for contributing to AICF-Core! Together we're building the future of AI memory management. 🚀**

