#!/usr/bin/env node

/**
 * Fix TypeScript compiled imports to include .js extensions for ESM
 * Node.js ESM requires explicit file extensions in imports
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

async function* walkDirectory(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const path = join(dir, entry.name);
    
    if (entry.isDirectory()) {
      yield* walkDirectory(path);
    } else if (entry.isFile() && (extname(entry.name) === '.js' || extname(entry.name) === '.d.ts')) {
      yield path;
    }
  }
}

async function fixImports(filePath) {
  let content = await readFile(filePath, 'utf-8');
  let modified = false;
  
  // Fix relative imports without extensions
  const importRegex = /from\s+['"](\.[^'"]+)['"]/g;
  content = content.replace(importRegex, (match, importPath) => {
    // Skip if already has extension
    if (importPath.endsWith('.js') || importPath.endsWith('.json')) {
      return match;
    }
    
    modified = true;
    return match.replace(importPath, `${importPath}.js`);
  });
  
  // Fix export statements
  const exportRegex = /export\s+\*\s+from\s+['"](\.[^'"]+)['"]/g;
  content = content.replace(exportRegex, (match, importPath) => {
    if (importPath.endsWith('.js') || importPath.endsWith('.json')) {
      return match;
    }
    
    modified = true;
    return match.replace(importPath, `${importPath}.js`);
  });
  
  if (modified) {
    await writeFile(filePath, content, 'utf-8');
    console.log(`✅ Fixed: ${filePath}`);
  }
}

async function main() {
  console.log('🔧 Fixing ESM import extensions...\n');
  
  const distDir = 'dist';
  let count = 0;
  
  for await (const file of walkDirectory(distDir)) {
    await fixImports(file);
    count++;
  }
  
  console.log(`\n✅ Processed ${count} files`);
}

main().catch(console.error);

