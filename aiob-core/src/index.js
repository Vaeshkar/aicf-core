#!/usr/bin/env node

/**
 * AIOB - AI Operations Board
 * Main CLI interface for multi-AI orchestration
 */

import 'dotenv/config';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'fs/promises';
import path from 'path';

import { AIOrchestrator } from './orchestrator.js';
import { ProjectOrchestrator } from './project-orchestrator.js';
import { EnhancedProjectOrchestrator } from './enhanced-project-orchestrator.js';
import ProjectOrchestratorV3 from './project-orchestrator-v3.js';
import SimpleOrchestrator from './simple-orchestrator.js';
import { AIProviderFactory } from './ai-providers.js';
import { AICFContext } from './aicf-context.js';

const program = new Command();

// Global orchestrator instance
let orchestrator = null;

/**
 * Initialize AIOB with available providers
 */
async function initializeAIOB() {
  if (orchestrator) return orchestrator;

  const spinner = ora('Initializing AIOB...').start();
  
  try {
    // Create providers from environment
    const providers = AIProviderFactory.createFromEnv();
    
    // Create orchestrator
    orchestrator = new AIOrchestrator(providers);
    
    // Initialize all providers
    await orchestrator.initialize();
    
    spinner.succeed('AIOB initialized successfully!');
    return orchestrator;
    
  } catch (error) {
    spinner.fail(`Failed to initialize AIOB: ${error.message}`);
    throw error;
  }
}

/**
 * Display AIOB banner
 */
function showBanner() {
  console.log(chalk.cyan(`
╔═══════════════════════════════════════╗
║           AIOB v0.1.0                 ║
║     AI Operations Board               ║
║   Multi-AI Orchestration System      ║
╚═══════════════════════════════════════╝
  `));
}

/**
 * Start interactive session
 */
