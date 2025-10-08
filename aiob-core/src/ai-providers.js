/**
 * AI Provider Interfaces
 * Standardized interfaces for different AI platforms
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import OpenRouterProvider from './providers/OpenRouterProvider.js';

// AI Capability definitions
export const AI_CAPABILITIES = {
  claude: ['reasoning', 'analysis', 'writing', 'architecture', 'planning'],
  gpt: ['coding', 'optimization', 'debugging', 'explanation', 'implementation'],
  openrouter: ['reasoning', 'coding', 'analysis', 'writing', 'architecture', 'implementation'],
  copilot: ['code_completion', 'implementation', 'patterns', 'testing'],
  cursor: ['refactoring', 'editing', 'file_operations', 'optimization'],
  warp: ['terminal', 'commands', 'system_ops', 'debugging']
};

/**
 * Base AI Provider interface
 */
export class AIProvider {
  constructor(name, capabilities = []) {
    this.name = name;
    this.capabilities = capabilities;
    this.isAvailable = false;
  }

  async initialize() {
    throw new Error('Initialize method must be implemented');
  }

  async sendMessage(context, prompt) {
    throw new Error('SendMessage method must be implemented');
  }

  canHandle(taskType) {
    return this.capabilities.some(cap => 
      taskType.toLowerCase().includes(cap.toLowerCase())
    );
  }
}

/**
 * Claude Provider (Anthropic)
 */
export class ClaudeProvider extends AIProvider {
  constructor(apiKey) {
    super('claude', AI_CAPABILITIES.claude);
    this.apiKey = apiKey;
    this.client = null;
  }

  async initialize() {
    try {
      if (!this.apiKey) {
        console.warn('Claude API key not provided');
        return false;
      }

      this.client = new Anthropic({
        apiKey: this.apiKey
      });

      // Test connection
      await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }]
      });

      this.isAvailable = true;
      console.log('✅ Claude provider initialized');
      return true;
    } catch (error) {
      console.warn(`❌ Claude provider failed: ${error.message}`);
      this.isAvailable = false;
      return false;
    }
  }

  async sendMessage(context, prompt) {
    if (!this.client || !this.isAvailable) {
      throw new Error('Claude provider not initialized');
    }

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [
          { role: 'user', content: `${context}\n\n${prompt}` }
        ]
      });

      return {
        content: response.content[0].text,
        provider: 'claude',
        tokens: response.usage?.input_tokens + response.usage?.output_tokens || 0
      };
    } catch (error) {
      console.error(`Claude API error: ${error.message}`);
      throw error;
    }
  }
}

/**
 * OpenAI Provider (GPT)
 */
export class OpenAIProvider extends AIProvider {
  constructor(apiKey) {
    super('gpt', AI_CAPABILITIES.gpt);
    this.apiKey = apiKey;
    this.client = null;
  }

  async initialize() {
    try {
      if (!this.apiKey) {
        console.warn('OpenAI API key not provided');
        return false;
      }

      this.client = new OpenAI({
        apiKey: this.apiKey
      });

      // Test connection
      await this.client.chat.completions.create({
        model: 'gpt-4',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }]
      });

      this.isAvailable = true;
      console.log('✅ OpenAI provider initialized');
      return true;
    } catch (error) {
      console.warn(`❌ OpenAI provider failed: ${error.message}`);
      this.isAvailable = false;
      return false;
    }
  }

  async sendMessage(context, prompt) {
    if (!this.client || !this.isAvailable) {
      throw new Error('OpenAI provider not initialized');
    }

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        max_tokens: 2000,
        messages: [
          { role: 'system', content: context },
          { role: 'user', content: prompt }
        ]
      });

      return {
        content: response.choices[0].message.content,
        provider: 'gpt',
        tokens: response.usage?.total_tokens || 0
      };
    } catch (error) {
      console.error(`OpenAI API error: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Mock Provider for testing
 */
export class MockAIProvider extends AIProvider {
  constructor(name, capabilities = []) {
    super(name, capabilities);
    this.responses = [];
    this.responseIndex = 0;
  }

  setMockResponses(responses) {
    this.responses = responses;
    this.responseIndex = 0;
  }

  async initialize() {
    this.isAvailable = true;
    console.log(`✅ Mock ${this.name} provider initialized`);
    return true;
  }

  async sendMessage(context, prompt) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    const response = this.responses[this.responseIndex] || 
      `Mock response from ${this.name} for: ${prompt.substring(0, 50)}...`;
    
    this.responseIndex = (this.responseIndex + 1) % (this.responses.length || 1);

    return {
      content: response,
      provider: this.name,
      tokens: response.length
    };
  }
}

/**
 * AI Provider Factory
 */
export class AIProviderFactory {
  static create(providerType, config = {}) {
    switch (providerType.toLowerCase()) {
      case 'claude':
        return new ClaudeProvider(config.apiKey);
      
      case 'openai':
      case 'gpt':
        return new OpenAIProvider(config.apiKey);
      
      case 'openrouter':
        return new OpenRouterProvider(config.apiKey);
      
      case 'mock':
        const provider = new MockAIProvider(config.name || 'mock', config.capabilities);
        if (config.responses) {
          provider.setMockResponses(config.responses);
        }
        return provider;
      
      default:
        throw new Error(`Unknown provider type: ${providerType}`);
    }
  }

  static createFromEnv() {
    const providers = [];

    // Claude
    if (process.env.ANTHROPIC_API_KEY) {
      providers.push(AIProviderFactory.create('claude', {
        apiKey: process.env.ANTHROPIC_API_KEY
      }));
    }

    // OpenAI
    if (process.env.OPENAI_API_KEY) {
      providers.push(AIProviderFactory.create('openai', {
        apiKey: process.env.OPENAI_API_KEY
      }));
    }

    // OpenRouter
    if (process.env.OPENROUTER_API_KEY) {
      providers.push(AIProviderFactory.create('openrouter', {
        apiKey: process.env.OPENROUTER_API_KEY
      }));
    }

    // If no real providers, add mocks for testing
    if (providers.length === 0) {
      console.log('No API keys found, using mock providers for testing');
      
      providers.push(
        AIProviderFactory.create('mock', {
          name: 'claude-mock',
          capabilities: AI_CAPABILITIES.claude,
          responses: [
            'I\'ll analyze this from an architectural perspective...',
            'Based on my reasoning, I recommend...',
            'The strategic approach would be...'
          ]
        })
      );

      providers.push(
        AIProviderFactory.create('mock', {
          name: 'gpt-mock',
          capabilities: AI_CAPABILITIES.gpt,
          responses: [
            'Here\'s the implementation code...',
            'I\'ve optimized the algorithm...',
            'The bug is in this function...'
          ]
        })
      );
    }

    return providers;
  }
}