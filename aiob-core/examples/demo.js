#!/usr/bin/env node

/**
 * AIOB Demo
 * Example showing AI orchestration in action
 */

import 'dotenv/config';
import { AIOrchestrator } from '../src/orchestrator.js';
import { AIProviderFactory } from '../src/ai-providers.js';
import { AICFContext } from '../src/aicf-context.js';
import chalk from 'chalk';

console.log(chalk.cyan(`
╔═══════════════════════════════════════╗
║        AIOB DEMO v0.1.0               ║
║   Multi-AI Orchestration Example     ║
╚═══════════════════════════════════════╝
`));

async function runDemo() {
  try {
    console.log(chalk.yellow('🔧 Setting up mock AI providers for demo...'));
    
    // Create mock providers with realistic responses
    const claudeProvider = AIProviderFactory.create('mock', {
      name: 'claude-mock',
      capabilities: ['reasoning', 'analysis', 'writing', 'architecture', 'planning'],
      responses: [
        `I'll analyze this from an architectural perspective.

For a scalable authentication system, I recommend a microservices approach:

1. **Auth Service**: Handles login/logout, token generation
2. **User Service**: Manages user profiles and permissions  
3. **Session Service**: Manages active sessions and token validation

Key architectural decisions:
- Use JWT tokens with refresh token rotation
- Implement OAuth 2.0 for third-party integrations
- Redis for session storage (fast, scalable)
- Rate limiting to prevent brute force attacks
- Multi-factor authentication support

This provides scalability, security, and maintainability.`,

        `Based on my analysis, the performance bottlenecks are likely:

1. **Database connections**: Connection pooling not configured
2. **Memory leaks**: Event listeners not being cleaned up
3. **Blocking operations**: Synchronous file I/O in request handlers
4. **Resource exhaustion**: No proper request queuing

The system architecture needs better separation of concerns and proper async handling.`,

        `From a strategic perspective, this React component has several optimization opportunities:

1. **Unnecessary re-renders**: Missing React.memo and proper dependency arrays
2. **Bundle size**: Large dependencies that could be lazy-loaded
3. **State management**: Overuse of useState causing cascading updates
4. **Event handling**: New function instances created on every render

The overall pattern suggests a need for better component composition and state architecture.`
      ]
    });

    const gptProvider = AIProviderFactory.create('mock', {
      name: 'gpt-mock', 
      capabilities: ['coding', 'optimization', 'debugging', 'explanation', 'implementation'],
      responses: [
        `Here's the implementation for the authentication system:

\`\`\`javascript
// auth-service/src/index.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');

const app = express();

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, try again later'
});

// Login endpoint
app.post('/auth/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await User.findByEmail(email);
    if (!user || !await bcrypt.compare(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ accessToken, refreshToken });
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed' });
  }
});
\`\`\`

This implementation includes proper error handling, rate limiting, and secure token generation.`,

        `Here's the fix for the Node.js server crashes:

\`\`\`javascript
// server.js optimizations
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    console.log(\`Worker \${worker.process.pid} died\`);
    cluster.fork(); // Restart crashed workers
  });
} else {
  // Worker process
  const app = require('./app');
  
  // Connection pooling
  const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    max: 20, // max number of clients
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000
  });
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    server.close(() => {
      pool.end(() => {
        process.exit(0);
      });
    });
  });
  
  const server = app.listen(process.env.PORT || 3000);
}
\`\`\`

Key fixes:
1. Cluster mode for CPU utilization
2. Connection pooling to prevent DB exhaustion  
3. Graceful shutdown handling
4. Worker restart on crashes`,

        `Optimized React component:

\`\`\`javascript
import React, { memo, useMemo, useCallback } from 'react';

// Memoized child component
const ExpensiveChild = memo(({ data, onUpdate }) => {
  const processedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      computed: heavyCalculation(item.value)
    }));
  }, [data]);
  
  return (
    <div>
      {processedData.map(item => (
        <div key={item.id} onClick={() => onUpdate(item.id)}>
          {item.computed}
        </div>
      ))}
    </div>
  );
});

// Main component with optimizations
const OptimizedComponent = memo(({ items, onItemClick }) => {
  // Memoized callback to prevent child re-renders
  const handleUpdate = useCallback((id) => {
    onItemClick(id);
  }, [onItemClick]);
  
  // Memoized expensive computation
  const filteredItems = useMemo(() => 
    items.filter(item => item.isActive), 
    [items]
  );
  
  return (
    <ExpensiveChild 
      data={filteredItems}
      onUpdate={handleUpdate}
    />
  );
});

export default OptimizedComponent;
\`\`\`

Optimizations applied:
1. React.memo prevents unnecessary re-renders
2. useMemo caches expensive calculations
3. useCallback stabilizes function references
4. Proper dependency arrays`
      ]
    });

    // Create orchestrator
    const orchestrator = new AIOrchestrator([claudeProvider, gptProvider]);
    await orchestrator.initialize();

    console.log(chalk.green('✅ Demo providers ready!'));
    
    // Demo scenarios
    const scenarios = [
      {
        name: 'System Design',
        task: 'Design a scalable authentication system for a web application',
        description: 'Watch Claude design the architecture, then GPT implement it'
      },
      {
        name: 'Performance Debugging', 
        task: 'Debug why my Node.js server is crashing under high load',
        description: 'See Claude analyze the issue, then GPT provide the fix'
      },
      {
        name: 'Code Optimization',
        task: 'Review this React component for performance issues and suggest optimizations',
        description: 'Claude identifies problems, GPT implements solutions'
      }
    ];

    console.log(chalk.cyan('\n🎭 DEMO SCENARIOS AVAILABLE:'));
    scenarios.forEach((scenario, i) => {
      console.log(`${i + 1}. ${chalk.bold(scenario.name)}: ${scenario.description}`);
    });

    // Run all scenarios
    for (const scenario of scenarios) {
      console.log(chalk.blue(`\n${'='.repeat(80)}`));
      console.log(chalk.blue(`🎬 DEMO: ${scenario.name.toUpperCase()}`));
      console.log(chalk.blue(`${'='.repeat(80)}`));
      
      // Add delay for dramatic effect
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const result = await orchestrator.orchestrateTask(scenario.task);
      
      console.log(chalk.green('\n📋 COLLABORATIVE RESULT:'));
      console.log(chalk.gray('-'.repeat(60)));
      console.log(result.summary);
      
      console.log(chalk.cyan(`\n🤖 AIs that collaborated: ${result.collaborators.join(', ')}`));
      console.log(chalk.gray(`📊 Total tokens: ${result.totalTokens}`));
      
      // Save demo result
      const timestamp = Date.now();
      await orchestrator.saveSession(`demo-${scenario.name.toLowerCase().replace(/\\s+/g, '-')}-${timestamp}.aicf`);
      
      console.log(chalk.yellow('\n⏳ Next demo in 3 seconds...'));
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.log(chalk.green(`\n${'='.repeat(80)}`));
    console.log(chalk.green('🎉 AIOB DEMO COMPLETE!'));
    console.log(chalk.green(`${'='.repeat(80)}`));
    
    console.log(chalk.cyan('\n✨ What you just saw:'));
    console.log('• Multiple AIs collaborating automatically');
    console.log('• Intelligent task routing based on AI capabilities');
    console.log('• Context sharing via AICF format');
    console.log('• Combined results better than single AI could produce');
    
    console.log(chalk.yellow('\n🚀 Ready to use with real AIs:'));
    console.log('1. Add your API keys to .env file');
    console.log('2. Run: node src/index.js start');
    console.log('3. Watch Claude, GPT, and others collaborate!');

  } catch (error) {
    console.error(chalk.red(`❌ Demo failed: ${error.message}`));
    process.exit(1);
  }
}

// Run the demo
runDemo();