async function startSession(taskDescription) {
  try {
    const aiob = await initializeAIOB();
    
    // Load existing AICF context if available
    let context = null;
    const aicfPath = '.aicf/conversation-memory.aicf';
    
    try {
      context = await AICFContext.load(aicfPath);
      console.log(chalk.green('✅ Loaded existing AICF context'));
    } catch (error) {
      console.log(chalk.yellow('ℹ️  No existing context found, starting fresh'));
    }
    
    // If no task provided, prompt user
    let task = taskDescription;
    if (!task) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'task',
          message: 'What would you like the AIs to work on?',
          validate: input => input.length > 5 || 'Please provide a more detailed task description'
        }
      ]);
      task = answers.task;
    }
    
    console.log(chalk.blue(`\n🎯 Task: ${task}`));
    console.log(chalk.gray('='.repeat(60)));
    
    // Start orchestration
    const result = await aiob.orchestrateTask(task, context);
    
    // Display results
    console.log(chalk.gray('='.repeat(60)));
    console.log(chalk.green('\n📋 FINAL RESULT:'));
    console.log(result.summary);
    
    console.log(chalk.cyan('\n🤖 COLLABORATING AIs:'));
    result.collaborators.forEach((ai, i) => {
      console.log(`  ${i + 1}. ${ai}`);
    });
    
    console.log(chalk.gray(`\n📊 Total tokens used: ${result.totalTokens}`));
    
    // Save session
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sessionPath = `aiob-session-${timestamp}.aicf`;
    await aiob.saveSession(sessionPath);
    
    console.log(chalk.green(`\n💾 Session saved to: ${sessionPath}`));
    
  } catch (error) {
    console.error(chalk.red(`❌ Session failed: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Show orchestrator status
 */
async function showStatus() {
  try {
    const aiob = await initializeAIOB();
    const status = aiob.getStatus();
    
    console.log(chalk.cyan('\n📊 AIOB STATUS'));
    console.log(chalk.gray('-'.repeat(40)));
    console.log(`Active: ${status.isActive ? chalk.green('Yes') : chalk.yellow('No')}`);
    console.log(`Available Providers: ${status.availableProviders.length}/${status.totalProviders}`);
    console.log(`Sessions Completed: ${status.sessionsCompleted}`);
    
    console.log(chalk.cyan('\n🤖 AVAILABLE AIs:'));
    status.availableProviders.forEach(ai => {
      console.log(`  • ${chalk.bold(ai.name)}: ${ai.capabilities.join(', ')}`);
    });
    
  } catch (error) {
    console.error(chalk.red(`❌ Status check failed: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Build a real project from PRD
 */
async function buildProject(prdPath) {
  try {
    console.log(chalk.cyan('🚀 Starting AIOB Project Builder...'));
    
    // Initialize project orchestrator
    const providers = AIProviderFactory.createFromEnv();
    const orchestrator = new ProjectOrchestrator(providers);
    await orchestrator.initialize();
    
    // Build project from PRD
    const result = await orchestrator.buildProject(prdPath);
    
    console.log(chalk.green('\n🎉 PROJECT BUILD COMPLETE!'));
    console.log(chalk.cyan(`📁 Project: ${result.projectName}`));
    console.log(chalk.cyan(`📂 Location: ${result.projectDir}`));
    console.log(chalk.cyan(`📄 Files: ${result.totalFiles}`));
    console.log(chalk.cyan(`🤖 Phases: ${result.phases.length}`));
    console.log(chalk.cyan(`📊 Tokens: ${result.totalTokens}`));
    
  } catch (error) {
    console.error(chalk.red(`❌ Project build failed: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Show budget status for all providers
 */
async function showBudgetStatus() {
  try {
    const aiob = await initializeAIOB();
    const budgetStatus = aiob.getBudgetStatus();
    
    console.log(chalk.cyan('\n💰 BUDGET STATUS'));
    console.log(chalk.gray('-'.repeat(50)));
    
    Object.entries(budgetStatus).forEach(([provider, status]) => {
      const { budget, spent, remaining, percentUsed } = status;
      const color = percentUsed > 80 ? 'red' : percentUsed > 50 ? 'yellow' : 'green';
      
      console.log(`\n${chalk.bold(provider.toUpperCase())}:`);
      console.log(`  Budget:    €${budget.toFixed(2)}`);
      console.log(`  Spent:     €${spent.toFixed(2)}`);
      console.log(`  Remaining: €${remaining.toFixed(2)} (${chalk[color](`${(100 - percentUsed).toFixed(1)}% left`)})`);
      
      // Progress bar
      const barLength = 20;
      const filled = Math.round((percentUsed / 100) * barLength);
      const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
      console.log(`  Progress:  [${chalk[color](bar)}] ${percentUsed.toFixed(1)}%`);
    });
    
    const totalBudget = Object.values(budgetStatus).reduce((sum, s) => sum + s.budget, 0);
    const totalSpent = Object.values(budgetStatus).reduce((sum, s) => sum + s.spent, 0);
    const totalRemaining = totalBudget - totalSpent;
    
    console.log(chalk.cyan('\n📊 TOTAL:'));
    console.log(`  Budget:    €${totalBudget.toFixed(2)}`);
    console.log(`  Spent:     €${totalSpent.toFixed(2)}`);
    console.log(`  Remaining: €${totalRemaining.toFixed(2)}`);
    
  } catch (error) {
    console.error(chalk.red(`❌ Budget check failed: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Build project with enhanced AIOB system
 */
async function buildEnhancedProject(prdPath) {
  try {
    console.log(chalk.cyan('🚀 Starting Enhanced AIOB Project Builder...'));
    console.log(chalk.blue('✨ Features: JSON validation, deduplication, phase coordination\n'));
    
    // Initialize enhanced project orchestrator
    const providers = AIProviderFactory.createFromEnv();
    const orchestrator = new EnhancedProjectOrchestrator(providers);
    await orchestrator.initialize();
    
    // Build project with enhanced system
    const result = await orchestrator.buildProject(prdPath);
    
    console.log(chalk.green('\n🎉 ENHANCED PROJECT BUILD COMPLETE!'));
    console.log(chalk.cyan(`📁 Project: ${result.projectName}`));
    console.log(chalk.cyan(`📂 Location: ${result.projectDir}`));
    console.log(chalk.cyan(`📄 Files: ${result.totalFiles} (${result.duplicatesSkipped} duplicates prevented)`));
    console.log(chalk.cyan(`🤖 Phases: ${result.phases.length}`));
    console.log(chalk.cyan(`📊 Tokens: ${result.totalTokens}`));
    console.log(chalk.cyan(`⏱️  Build Time: ${result.buildTime}`));
    
    if (result.validation.passed) {
      console.log(chalk.green('✅ All validation checks passed'));
    } else {
      console.log(chalk.yellow(`⚠️  Validation issues: ${result.validation.issues.length}`));
      result.validation.issues.forEach(issue => {
        console.log(chalk.yellow(`  - ${issue}`));
      });
    }
    
    if (result.issues.length > 0) {
      console.log(chalk.red(`\n❌ Build issues encountered:`));
      result.issues.forEach(issue => {
        console.log(chalk.red(`  - ${issue.message}`));
      });
    }
    
  } catch (error) {
    console.error(chalk.red(`❌ Enhanced project build failed: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Build project with Simple AIOB v2.0 (back to basics)
 */
async function buildSimpleProject(prdPath) {
  try {
    console.log(chalk.cyan('🚀 AIOB v2.0 - SIMPLE & EFFECTIVE'));
    console.log(chalk.blue('✨ Features: Clean architecture, modern models, proven workflow\n'));
    
    // Initialize simple orchestrator
    const providers = AIProviderFactory.createFromEnv();
    const orchestrator = new SimpleOrchestrator(providers);
    
    // Build project with simple approach
    const result = await orchestrator.buildProject(prdPath);
    
    console.log('\n' + '═'.repeat(80));
    console.log(chalk.green('🎉 AIOB v2.0 SIMPLE BUILD COMPLETE!'));
    console.log('═'.repeat(80));
    console.log(chalk.cyan(`📁 Project: ${result.projectName}`));
    console.log(chalk.cyan(`📂 Location: ${result.projectDir}`));
    console.log(chalk.cyan(`📄 Files Created: ${result.totalFiles}`));
    console.log(chalk.cyan(`🤖 Build Phases: ${result.phases.length}`));
    
    console.log(chalk.green('\n✅ PROJECT READY!'));
    console.log(chalk.green('\nTo run your app:'));
    console.log(chalk.white(`  cd ${path.basename(result.projectDir)}`));
    console.log(chalk.white('  npm install'));
    console.log(chalk.white('  npm start'));
    
    console.log(chalk.gray(`\n📄 Build summary: ${result.projectDir}/BUILD_SUMMARY.md`));
    console.log('═'.repeat(80) + '\n');
    
  } catch (error) {
    console.error(chalk.red(`❌ Simple build failed: ${error.message}`));
    console.error(chalk.red('Stack trace:'), error.stack);
    process.exit(1);
  }
}

/**
 * Build project with Enhanced AIOB v3 (specialized agents)
 */
async function buildProjectV3(prdPath) {
  try {
    console.log(chalk.cyan('🏗️  ENHANCED AIOB v3.0 - SPECIALIZED AGENTS'));
    console.log(chalk.blue('✨ Features: Specialized AI roles, file persistence, real validation\n'));
    
    // Initialize v3 project orchestrator
    const providers = AIProviderFactory.createFromEnv();
    const orchestrator = new ProjectOrchestratorV3(providers);
    
    // Build project with specialized agents
    const result = await orchestrator.buildFromPRD(prdPath);
    
    console.log('\n' + '═'.repeat(80));
    console.log(chalk.green('🎉 ENHANCED AIOB v3.0 BUILD COMPLETE!'));
    console.log('═'.repeat(80));
    console.log(chalk.cyan(`📁 Project: ${result.projectName}`));
    console.log(chalk.cyan(`📂 Location: ${result.projectDir}`));
    console.log(chalk.cyan(`📄 Files Created: ${result.summary.totalFiles}`));
    console.log(chalk.cyan(`🤖 Specialized Phases: ${result.summary.totalPhases}`));
    console.log(chalk.cyan(`📊 Quality Score: ${result.summary.qualityScore}/100`));
    console.log(chalk.cyan(`⚠️  Critical Issues: ${result.summary.criticalIssues}`));
    
    if (result.success) {
      console.log(chalk.green('\n✅ APPLICATION IS READY TO USE!'));
      console.log(chalk.green('\nTo run your app:'));
      console.log(chalk.white(`  cd ${path.basename(result.projectDir)}`));
      console.log(chalk.white('  npm install'));
      console.log(chalk.white('  npm start'));
    } else {
      console.log(chalk.yellow('\n⚠️  APPLICATION NEEDS FIXES BEFORE RUNNING'));
      console.log(chalk.yellow('\nCheck BUILD_SUMMARY.md for detailed issues and fixes needed.'));
    }
    
    console.log(chalk.gray(`\n📄 Detailed report: ${result.projectDir}/BUILD_SUMMARY.md`));
    console.log('═'.repeat(80) + '\n');
    
  } catch (error) {
    console.error(chalk.red(`❌ Enhanced v3 project build failed: ${error.message}`));
    console.error(chalk.red('Stack trace:'), error.stack);
    process.exit(1);
  }
}

/**
 * Run demo scenarios
 */
async function runDemo() {
  console.log(chalk.cyan('\n🎭 AIOB DEMO MODE'));
  console.log(chalk.gray('Running predefined scenarios...\n'));
  
  const scenarios = [
    {
      name: 'Code Review',
      task: 'Review this React component for performance issues and suggest optimizations'
    },
    {
      name: 'System Design',
      task: 'Design a scalable authentication system for a web application'
    },
    {
      name: 'Bug Analysis',
      task: 'Debug why my Node.js server is crashing under high load'
    }
  ];
  
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'scenario',
      message: 'Choose a demo scenario:',
      choices: scenarios.map(s => s.name)
    }
  ]);
  
  const selectedScenario = scenarios.find(s => s.name === answers.scenario);
  
  console.log(chalk.blue(`\n🎬 Running scenario: ${selectedScenario.name}`));
  await startSession(selectedScenario.task);
}

// CLI Commands
program
  .name('aiob')
  .description('AI Operations Board - Multi-AI Orchestration System')
  .version('0.1.0');

program
  .command('start')
  .description('Start an interactive AI orchestration session')
  .argument('[task]', 'Task description for AIs to work on')
  .action(async (task) => {
    showBanner();
    await startSession(task);
  });

program
  .command('status')
  .description('Show AIOB orchestrator status')
  .action(async () => {
    showBanner();
    await showStatus();
  });

program
  .command('demo')
  .description('Run predefined demo scenarios')
  .action(async () => {
    showBanner();
    await runDemo();
  });

program
  .command('build')
  .description('Build a real project from PRD')
  .argument('<prd-file>', 'Path to Product Requirements Document (.md file)')
  .action(async (prdFile) => {
    showBanner();
    await buildProject(prdFile);
  });

program
  .command('enhanced-build')
  .description('Build project with enhanced AIOB (fixes JSON/structure issues)')
  .argument('<prd-file>', 'Path to Product Requirements Document (.md file)')
  .action(async (prdFile) => {
    showBanner();
    await buildEnhancedProject(prdFile);
  });

program
  .command('simple-build')
  .description('Build project with Simple AIOB v2.0 (back to basics - proven approach)')
  .argument('<prd-file>', 'Path to Product Requirements Document (.md file)')
  .action(async (prdFile) => {
    showBanner();
    await buildSimpleProject(prdFile);
  });

program
  .command('v3-build')
  .description('Build project with Enhanced AIOB v3.0 (specialized AI agents + real validation)')
  .argument('<prd-file>', 'Path to Product Requirements Document (.md file)')
  .action(async (prdFile) => {
    showBanner();
    await buildProjectV3(prdFile);
  });

program
  .command('budget')
  .description('Show API budget status and usage')
  .action(async () => {
    showBanner();
    await showBudgetStatus();
  });

program
  .command('init')
  .description('Initialize AIOB in current directory')
  .action(async () => {
    console.log(chalk.cyan('🚀 Initializing AIOB in current directory...'));
    
    // Create .aicf directory if it doesn't exist
    try {
      await fs.mkdir('.aicf', { recursive: true });
      
      // Create example environment file
      const envContent = `# AIOB Environment Configuration\n# Copy this to .env and add your API keys\n\n# Anthropic Claude\nANTHROPIC_API_KEY=your_claude_api_key_here\n\n# OpenAI GPT\nOPENAI_API_KEY=your_openai_api_key_here\n\n# Optional: Specific model preferences\n# CLAUDE_MODEL=claude-3-5-sonnet-20241022\n# OPENAI_MODEL=gpt-4\n`;
      
      await fs.writeFile('.env.example', envContent);
      
      // Create basic AICF context file
      const aicfContent = `@CONVERSATION:aiob_init\ntimestamp_start=${new Date().toISOString()}\n\n@FLOW\nuser_initialized_aiob|ready_for_ai_collaboration\n\n@STATE\nstatus=initialized\n`;
      
      await fs.writeFile('.aicf/conversation-memory.aicf', aicfContent);
      
      console.log(chalk.green('✅ AIOB initialized successfully!'));
      console.log(chalk.yellow('\n📋 Next steps:'));
      console.log('1. Copy .env.example to .env');
      console.log('2. Add your API keys to .env');
      console.log('3. Run: aiob start');
      
    } catch (error) {
      console.error(chalk.red(`❌ Initialization failed: ${error.message}`));
      process.exit(1);
    }
  });

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('\n❌ Unhandled error:'), error.message);
  process.exit(1);
});

// Parse CLI arguments
program.parse();

// If no command provided, show help
if (process.argv.length === 2) {
  showBanner();
  program.help();
}
