/**
 * Dependency Auto-Fix Utility
 * 
 * Automatically analyzes generated project files and fixes missing dependencies
 * in package.json based on import/require statements found in the code.
 */

import fs from 'fs-extra';
import path from 'path';
import glob from 'glob';
import { promisify } from 'util';

const globAsync = promisify(glob);

export class DependencyFixer {
  constructor() {
    // Common dependency mappings for packages that might not match import names
    this.dependencyMappings = {
      // React ecosystem
      'react': '^18.2.0',
      'react-dom': '^18.2.0',
      'react-scripts': '^5.0.1',
      
      // Backend essentials
      'express': '^4.18.2',
      'cors': '^2.8.5',
      'body-parser': '^1.20.2',
      'express-validator': '^7.0.1',
      'helmet': '^7.0.0',
      
      // Utilities
      'axios': '^1.4.0',
      'lodash': '^4.17.21',
      'moment': '^2.29.4',
      'dayjs': '^1.11.9',
      'nanoid': '^4.0.2',
      'uuid': '^9.0.0',
      
      // Development
      'nodemon': '^3.0.1',
      'concurrently': '^8.2.0',
      
      // Build tools
      '@babel/core': '^7.22.5',
      '@babel/preset-react': '^7.22.5',
      '@babel/preset-env': '^7.22.5',
      
      // Testing
      '@testing-library/react': '^13.4.0',
      '@testing-library/jest-dom': '^5.16.5',
      'jest': '^29.5.0',
      
      // Styling
      'tailwindcss': '^3.3.2',
      'autoprefixer': '^10.4.14',
      'postcss': '^8.4.24'
    };
  }

  /**
   * Auto-fix missing dependencies in a project
   */
  async fixProjectDependencies(projectDir) {
    console.log('\n🔧 AUTO-FIXING DEPENDENCIES...\n');
    
    try {
      // 1. Scan all code files for imports
      const importedPackages = await this.scanImports(projectDir);
      console.log(`📦 Found ${importedPackages.size} imported packages`);
      
      // 2. Read current package.json
      const packageJsonPath = path.join(projectDir, 'package.json');
      let packageJson = {};
      
      if (await fs.pathExists(packageJsonPath)) {
        packageJson = await fs.readJson(packageJsonPath);
      }
      
      // Ensure dependencies objects exist
      if (!packageJson.dependencies) packageJson.dependencies = {};
      if (!packageJson.devDependencies) packageJson.devDependencies = {};
      
      // 3. Determine which packages are missing
      const missing = [];
      const currentDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };
      
      for (const pkg of importedPackages) {
        if (!currentDeps[pkg] && this.dependencyMappings[pkg]) {
          missing.push(pkg);
        }
      }
      
      if (missing.length === 0) {
        console.log('✅ All dependencies are already declared');
        return { fixed: false, added: [] };
      }
      
      console.log(`🔍 Missing dependencies: ${missing.join(', ')}`);
      
      // 4. Add missing dependencies
      const added = [];
      for (const pkg of missing) {
        const version = this.dependencyMappings[pkg];
        
        if (this.isDevDependency(pkg)) {
          packageJson.devDependencies[pkg] = version;
        } else {
          packageJson.dependencies[pkg] = version;
        }
        
        added.push(`${pkg}@${version}`);
        console.log(`  ✓ Added ${pkg}@${version}`);
      }
      
      // 5. Add essential scripts if missing
      if (!packageJson.scripts) packageJson.scripts = {};
      
      const essentialScripts = {
        'start': 'node server.js',
        'dev': 'nodemon server.js',
        'client': 'react-scripts start',
        'build': 'react-scripts build',
        'test': 'react-scripts test',
        'eject': 'react-scripts eject'
      };
      
      for (const [scriptName, scriptCommand] of Object.entries(essentialScripts)) {
        if (!packageJson.scripts[scriptName]) {
          packageJson.scripts[scriptName] = scriptCommand;
          console.log(`  ✓ Added script: ${scriptName}`);
        }
      }
      
      // 6. Write updated package.json
      await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
      
      console.log(`\n✅ Fixed package.json with ${added.length} new dependencies\n`);
      
      return { fixed: true, added, packageJson };
      
    } catch (error) {
      console.error('❌ Dependency fix failed:', error.message);
      return { fixed: false, error: error.message };
    }
  }

  /**
   * Scan all code files for import/require statements
   */
  async scanImports(projectDir) {
    const importedPackages = new Set();
    const builtins = ['fs', 'path', 'http', 'https', 'url', 'crypto', 'util', 'events', 'stream', 'os'];
    
    // Find all JS/JSX files
    const jsFiles = await globAsync(`${projectDir}/**/*.{js,jsx}`, {
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
    });
    
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
        console.warn(`Warning: Could not scan ${path.relative(projectDir, file)}`);
      }
    }
    
    return importedPackages;
  }

  /**
   * Determine if a package should be a dev dependency
   */
  isDevDependency(packageName) {
    const devPackages = [
      'nodemon', 'concurrently', '@babel/core', '@babel/preset-react', '@babel/preset-env',
      '@testing-library/react', '@testing-library/jest-dom', 'jest',
      'tailwindcss', 'autoprefixer', 'postcss'
    ];
    
    return devPackages.includes(packageName);
  }

  /**
   * Create a dependency report
   */
  async generateDependencyReport(projectDir) {
    const importedPackages = await this.scanImports(projectDir);
    const packageJsonPath = path.join(projectDir, 'package.json');
    
    let currentDeps = {};
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      currentDeps = {
        ...packageJson.dependencies || {},
        ...packageJson.devDependencies || {}
      };
    }
    
    const report = {
      imported: Array.from(importedPackages),
      declared: Object.keys(currentDeps),
      missing: Array.from(importedPackages).filter(pkg => !currentDeps[pkg]),
      unused: Object.keys(currentDeps).filter(pkg => !importedPackages.has(pkg))
    };
    
    return report;
  }
}

export default DependencyFixer;