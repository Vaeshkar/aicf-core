/**
 * AIOB Orchestrator
 * Core AI-to-AI coordination engine with intelligent task routing
 */

import { AICFContext, AICFContextManager } from './aicf-context.js';
import { AI_CAPABILITIES } from './ai-providers.js';

export class AIOrchestrator {
  constructor(providers = []) {
    this.providers = new Map();
    this.contextManager = new AICFContextManager();
    this.sessionHistory = [];
    this.isActive = false;
    
    // Budget tracking
    this.budgets = {
      claude: 8.0,  // €8
      openai: 5.0,  // €5  
      openrouter: 10.0  // €10
    };
    this.totalSpent = {
      claude: 0,
      openai: 0,
      openrouter: 0
    };

    // Register providers
    providers.forEach(provider => this.addProvider(provider));
  }

  /**
   * Add AI provider to orchestrator
   */
  addProvider(provider) {
    this.providers.set(provider.name, provider);
    console.log(`🤖 Registered ${provider.name} with capabilities: ${provider.capabilities.join(', ')}`);
  }

  /**
   * Initialize all providers
   */
  async initialize() {
    console.log('🚀 Initializing AIOB Orchestrator...');
    
    const initPromises = Array.from(this.providers.values())
      .map(provider => provider.initialize());
    
    const results = await Promise.allSettled(initPromises);
    
    const availableProviders = Array.from(this.providers.values())
      .filter(provider => provider.isAvailable);
    
    console.log(`✅ AIOB ready with ${availableProviders.length} AI providers`);
    
    if (availableProviders.length === 0) {
      throw new Error('No AI providers available. Please check your API keys.');
    }
    
    return availableProviders.length;
  }

  /**
   * Analyze task and determine execution plan
   */
  createExecutionPlan(task) {
    const taskLower = task.toLowerCase();
    const steps = [];

    // Analyze task type and create execution plan
    if (taskLower.includes('build') || taskLower.includes('create') || taskLower.includes('develop')) {
      // Development workflow
      steps.push({
        type: 'architecture',
        description: 'Design system architecture',
        requiredCapabilities: ['architecture', 'planning', 'reasoning']
      });
      
      steps.push({
        type: 'implementation', 
        description: 'Generate implementation code',
        requiredCapabilities: ['coding', 'implementation']
      });
      
      steps.push({
        type: 'review',
        description: 'Review and optimize code',
        requiredCapabilities: ['debugging', 'optimization']
      });
    } 
    else if (taskLower.includes('analyze') || taskLower.includes('review')) {
      // Analysis workflow
      steps.push({
        type: 'analysis',
        description: 'Perform detailed analysis',
        requiredCapabilities: ['analysis', 'reasoning']
      });
      
      steps.push({
        type: 'insights',
        description: 'Generate insights and recommendations',
        requiredCapabilities: ['reasoning', 'writing']
      });
    }
    else if (taskLower.includes('debug') || taskLower.includes('fix')) {
      // Debugging workflow
      steps.push({
        type: 'diagnosis',
        description: 'Diagnose the issue',
        requiredCapabilities: ['debugging', 'analysis']
      });
      
      steps.push({
        type: 'solution',
        description: 'Implement solution',
        requiredCapabilities: ['coding', 'implementation']
      });
    }
    else {
      // Generic workflow
      steps.push({
        type: 'general',
        description: 'Process request',
        requiredCapabilities: ['reasoning']
      });
    }

    return steps;
  }

  /**
   * Select best AI for specific requirements
   */
  selectBestAI(requiredCapabilities) {
    const availableProviders = Array.from(this.providers.values())
      .filter(provider => provider.isAvailable);

    if (availableProviders.length === 0) {
      throw new Error('No available AI providers');
    }

    // Score each provider based on capability match
    const scores = availableProviders.map(provider => {
      const matchScore = requiredCapabilities.reduce((score, reqCap) => {
        return score + (provider.capabilities.includes(reqCap) ? 1 : 0);
      }, 0);
      
      return {
        provider,
        score: matchScore / requiredCapabilities.length
      };
    });

    // Sort by score (highest first)
    scores.sort((a, b) => b.score - a.score);
    
    const bestProvider = scores[0].provider;
    console.log(`🎯 Selected ${bestProvider.name} (score: ${scores[0].score.toFixed(2)}) for capabilities: ${requiredCapabilities.join(', ')}`);
    
    return bestProvider;
  }

