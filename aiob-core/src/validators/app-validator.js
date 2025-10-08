/**
 * Application Validator for AIOB
 * 
 * This validator performs comprehensive testing of generated applications:
 * - File structure validation
 * - Syntax checking for JavaScript/JSON files
 * - Dependency verification
 * - Runtime testing (actually starts the app)
 * 
 * Unlike simple code analysis, this validator actually TESTS if the app works.
 */

import fs from 'fs-extra';
import path from 'path';
import glob from 'glob';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';

const globAsync = promisify(glob);

const execAsync = promisify(exec);

export class AppValidator {
  constructor() {
    this.results = {
      structure: null,
      syntax: null,
      dependencies: null,
      runtime: null
    };
  }

  /**
   * Main validation method - runs all checks
   */
  async validate(projectDir) {
    console.log('\n🔍 VALIDATING APPLICATION...');
    console.log('═'.repeat(60));
    console.log(`Project: ${path.basename(projectDir)}`);
    console.log(`Location: ${projectDir}`);
    console.log('═'.repeat(60) + '\n');

    this.results = {
      structure: await this.validateStructure(projectDir),
      syntax: await this.validateSyntax(projectDir),
      dependencies: await this.validateDependencies(projectDir),
      runtime: await this.validateRuntime(projectDir)
    };

    return this.generateReport();
  }

  /**
   * 1. Check Required Files Exist
   */
  async validateStructure(projectDir) {
    console.log('📁 CHECKING FILE STRUCTURE...\n');

    const required = [
      'package.json',
      'server.js',
      'public/index.html',
      'src/App.jsx',
      'src/index.js'
    ];

    const missing = [];
    const found = [];

    for (const file of required) {
      const filePath = path.join(projectDir, file);
      const exists = await fs.pathExists(filePath);
      
      if (exists) {
        console.log(`  ✓ ${file}`);
        found.push(file);
      } else {
        console.log(`  ❌ ${file}`);
        missing.push(file);
      }
    }

    // Check for additional important files
    const optional = [
      'routes',
      'middleware', 
      'src/components',
      'README.md'
    ];

    const optionalFound = [];
    for (const file of optional) {
      const filePath = path.join(projectDir, file);
      const exists = await fs.pathExists(filePath);
      if (exists) {
        console.log(`  ✓ ${file} (optional)`);
        optionalFound.push(file);
      }
    }

    const pass = missing.length === 0;
    console.log(`\n  Result: ${pass ? '✅ PASS' : '❌ FAIL'} - ${found.length}/${required.length} required files found\n`);

    return {
      pass,
      required,
      found,
      missing,
      optionalFound
    };
  }

  /**
   * 2. Check JavaScript and JSON Syntax
   */
  async validateSyntax(projectDir) {
    console.log('🔤 CHECKING SYNTAX...\n');

    const errors = [];
    let jsFiles = [];
    let jsonFiles = [];

    try {
      // Check JavaScript/JSX files
      jsFiles = await globAsync(`${projectDir}/**/*.{js,jsx}`, {
        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
      });

      console.log(`  Found ${jsFiles.length} JavaScript files to check:`);

      for (const file of jsFiles) {
        const relativePath = path.relative(projectDir, file);
        try {
          // Skip JSX files as node --check doesn't understand JSX syntax
          if (file.endsWith('.jsx')) {
            // For JSX files, just check for basic syntax issues like unmatched brackets
            const content = await fs.readFile(file, 'utf8');
            this.validateJSXBasics(content, relativePath);
            console.log(`    ✓ ${relativePath} (JSX basic check)`);
          } else {
            // Use node --check for regular JS files
            await execAsync(`node --check "${file}"`);
            console.log(`    ✓ ${relativePath}`);
          }
        } catch (error) {
          console.log(`    ❌ ${relativePath} - ${error.message.split('\n')[0]}`);
          errors.push({ 
            file: relativePath, 
            type: file.endsWith('.jsx') ? 'JSX' : 'JavaScript',
            error: error.message.split('\n')[0] 
          });
        }
      }

      // Check JSON files
      jsonFiles = await globAsync(`${projectDir}/**/*.json`, {
        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
      });

      console.log(`\n  Found ${jsonFiles.length} JSON files to check:`);

      for (const file of jsonFiles) {
        const relativePath = path.relative(projectDir, file);
        try {
          const content = await fs.readFile(file, 'utf8');
          JSON.parse(content);
          console.log(`    ✓ ${relativePath}`);
        } catch (error) {
          console.log(`    ❌ ${relativePath} - Invalid JSON`);
          errors.push({ 
            file: relativePath, 
            type: 'JSON',
            error: 'Invalid JSON syntax' 
          });
        }
      }

    } catch (error) {
      errors.push({ 
        file: 'general', 
        type: 'system',
        error: `File scanning error: ${error.message}` 
      });
    }

    const pass = errors.length === 0;
    console.log(`\n  Result: ${pass ? '✅ PASS' : '❌ FAIL'} - ${errors.length} syntax errors found\n`);

    return {
      pass,
      errors,
      totalFilesChecked: jsFiles.length + jsonFiles.length
    };
  }

