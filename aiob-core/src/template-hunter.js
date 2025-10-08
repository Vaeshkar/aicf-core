/**
 * Template Hunter - Discovers and evaluates templates from external sources
 * Transforms AIOB into a learning member of the AI development ecosystem
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

export class TemplateHunter {
  constructor() {
    this.sources = [
      {
        name: 'aitmpl.com',
        url: 'https://www.aitmpl.com',
        type: 'ai_templates',
        priority: 1
      },
      {
        name: 'github-templates',
        url: 'https://api.github.com',
        type: 'github_repos',
        priority: 2
      },
      {
        name: 'local-cache',
        url: './templates/cache',
        type: 'local_filesystem',
        priority: 3
      }
    ];
    
    this.cache = new Map();
    this.cacheDir = './templates/cache';
    this.qualityThreshold = 0.5; // Lowered for testing
  }

  /**
   * Discover templates matching project requirements
   */
  async discoverTemplates(projectAnalysis) {
    console.log('🔍 Hunting for templates matching your project...');
    
    const searchCriteria = this.buildSearchCriteria(projectAnalysis);
    const templateCandidates = [];

    // Search all sources in parallel
    const searchPromises = this.sources.map(source => 
      this.searchSource(source, searchCriteria)
    );

    const results = await Promise.allSettled(searchPromises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        templateCandidates.push(...result.value);
        console.log(`✅ Found ${result.value.length} templates from ${this.sources[index].name}`);
      } else {
        console.log(`⚠️  ${this.sources[index].name} search failed: ${result.reason}`);
      }
    });

    // Evaluate and rank templates
    const evaluatedTemplates = await this.evaluateTemplates(templateCandidates, searchCriteria);
    
    // Return top matches
    const topTemplates = evaluatedTemplates
      .filter(t => t.qualityScore > this.qualityThreshold)
      .slice(0, 5);

    console.log(`🎯 Selected ${topTemplates.length} high-quality templates`);
    return topTemplates;
  }

  /**
   * Build search criteria from project analysis
   */
  buildSearchCriteria(analysis) {
    return {
      projectType: analysis.projectType.type,
      primaryTech: this.extractPrimaryTech(analysis.techStack),
      complexity: analysis.complexity.level,
      features: this.extractFeatures(analysis),
      keywords: this.generateKeywords(analysis)
    };
  }

  /**
   * Extract primary technology stack
   */
  extractPrimaryTech(techStack) {
    const primary = {};
    
    Object.entries(techStack).forEach(([category, techs]) => {
      if (techs.length > 0) {
        primary[category] = techs[0].name;
      }
    });
    
    return primary;
  }

  /**
   * Extract key features from analysis
   */
  extractFeatures(analysis) {
    const features = [];
    
    // Add common features based on project type
    const typeFeatures = {
      fullStackApp: ['api', 'database', 'frontend', 'backend'],
      singlePageApp: ['spa', 'frontend', 'responsive'],
      mobileApp: ['mobile', 'touch', 'responsive'],
      apiOnly: ['rest', 'api', 'backend']
    };
    
    if (typeFeatures[analysis.projectType.type]) {
      features.push(...typeFeatures[analysis.projectType.type]);
    }
    
    // Add complexity-based features
    if (analysis.complexity.level === 'enterprise') {
      features.push('scalable', 'production', 'testing');
    }
    
    return features;
  }

  /**
   * Generate search keywords
   */
  generateKeywords(analysis) {
    const keywords = [];
    
    // Add project type keywords
    keywords.push(analysis.projectType.type);
    
    // Add tech stack keywords
    Object.values(analysis.techStack).flat().forEach(tech => {
      keywords.push(tech.name);
    });
    
    // Add complexity keywords
    keywords.push(analysis.complexity.level);
    
    return keywords.filter((k, i, arr) => arr.indexOf(k) === i); // Unique
  }

  /**
   * Search a specific template source
   */
  async searchSource(source, criteria) {
    switch (source.type) {
      case 'ai_templates':
        return await this.searchAITemplates(source, criteria);
      case 'github_repos':
        return await this.searchGitHubTemplates(source, criteria);
      case 'local_filesystem':
        return await this.searchLocalTemplates(source, criteria);
      default:
        console.warn(`Unknown source type: ${source.type}`);
        return [];
    }
  }

  /**
   * Search AI template repositories like aitmpl.com
   */
  async searchAITemplates(source, criteria) {
    try {
      // For now, simulate the API call since we need to study aitmpl.com's actual API
      console.log(`🔍 Searching ${source.name} for ${criteria.projectType} templates...`);
      
      // Mock templates that would come from aitmpl.com
      return this.generateMockAITemplates(criteria);
      
      /* Future implementation:
      const response = await fetch(`${source.url}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: criteria.projectType,
          tech: criteria.primaryTech,
          complexity: criteria.complexity,
          keywords: criteria.keywords
        })
      });
      
      const templates = await response.json();
      return templates.map(t => ({
        ...t,
        source: source.name,
        sourceType: source.type
      }));
      */
      
    } catch (error) {
      console.warn(`Failed to search ${source.name}: ${error.message}`);
      return [];
    }
  }

  /**
   * Search GitHub for template repositories
   */
  async searchGitHubTemplates(source, criteria) {
    try {
      const query = this.buildGitHubQuery(criteria);
      const response = await fetch(`${source.url}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&per_page=10`);
      
      if (!response.ok) {
        throw new Error(`GitHub API returned ${response.status}`);
      }
      
      const data = await response.json();
      
      return data.items.map(repo => ({
        id: repo.id,
        name: repo.name,
        description: repo.description,
        url: repo.html_url,
        stars: repo.stargazers_count,
        language: repo.language,
        updatedAt: repo.updated_at,
        source: source.name,
        sourceType: source.type,
        metadata: {
          owner: repo.owner.login,
          forks: repo.forks_count,
          issues: repo.open_issues_count
        }
      }));
      
    } catch (error) {
      console.warn(`Failed to search GitHub: ${error.message}`);
      return [];
    }
  }

  /**
   * Build GitHub search query
   */
  buildGitHubQuery(criteria) {
    const parts = [
      `${criteria.projectType}`,
      'template',
      'boilerplate'
    ];
    
    // Add primary tech
    if (criteria.primaryTech.frontend) {
      parts.push(criteria.primaryTech.frontend);
    }
    if (criteria.primaryTech.backend) {
      parts.push(criteria.primaryTech.backend);
    }
    
    return parts.join(' ');
  }

  /**
   * Search local template cache
   */
  async searchLocalTemplates(source, criteria) {
    try {
      await this.ensureCacheDir();
      
      const cacheFiles = await fs.readdir(this.cacheDir);
      const templates = [];
      
      for (const file of cacheFiles) {
        if (file.endsWith('.json')) {
          try {
            const templatePath = path.join(this.cacheDir, file);
            const templateContent = await fs.readFile(templatePath, 'utf8');
            const template = JSON.parse(templateContent);
            
            if (this.matchesCriteria(template, criteria)) {
              templates.push({
                ...template,
                source: source.name,
                sourceType: source.type,
                cached: true
              });
            }
          } catch (error) {
            console.warn(`Failed to load cached template ${file}: ${error.message}`);
          }
        }
      }
      
      return templates;
      
    } catch (error) {
      console.warn(`Failed to search local cache: ${error.message}`);
      return [];
    }
  }

  /**
   * Check if template matches search criteria
   */
  matchesCriteria(template, criteria) {
    // Simple matching logic - can be enhanced with ML
    const templateKeywords = [
      ...(template.tags || []),
      template.type,
      ...(template.tech || [])
    ].map(k => k.toLowerCase());
    
    const searchKeywords = criteria.keywords.map(k => k.toLowerCase());
    
    // Count matching keywords
    const matches = searchKeywords.filter(k => 
      templateKeywords.some(tk => tk.includes(k) || k.includes(tk))
    );
    
    return matches.length >= 2; // Require at least 2 keyword matches
  }

  /**
   * Evaluate template quality and compatibility
   */
  async evaluateTemplates(templates, criteria) {
    console.log(`📊 Evaluating ${templates.length} template candidates...`);
    
    const evaluatedTemplates = [];
    
    for (const template of templates) {
      const qualityScore = await this.calculateQualityScore(template, criteria);
      
      evaluatedTemplates.push({
        ...template,
        qualityScore,
        evaluation: {
          relevance: this.calculateRelevance(template, criteria),
          popularity: this.calculatePopularity(template),
          freshness: this.calculateFreshness(template),
          completeness: this.calculateCompleteness(template)
        }
      });
    }
    
    // Sort by quality score
    return evaluatedTemplates.sort((a, b) => b.qualityScore - a.qualityScore);
  }

  /**
   * Calculate overall quality score
   */
  async calculateQualityScore(template, criteria) {
    const weights = {
      relevance: 0.4,
      popularity: 0.2,
      freshness: 0.2,
      completeness: 0.2
    };
    
    const scores = {
      relevance: this.calculateRelevance(template, criteria),
      popularity: this.calculatePopularity(template),
      freshness: this.calculateFreshness(template),
      completeness: this.calculateCompleteness(template)
    };
    
    return Object.entries(weights).reduce((total, [metric, weight]) => {
      return total + (scores[metric] * weight);
    }, 0);
  }

  /**
   * Calculate relevance to search criteria
   */
  calculateRelevance(template, criteria) {
    let score = 0;
    
    // Project type match
    if (template.type === criteria.projectType) score += 0.3;
    
    // Tech stack matches
    const templateTech = template.tech || [];
    const criteriaTech = Object.values(criteria.primaryTech);
    const techMatches = templateTech.filter(t => 
      criteriaTech.some(ct => ct.toLowerCase().includes(t.toLowerCase()))
    );
    score += (techMatches.length / Math.max(criteriaTech.length, 1)) * 0.4;
    
    // Keyword matches
    const templateKeywords = template.tags || [];
    const keywordMatches = templateKeywords.filter(k => 
      criteria.keywords.some(ck => ck.toLowerCase().includes(k.toLowerCase()))
    );
    score += (keywordMatches.length / Math.max(criteria.keywords.length, 1)) * 0.3;
    
    return Math.min(score, 1.0);
  }

  /**
   * Calculate popularity score
   */
  calculatePopularity(template) {
    if (template.stars) {
      // GitHub stars - logarithmic scale
      return Math.min(Math.log10(template.stars + 1) / 4, 1.0);
    }
    
    if (template.downloads) {
      // NPM downloads or similar
      return Math.min(Math.log10(template.downloads + 1) / 6, 1.0);
    }
    
    // Default for unknown popularity
    return 0.5;
  }

  /**
   * Calculate freshness score
   */
  calculateFreshness(template) {
    if (!template.updatedAt && !template.lastModified) {
      return 0.5; // Unknown age
    }
    
    const lastUpdate = new Date(template.updatedAt || template.lastModified);
    const now = new Date();
    const daysSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60 * 24);
    
    // Fresher is better, but diminishing returns
    if (daysSinceUpdate < 30) return 1.0;
    if (daysSinceUpdate < 90) return 0.8;
    if (daysSinceUpdate < 365) return 0.6;
    if (daysSinceUpdate < 730) return 0.4;
    return 0.2;
  }

  /**
   * Calculate completeness score
   */
  calculateCompleteness(template) {
    let score = 0;
    
    // Check for key components
    const hasReadme = !!(template.readme || template.description);
    const hasLicense = !!template.license;
    const hasTests = !!(template.tests || template.testCommand);
    const hasDocumentation = !!(template.docs || template.documentation);
    const hasDependencies = !!(template.dependencies || template.packages);
    
    if (hasReadme) score += 0.2;
    if (hasLicense) score += 0.1;
    if (hasTests) score += 0.3;
    if (hasDocumentation) score += 0.2;
    if (hasDependencies) score += 0.2;
    
    return score;
  }

  /**
   * Cache template for faster future access
   */
  async cacheTemplate(template) {
    await this.ensureCacheDir();
    
    const cacheFile = path.join(this.cacheDir, `${template.id}.json`);
    await fs.writeFile(cacheFile, JSON.stringify(template, null, 2));
    
    console.log(`💾 Cached template: ${template.name}`);
  }

  /**
   * Ensure cache directory exists
   */
  async ensureCacheDir() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }
  }

  /**
   * Generate mock AI templates for testing
   */
  generateMockAITemplates(criteria) {
    const mockTemplates = [
      {
        id: 'react-express-todo',
        name: 'React + Express Todo App',
        description: 'Full-stack todo application with React frontend and Express backend',
        type: 'fullStackApp',
        tech: ['react', 'express', 'node'],
        tags: ['todo', 'crud', 'fullstack', 'javascript'],
        complexity: 'medium',
        updatedAt: '2024-10-01T00:00:00Z',
        source: 'aitmpl.com',
        rating: 4.7,
        uses: 1250,
        metadata: {
          author: 'ai-community',
          version: '2.1.0',
          license: 'MIT'
        }
      },
      {
        id: 'next-tailwind-starter',
        name: 'Next.js + Tailwind Starter',
        description: 'Modern Next.js application with Tailwind CSS and TypeScript',
        type: 'singlePageApp',
        tech: ['nextjs', 'tailwind', 'typescript'],
        tags: ['nextjs', 'tailwind', 'typescript', 'modern'],
        complexity: 'medium',
        updatedAt: '2024-09-28T00:00:00Z',
        source: 'aitmpl.com',
        rating: 4.9,
        uses: 890,
        metadata: {
          author: 'template-masters',
          version: '1.5.2',
          license: 'MIT'
        }
      }
    ];

    // Filter mocks by criteria
    return mockTemplates.filter(template => 
      template.type === criteria.projectType ||
      template.tech.some(tech => 
        Object.values(criteria.primaryTech).some(ct => 
          ct.toLowerCase().includes(tech.toLowerCase())
        )
      )
    );
  }
}