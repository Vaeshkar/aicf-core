// Import fetch for Node.js compatibility
import fetch from 'node-fetch';

class OpenRouterProvider {
    constructor(apiKey, baseURL = 'https://openrouter.ai/api/v1') {
        this.name = 'openrouter';
        this.capabilities = ['reasoning', 'coding', 'analysis', 'writing', 'architecture', 'implementation'];
        this.apiKey = apiKey;
        this.baseURL = baseURL;
        this.models = {
            'anthropic/claude-3.5-sonnet': { cost: 0.003, context: 200000 },
            'openai/gpt-4': { cost: 0.005, context: 128000 },
            'meta-llama/llama-3.1-405b-instruct': { cost: 0.002, context: 128000 },
            'qwen/qwen-2.5-72b-instruct': { cost: 0.0008, context: 32768 }
        };
        this.totalCost = 0;
        this.isAvailable = false;
    }

    async initialize() {
        try {
            if (!this.apiKey) {
                console.warn('OpenRouter API key not provided');
                return false;
            }

            // Test connection with a minimal request
            await this.generateResponse('Hello', { maxTokens: 10 });

            this.isAvailable = true;
            console.log('✅ OpenRouter provider initialized');
            return true;
        } catch (error) {
            console.warn(`❌ OpenRouter provider failed: ${error.message}`);
            this.isAvailable = false;
            return false;
        }
    }

    async generateResponse(prompt, options = {}) {
        const model = options.model || this.preferredModel || 'anthropic/claude-3.5-sonnet';
        
        try {
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://aiob-core.local',
                    'X-Title': 'AIOB Core System'
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: options.maxTokens || 4000,
                    temperature: options.temperature || 0.7
                })
            });

            if (!response.ok) {
                throw new Error(`OpenRouter API error: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;
            
            // Track costs
            const usage = data.usage;
            if (usage) {
                const modelCost = this.models[model]?.cost || 0.003;
                const cost = (usage.prompt_tokens + usage.completion_tokens) * modelCost / 1000;
                this.totalCost += cost;
                console.log(`OpenRouter ${model} cost: $${cost.toFixed(4)} (Total: $${this.totalCost.toFixed(4)})`);
            }

            return {
                content: content || 'No response generated',
                model: model,
                provider: 'openrouter',
                usage: usage,
                cost: this.totalCost
            };
        } catch (error) {
            console.error('OpenRouter API Error:', error);
            return {
                content: `Error: ${error.message}`,
                model: model,
                provider: 'openrouter',
                error: true
            };
        }
    }

    getCost() {
        return this.totalCost;
    }

    resetCost() {
        this.totalCost = 0;
    }

    // AIOB interface method
    async sendMessage(context, prompt) {
        if (!this.isAvailable) {
            throw new Error('OpenRouter provider not initialized');
        }

        const fullPrompt = `${context}\n\n${prompt}`;
        const result = await this.generateResponse(fullPrompt);
        
        return {
            content: result.content,
            provider: 'openrouter',
            tokens: result.usage?.prompt_tokens + result.usage?.completion_tokens || 0
        };
    }
}

export default OpenRouterProvider;
