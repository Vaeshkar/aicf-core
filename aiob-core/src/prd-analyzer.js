/**
 * PRD Analyzer - Detects project type and structure requirements
 * Prevents the structural conflicts we saw in TaskMaster Pro
 */

export class PRDAnalyzer {
  /**
   * Analyze PRD content and determine optimal project structure
   */
  analyzePRD(prdContent) {
    const analysis = {
      projectType: this.detectProjectType(prdContent),
      techStack: this.detectTechStack(prdContent),
      complexity: this.assessComplexity(prdContent),
      recommendedStructure: null,
      phases: [],
      warnings: []
    };

    // Set recommended structure based on analysis
    analysis.recommendedStructure = this.getRecommendedStructure(analysis);
    
    // Generate phase plan
    analysis.phases = this.generatePhasePlan(analysis);
    
    // Generate warnings
    analysis.warnings = this.generateWarnings(analysis);

    return analysis;
  }

  /**
   * Detect project type from PRD content
   */
  detectProjectType(content) {
    const contentLower = content.toLowerCase();
    
    // Project type indicators
    const indicators = {
      singlePageApp: [
        'single page', 'spa', 'simple app', 'todo app', 'calculator',
        'one page', 'basic app', 'minimal app'
      ],
      fullStackApp: [
        'backend', 'frontend', 'api', 'database', 'server',
        'full-stack', 'web application', 'crud'
      ],
      monorepo: [
        'multiple apps', 'workspace', 'packages', 'monorepo',
        'shared components', 'multiple services', 'microservices'
      ],
      mobileApp: [
        'mobile', 'react native', 'ios', 'android', 'phone',
        'tablet', 'mobile-first', 'touch', 'gesture'
      ],
      apiOnly: [
        'api only', 'backend only', 'microservice', 'rest api',
        'graphql', 'no frontend', 'headless'
      ],
      staticSite: [
        'static site', 'landing page', 'blog', 'documentation',
        'marketing site', 'portfolio', 'gatsby', 'next.js static'
      ]
    };

    // Count matches for each type
    const scores = {};
    Object.entries(indicators).forEach(([type, keywords]) => {
      scores[type] = keywords.reduce((score, keyword) => {
        return score + (contentLower.includes(keyword) ? 1 : 0);
      }, 0);
    });

    // Find the highest scoring type
    const bestMatch = Object.entries(scores)
      .sort(([,a], [,b]) => b - a)[0];
    
    return {
      type: bestMatch[0],
      confidence: bestMatch[1],
      scores
    };
  }

  /**
   * Detect technology stack from PRD
   */
  detectTechStack(content) {
    const contentLower = content.toLowerCase();
    
    const techMap = {
      // Frontend
      frontend: {
        react: ['react', 'jsx', 'react.js'],
        vue: ['vue', 'vue.js', 'vuejs'],
        angular: ['angular', 'angular.js'],
        vanilla: ['vanilla js', 'plain javascript', 'no framework'],
        nextjs: ['next.js', 'nextjs', 'next'],
        nuxt: ['nuxt', 'nuxt.js']
      },
      
      // Backend
      backend: {
        node: ['node.js', 'nodejs', 'express', 'fastify'],
        python: ['python', 'django', 'flask', 'fastapi'],
        php: ['php', 'laravel', 'symfony'],
        java: ['java', 'spring', 'spring boot'],
        dotnet: ['.net', 'c#', 'asp.net']
      },
      
      // Database
      database: {
        postgresql: ['postgresql', 'postgres', 'pg'],
        mysql: ['mysql', 'mariadb'],
        mongodb: ['mongodb', 'mongo'],
        sqlite: ['sqlite', 'sqlite3'],
        json: ['json file', 'file storage', 'local storage']
      },
      
      // Styling
      styling: {
        tailwind: ['tailwind', 'tailwindcss'],
        bootstrap: ['bootstrap'],
        materialui: ['material-ui', 'mui', 'material design'],
        css: ['css', 'sass', 'scss', 'less'],
        styledComponents: ['styled-components', 'emotion']
      }
    };

    const detected = {};
    Object.entries(techMap).forEach(([category, techs]) => {
      detected[category] = [];
      Object.entries(techs).forEach(([tech, keywords]) => {
        const matches = keywords.filter(keyword => contentLower.includes(keyword));
        if (matches.length > 0) {
          detected[category].push({
            name: tech,
            confidence: matches.length,
            keywords: matches
          });
        }
      });
      
      // Sort by confidence
      detected[category].sort((a, b) => b.confidence - a.confidence);
    });

    return detected;
  }

  /**
   * Assess project complexity
   */
  assessComplexity(content) {
    const contentLower = content.toLowerCase();
    
    const complexityIndicators = {
      simple: [
        'basic', 'simple', 'minimal', 'quick', 'prototype',
        'poc', 'demo', 'example', 'tutorial'
      ],
      medium: [
        'crud', 'authentication', 'database', 'api',
        'responsive', 'forms', 'validation'
      ],
      complex: [
        'real-time', 'websocket', 'microservices', 'oauth',
        'payment', 'analytics', 'machine learning', 'ai',
        'performance', 'scalability', 'optimization'
      ],
      enterprise: [
        'enterprise', 'production', 'scalable', 'high availability',
        'load balancing', 'monitoring', 'logging', 'testing',
        'ci/cd', 'deployment', 'security', 'compliance'
      ]
    };

    const scores = {};
    Object.entries(complexityIndicators).forEach(([level, indicators]) => {
      scores[level] = indicators.reduce((score, indicator) => {
        return score + (contentLower.includes(indicator) ? 1 : 0);
      }, 0);
    });

    // Determine complexity level
    const maxScore = Math.max(...Object.values(scores));
    const complexityLevel = Object.entries(scores)
      .find(([, score]) => score === maxScore)[0];

    return {
      level: complexityLevel,
      scores,
      estimatedFiles: this.estimateFileCount(complexityLevel),
      estimatedPhases: this.estimatePhases(complexityLevel)
    };
  }