  /**
   * Orchestrate task across multiple AIs
   */
  async orchestrateTask(task, context = null) {
    console.log(`\n🎬 Starting orchestration for: "${task}"`);
    this.isActive = true;

    try {
      // Load or create context
      const workingContext = context || new AICFContext();
      
      // Create execution plan
      const executionPlan = this.createExecutionPlan(task);
      console.log(`📋 Execution plan: ${executionPlan.length} steps`);

      const results = [];
      
      for (let i = 0; i < executionPlan.length; i++) {
        const step = executionPlan[i];
        console.log(`\n⚡ Step ${i + 1}: ${step.description}`);
        
        // Select best AI for this step
        const selectedAI = this.selectBestAI(step.requiredCapabilities);
        
        // Prepare context for AI
        const aiContext = this.contextManager.prepareContext(
          workingContext, 
          selectedAI.name, 
          selectedAI.capabilities
        );
        
        // Create step-specific prompt
        const stepPrompt = this.createStepPrompt(task, step, results);
        
        // Execute step
        console.log(`🤖 ${selectedAI.name} is working...`);
        const stepResult = await selectedAI.sendMessage(aiContext, stepPrompt);
        
        // Log result
        console.log(`✅ ${selectedAI.name} completed step ${i + 1}`);
        console.log(`📊 Tokens used: ${stepResult.tokens}`);
        
        // Store result
        const enrichedResult = {
          step: i + 1,
          type: step.type,
          ai: selectedAI.name,
          content: stepResult.content,
          tokens: stepResult.tokens,
          timestamp: new Date().toISOString()
        };
        
        results.push(enrichedResult);
        
        // Update context with result
        workingContext.update(selectedAI.name, stepResult.content, {
          insights: [step.description],
          state: { currentStep: i + 1, totalSteps: executionPlan.length }
        });

        // Save intermediate progress
        this.sessionHistory.push(enrichedResult);
      }

      // Generate final result
      const finalResult = await this.generateFinalResult(task, results, workingContext);
      
      console.log(`\n🎉 Orchestration complete! ${results.length} AIs collaborated.`);
      return finalResult;

    } catch (error) {
      console.error(`❌ Orchestration failed: ${error.message}`);
      throw error;
    } finally {
      this.isActive = false;
    }
  }

  /**
   * Create step-specific prompt
   */
  createStepPrompt(originalTask, step, previousResults) {
    let prompt = `Task: ${originalTask}\n\nYour role in this step: ${step.description}\n\n`;
    
    if (previousResults.length > 0) {
      prompt += `Previous work completed by other AIs:\n`;
      previousResults.forEach((result, index) => {
        prompt += `${index + 1}. ${result.ai} (${result.type}): ${result.content.substring(0, 200)}...\n\n`;
      });
    }
    
    prompt += `Please provide your contribution to complete this step of the overall task.`;
    
    return prompt;
  }

  /**
   * Generate final consolidated result
   */
  async generateFinalResult(task, results, context) {
    // Try to get the best "writing" AI to summarize
    const summarizerAI = this.selectBestAI(['writing', 'reasoning']);
    
    const summaryPrompt = `
Task: ${task}

Multiple AIs have collaborated on this task. Please provide a comprehensive final result that integrates all their contributions:

${results.map((result, i) => 
  `${i + 1}. ${result.ai} (${result.type}):\n${result.content}\n`
).join('\n')}

Please synthesize this into a coherent, actionable final result.
`;

    const aiContext = this.contextManager.prepareContext(
      context,
      summarizerAI.name,
      summarizerAI.capabilities
    );

    console.log(`\n📝 ${summarizerAI.name} is creating final summary...`);
    const summary = await summarizerAI.sendMessage(aiContext, summaryPrompt);

    return {
      task,
      summary: summary.content,
      collaborators: results.map(r => r.ai),
      steps: results,
      totalTokens: results.reduce((sum, r) => sum + r.tokens, 0) + summary.tokens,
      timestamp: new Date().toISOString(),
      aicfContext: context.toAICF()
    };
  }

  /**
   * Check if budget allows for API calls
   */
  checkBudget(providerName, estimatedCost = 0.01) {
    const provider = providerName.toLowerCase();
    const spent = this.totalSpent[provider] || 0;
    const budget = this.budgets[provider] || 0;
    const remaining = budget - spent;
    
    if (remaining <= 0) {
      console.warn(`⚠️  Budget exhausted for ${provider}: €${spent.toFixed(2)}/€${budget}`);
      return false;
    }
    
    if (remaining < estimatedCost) {
      console.warn(`⚠️  Low budget for ${provider}: €${remaining.toFixed(2)} remaining`);
      return false;
    }
    
    if (remaining < budget * 0.1) {
      console.warn(`⚠️  Budget running low for ${provider}: €${remaining.toFixed(2)} remaining`);
    }
    
    return true;
  }

  /**
   * Track spending for a provider
   */
  trackSpending(providerName, cost) {
    const provider = providerName.toLowerCase();
    this.totalSpent[provider] = (this.totalSpent[provider] || 0) + cost;
    const remaining = this.budgets[provider] - this.totalSpent[provider];
    console.log(`💰 ${provider} cost: €${cost.toFixed(4)} (Remaining: €${remaining.toFixed(2)})`);
  }

  /**
   * Get budget status
   */
  getBudgetStatus() {
    const status = {};
    Object.keys(this.budgets).forEach(provider => {
      const spent = this.totalSpent[provider] || 0;
      const budget = this.budgets[provider];
      status[provider] = {
        budget,
        spent,
        remaining: budget - spent,
        percentUsed: (spent / budget) * 100
      };
    });
    return status;
  }

  /**
   * Get orchestrator status
   */
  getStatus() {
    const availableProviders = Array.from(this.providers.values())
      .filter(p => p.isAvailable)
      .map(p => ({ name: p.name, capabilities: p.capabilities }));

    return {
      isActive: this.isActive,
      totalProviders: this.providers.size,
      availableProviders,
      sessionsCompleted: this.sessionHistory.length
    };
  }

  /**
   * Save session history to AICF
   */
  async saveSession(outputPath) {
    if (this.sessionHistory.length === 0) {
      console.warn('No session history to save');
      return;
    }

    const context = new AICFContext();
    
    this.sessionHistory.forEach(result => {
      context.update(result.ai, result.content, {
        insights: [`Completed ${result.type} step`],
        decisions: [`Used ${result.ai} for ${result.type}`],
        state: { step: result.step, tokens: result.tokens }
      });
    });

    await context.save(outputPath);
    console.log(`💾 Session saved to ${outputPath}`);
  }
}