  /**
   * Basic JSX validation - check for common syntax issues
   */
  validateJSXBasics(content, filePath) {
    // Check for unmatched brackets
    const openBrackets = (content.match(/\{/g) || []).length;
    const closeBrackets = (content.match(/\}/g) || []).length;
    if (openBrackets !== closeBrackets) {
      throw new Error(`Unmatched curly braces: ${openBrackets} open, ${closeBrackets} close`);
    }

    // Check for unmatched parentheses
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      throw new Error(`Unmatched parentheses: ${openParens} open, ${closeParens} close`);
    }

    // Check for unterminated strings (basic check)
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip comments
      if (line.trim().startsWith('//') || line.trim().startsWith('/*')) continue;
      
      // Basic check for unterminated strings
      const singleQuotes = (line.match(/(?<!\\)'/g) || []).length;
      const doubleQuotes = (line.match(/(?<!\\)"/g) || []).length;
      const backticks = (line.match(/(?<!\\)`/g) || []).length;
      
      if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0 || backticks % 2 !== 0) {
        throw new Error(`Possible unterminated string on line ${i + 1}`);
      }
    }
  }

  /**
   * 3. Check Dependencies Match Imports
   */
  async validateDependencies(projectDir) {
    console.log('📦 CHECKING DEPENDENCIES...\n');

    try {
      // Read package.json
      const packageJsonPath = path.join(projectDir, 'package.json');
      if (!await fs.pathExists(packageJsonPath)) {
        console.log('  ❌ package.json not found\n');
        return {
          pass: false,
          error: 'package.json not found'
        };
      }

      const packageJson = await fs.readJson(packageJsonPath);
      const declaredDeps = {
        ...packageJson.dependencies || {},
        ...packageJson.devDependencies || {}
      };

      console.log(`  Declared dependencies: ${Object.keys(declaredDeps).length}`);
      Object.keys(declaredDeps).forEach(dep => {
        console.log(`    • ${dep}@${declaredDeps[dep]}`);
      });

      // Scan code for imports
      const jsFiles = await globAsync(`${projectDir}/**/*.{js,jsx}`, {
        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
      });

      const importedPackages = new Set();
      const builtins = ['fs', 'path', 'http', 'https', 'url', 'crypto', 'util', 'events', 'stream'];

      console.log(`\n  Scanning ${jsFiles.length} files for imports...`);

      for (const file of jsFiles) {
        try {
          const content = await fs.readFile(file, 'utf8');
          
          // Match import statements and require calls
          const importRegex = /(?:import.*?from\s+['"`]([^'"`]+)['"`]|require\s*\(\s*['"`]([^'"`]+)['"`]\s*\))/g;
          let match;
          
          while ((match = importRegex.exec(content)) !== null) {
            const packageName = match[1] || match[2];
            if (packageName && !packageName.startsWith('.') && !packageName.startsWith('/')) {
              // Extract base package name (handle scoped packages)
              const basePkg = packageName.startsWith('@') 
                ? packageName.split('/').slice(0, 2).join('/')
                : packageName.split('/')[0];
              
              if (!builtins.includes(basePkg)) {
                importedPackages.add(basePkg);
              }
            }
          }
        } catch (error) {
          console.log(`    Warning: Could not scan ${path.relative(projectDir, file)}`);
        }
      }

      // Find missing dependencies
      const missing = [];
      Array.from(importedPackages).forEach(pkg => {
        if (!declaredDeps[pkg]) {
          missing.push(pkg);
        }
      });

      console.log(`\n  Imported packages found: ${importedPackages.size}`);
      Array.from(importedPackages).forEach(pkg => {
        const isDeclared = declaredDeps[pkg];
        console.log(`    ${isDeclared ? '✓' : '❌'} ${pkg}`);
      });

      const pass = missing.length === 0;
      
      if (missing.length > 0) {
        console.log(`\n  ❌ Missing dependencies: ${missing.join(', ')}`);
      }

      console.log(`\n  Result: ${pass ? '✅ PASS' : '❌ FAIL'} - Dependencies check complete\n`);

      return {
        pass,
        declared: Object.keys(declaredDeps),
        imported: Array.from(importedPackages),
        missing
      };

    } catch (error) {
      console.log(`  ❌ Error checking dependencies: ${error.message}\n`);
      return {
        pass: false,
        error: error.message
      };
    }
  }

  /**
   * 4. Runtime Testing - Actually Start the App
   */
  async validateRuntime(projectDir) {
    console.log('🚀 RUNTIME TESTING...\n');

    try {
      // First, install dependencies if needed
      console.log('  📦 Installing dependencies...');
      
      const installResult = await execAsync(`cd "${projectDir}" && npm install --silent`, {
        timeout: 120000 // 2 minutes timeout
      });

      console.log('  ✓ Dependencies installed successfully');

      // Try to start the server
      console.log('\n  🏃 Starting server...');
      
      const serverProcess = spawn('node', ['server.js'], {
        cwd: projectDir,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // Collect server output
      let serverOutput = '';
      let serverError = '';
      
      if (serverProcess.stdout) {
        serverProcess.stdout.on('data', (data) => {
          serverOutput += data.toString();
        });
      }
      
      if (serverProcess.stderr) {
        serverProcess.stderr.on('data', (data) => {
          serverError += data.toString();
        });
      }

      // Wait for server to start
      console.log('  ⏳ Waiting for server to start...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Test if server responds
      let testResult = null;
      try {
        console.log('  🌐 Testing server response...');
        
        // Try to fetch from localhost:3000 (common Express default)
        const { default: fetch } = await import('node-fetch');
        const response = await fetch('http://localhost:3000', {
          timeout: 10000
        });
        
        const status = response.status;
        console.log(`  ✓ Server responding with status: ${status}`);
        
        testResult = {
          pass: status < 500,
          status,
          responding: true
        };

      } catch (fetchError) {
        // Try different ports
        console.log('  ❌ Port 3000 not responding, trying alternative ports...');
        
        const ports = [3001, 8000, 8080, 5000];
        let foundPort = null;
        
        for (const port of ports) {
          try {
            const { default: fetch } = await import('node-fetch');
            const response = await fetch(`http://localhost:${port}`, {
              timeout: 5000
            });
            foundPort = port;
            console.log(`  ✓ Found server on port ${port} (status: ${response.status})`);
            testResult = {
              pass: response.status < 500,
              status: response.status,
              responding: true,
              port: foundPort
            };
            break;
          } catch (e) {
            // Continue trying other ports
          }
        }
        
        if (!foundPort) {
          console.log('  ❌ Server not responding on any common ports');
          testResult = {
            pass: false,
            responding: false,
            error: 'Server not responding',
            serverOutput: serverOutput.slice(0, 500),
            serverError: serverError.slice(0, 500)
          };
        }
      }

      // Clean up - kill the server process
      try {
        if (serverProcess.pid) {
          process.kill(-serverProcess.pid, 'SIGTERM');
        }
      } catch (killError) {
        // Process might already be dead, that's ok
      }

      console.log(`\n  Result: ${testResult.pass ? '✅ PASS' : '❌ FAIL'} - Runtime test complete\n`);

      return testResult;

    } catch (error) {
      console.log(`  ❌ Runtime error: ${error.message}\n`);
      return {
        pass: false,
        error: error.message
      };
    }
  }

  /**
   * Generate Comprehensive Report
   */
  generateReport() {
    const { structure, syntax, dependencies, runtime } = this.results;
    
    console.log('═'.repeat(60));
    console.log('📊 FINAL VALIDATION REPORT');
    console.log('═'.repeat(60));

    const sections = [
      { name: 'File Structure', result: structure, weight: 0.25 },
      { name: 'Syntax Check', result: syntax, weight: 0.25 },
      { name: 'Dependencies', result: dependencies, weight: 0.25 },
      { name: 'Runtime Test', result: runtime, weight: 0.25 }
    ];

    let totalScore = 0;
    let criticalIssues = 0;

    sections.forEach(({ name, result, weight }) => {
      const status = result.pass ? '✅ PASS' : '❌ FAIL';
      console.log(`\n${status} ${name}`);
      
      if (result.pass) {
        totalScore += weight * 100;
      } else {
        criticalIssues++;
        
        // Show specific failures
        if (result.missing?.length > 0) {
          console.log(`  Missing: ${result.missing.join(', ')}`);
        }
        if (result.errors?.length > 0) {
          console.log(`  Errors: ${result.errors.length} found`);
          result.errors.slice(0, 3).forEach(e => {
            console.log(`    • ${e.file}: ${e.error}`);
          });
          if (result.errors.length > 3) {
            console.log(`    • ... and ${result.errors.length - 3} more`);
          }
        }
        if (result.error) {
          console.log(`  Error: ${result.error}`);
        }
      }
    });

    const overallPass = sections.every(s => s.result.pass);
    const qualityScore = Math.round(totalScore);

    console.log('\n' + '═'.repeat(60));
    console.log('OVERALL ASSESSMENT');
    console.log('═'.repeat(60));
    console.log(`Status: ${overallPass ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Quality Score: ${qualityScore}/100`);
    console.log(`Critical Issues: ${criticalIssues}`);
    
    if (overallPass) {
      console.log('\n🎉 APPLICATION IS READY TO USE!');
      console.log('\nTo run your app:');
      console.log('  npm install');
      console.log('  npm start');
    } else {
      console.log('\n⚠️  APPLICATION NEEDS FIXES');
      console.log('\nPlease address the issues above before deploying.');
    }
    
    console.log('═'.repeat(60) + '\n');

    return {
      success: overallPass,
      qualityScore,
      criticalIssues,
      results: this.results,
      summary: {
        totalFiles: structure.found?.length || 0,
        syntaxErrors: syntax.errors?.length || 0,
        missingDeps: dependencies.missing?.length || 0,
        runtimeWorks: runtime.pass || false
      }
    };
  }
}

export default AppValidator;