  /**
   * Get recommended project structure
   */
  getRecommendedStructure(analysis) {
    const { projectType, techStack, complexity } = analysis;

    const structures = {
      singlePageApp: {
        type: 'flat',
        directories: ['src', 'public', 'assets'],
        mainFiles: ['index.html', 'src/App.js', 'src/index.js', 'package.json']
      },
      
      fullStackApp: {
        type: 'separated',
        directories: ['backend', 'frontend', 'shared'],
        backendFiles: ['backend/server.js', 'backend/package.json', 'backend/routes/'],
        frontendFiles: ['frontend/src/', 'frontend/public/', 'frontend/package.json']
      },
      
      monorepo: {
        type: 'workspace',
        directories: ['apps', 'packages', 'tools'],
        workspaceFiles: ['package.json', 'pnpm-workspace.yaml', 'lerna.json']
      }
    };

    return structures[projectType.type] || structures.fullStackApp;
  }

  /**
   * Generate optimized phase plan
   */
  generatePhasePlan(analysis) {
    const basePhases = [
      {
        name: 'Infrastructure Setup',
        type: 'infrastructure',
        requiredCapabilities: ['planning', 'architecture'],
        description: 'Set up project structure and dependencies'
      },
      {
        name: 'Backend Development', 
        type: 'backend',
        requiredCapabilities: ['coding', 'implementation'],
        description: 'Build server and API endpoints'
      },
      {
        name: 'Frontend Development',
        type: 'frontend', 
        requiredCapabilities: ['coding', 'implementation'],
        description: 'Create user interface and client-side logic'
      },
      {
        name: 'Integration & Testing',
        type: 'qa',
        requiredCapabilities: ['debugging', 'analysis'],
        description: 'Test integration and verify functionality'
      }
    ];

    // Modify phases based on project type
    if (analysis.projectType.type === 'apiOnly') {
      return basePhases.filter(phase => phase.type !== 'frontend');
    }
    
    if (analysis.projectType.type === 'singlePageApp') {
      return basePhases.filter(phase => phase.type !== 'backend');
    }

    return basePhases;
  }

  /**
   * Generate warnings about potential issues
   */
  generateWarnings(analysis) {
    const warnings = [];

    // Complexity warnings
    if (analysis.complexity.level === 'enterprise' && analysis.complexity.estimatedFiles > 50) {
      warnings.push({
        type: 'complexity',
        message: 'High complexity project detected. Consider breaking into smaller phases.',
        severity: 'high'
      });
    }

    // Technology stack warnings
    const frontend = analysis.techStack.frontend;
    const backend = analysis.techStack.backend;
    
    if (frontend.length > 1) {
      warnings.push({
        type: 'tech_conflict',
        message: `Multiple frontend frameworks detected: ${frontend.map(f => f.name).join(', ')}`,
        severity: 'medium'
      });
    }

    if (backend.length > 1) {
      warnings.push({
        type: 'tech_conflict', 
        message: `Multiple backend technologies detected: ${backend.map(b => b.name).join(', ')}`,
        severity: 'medium'
      });
    }

    // Structure warnings
    if (analysis.projectType.type === 'monorepo' && analysis.complexity.level === 'simple') {
      warnings.push({
        type: 'over_engineering',
        message: 'Monorepo structure may be overkill for simple project',
        severity: 'low'
      });
    }

    return warnings;
  }

  /**
   * Estimate file count based on complexity
   */
  estimateFileCount(complexityLevel) {
    const estimates = {
      simple: 5,
      medium: 15,
      complex: 30,
      enterprise: 50
    };
    
    return estimates[complexityLevel] || 15;
  }

  /**
   * Estimate phases based on complexity
   */
  estimatePhases(complexityLevel) {
    const estimates = {
      simple: 2,
      medium: 4,
      complex: 6, 
      enterprise: 8
    };
    
    return estimates[complexityLevel] || 4;
  }

  /**
   * Generate structure-specific instructions for AI
   */
  generateStructureInstructions(analysis) {
    const { recommendedStructure, projectType, techStack } = analysis;
    
    let instructions = `# Project Structure Guidelines\n\n`;
    instructions += `**Project Type**: ${projectType.type}\n`;
    instructions += `**Structure Type**: ${recommendedStructure.type}\n\n`;
    
    instructions += `## Directory Structure\n`;
    if (recommendedStructure.directories) {
      recommendedStructure.directories.forEach(dir => {
        instructions += `- ${dir}/\n`;
      });
    }
    
    instructions += `\n## Key Files to Create\n`;
    if (recommendedStructure.mainFiles) {
      recommendedStructure.mainFiles.forEach(file => {
        instructions += `- ${file}\n`;
      });
    }
    
    instructions += `\n## Technology Stack\n`;
    Object.entries(techStack).forEach(([category, techs]) => {
      if (techs.length > 0) {
        instructions += `**${category}**: ${techs[0].name}\n`;
      }
    });
    
    return instructions;
  }
}