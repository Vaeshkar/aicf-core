const fs = require('fs');
const path = require('path');

/**
 * Enhanced Markdown Generator
 * 
 * Produces context-aware, intelligent documentation that captures actual
 * work accomplished, decisions made, and problems solved - not generic templates.
 */
class EnhancedMarkdownGenerator {
    constructor(options = {}) {
        this.options = {
            preserveExisting: true,
            generateTimestamps: true,
            includeEvidence: true,
            smartTemplates: true,
            ...options
        };
        
        this.aiDir = '.ai';
        this.ensureDirectories();
    }

    ensureDirectories() {
        if (!fs.existsSync(this.aiDir)) {
            fs.mkdirSync(this.aiDir, { recursive: true });
        }
    }

    /**
     * Generate comprehensive documentation from AICF data
     */
    async generateDocumentation(aicfData, options = {}) {
        console.log(`📝 Generating enhanced documentation for ${aicfData.source} conversation...`);

        const analysis = this.performDeepAnalysis(aicfData);
        const sessionType = this.classifySession(analysis);
        
        console.log(`🎯 Session classified as: ${sessionType}`);

        const documentation = {
            conversationLog: await this.generateIntelligentConversationLog(aicfData, analysis),
            technicalDecisions: await this.generateTechnicalDecisions(aicfData, analysis),
            codePatterns: await this.generateCodePatterns(aicfData, analysis),
            problemSolutions: await this.generateProblemSolutions(aicfData, analysis),
            designSystem: await this.generateDesignSystem(aicfData, analysis),
            nextSteps: await this.generateActionableNextSteps(aicfData, analysis)
        };

        // Write documentation files
        await this.writeDocumentationFiles(documentation);

        return {
            sessionType,
            analysis,
            documentation,
            filesGenerated: Object.keys(documentation).filter(doc => documentation[doc] !== null)
        };
    }

    /**
     * Perform deep analysis of conversation content
     */
    performDeepAnalysis(aicfData) {
        const content = this.extractAllText(aicfData);
        const messages = aicfData.messages || [];
        
        return {
            // Core conversation analysis
            sessionType: this.detectSessionType(content, messages),
            workAccomplished: this.extractWorkAccomplished(content, messages),
            problemsSolved: this.extractProblemsSolved(content, messages),
            decisionsWithRationale: this.extractDecisionsWithRationale(content, messages),
            
            // Technical analysis
            codeChanges: this.extractCodeChanges(content, messages),
            methodsCreated: this.extractMethodsCreated(content, messages),
            filesModified: this.extractFilesModified(content, messages),
            apiChanges: this.extractAPIChanges(content, messages),
            
            // Context analysis
            projectContext: this.extractProjectContext(aicfData),
            toolsUsed: this.extractToolsUsed(content, messages),
            learningOutcomes: this.extractLearningOutcomes(content, messages),
            
            // Quality indicators
            evidence: this.extractEvidence(content, messages),
            specificity: this.calculateSpecificity(content),
            actionability: this.calculateActionability(content)
        };
    }

    extractAllText(aicfData) {
        let allText = aicfData.content || '';
        
        if (aicfData.messages) {
            const messageText = aicfData.messages
                .map(msg => msg.content || '')
                .join(' ');
            allText += ' ' + messageText;
        }
        
        return allText;
    }

    /**
     * Detect the type of work session from content
     */
    detectSessionType(content, messages) {
        const lowerContent = content.toLowerCase();
        
        // Architecture/system design
        if (this.hasPatterns(lowerContent, [
            'architecture', 'system design', 'data flow', 'pipeline', 
            'extractor', 'parser', 'independent', 'bulletproof'
        ])) {
            return 'architecture_session';
        }
        
        // Debugging/troubleshooting
        if (this.hasPatterns(lowerContent, [
            'error', 'bug', 'issue', 'fix', 'debug', 'problem', 
            'not working', 'failed', 'broken'
        ])) {
            return 'debugging_session';
        }
        
        // Code implementation
        if (this.hasPatterns(lowerContent, [
            'implement', 'create', 'build', 'develop', 'method', 
            'function', 'class', 'code'
        ])) {
            return 'implementation_session';
        }
        
        // Data analysis/inspection
        if (this.hasPatterns(lowerContent, [
            'inspect', 'analyze', 'data', 'extract', 'map', 
            'structure', 'flow', 'transparency'
        ])) {
            return 'analysis_session';
        }
        
        // Design/UI work
        if (this.hasPatterns(lowerContent, [
            'ui', 'design', 'interface', 'consistent', 'layout',
            'visual', 'user experience'
        ])) {
            return 'design_session';
        }
        
        // Documentation/cleanup
        if (this.hasPatterns(lowerContent, [
            'documentation', 'clean', 'organize', 'honest',
            'clear', 'explain'
        ])) {
            return 'documentation_session';
        }
        
        return 'general_session';
    }

    hasPatterns(content, patterns) {
        return patterns.some(pattern => content.includes(pattern));
    }

    /**
     * Extract specific work accomplished (not generic descriptions)
     */
    extractWorkAccomplished(content, messages) {
        const accomplished = [];
        
        // Look for creation patterns
        const creationPatterns = [
            /(?:created?|built?|implemented?|developed?)\s+([^.!?]{10,100})/gi,
            /(?:added?|introduced?)\s+([^.!?]{10,100})/gi,
            /(?:designed?|architected?)\s+([^.!?]{10,100})/gi
        ];
        
        creationPatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const cleaned = this.cleanMatch(match);
                    if (cleaned && this.isSpecific(cleaned)) {
                        accomplished.push({
                            type: 'creation',
                            description: cleaned,
                            confidence: this.calculateConfidence(cleaned)
                        });
                    }
                });
            }
        });
        
        // Look for modification patterns
        const modificationPatterns = [
            /(?:updated?|modified?|changed?|enhanced?)\s+([^.!?]{10,100})/gi,
            /(?:improved?|optimized?|refactored?)\s+([^.!?]{10,100})/gi
        ];
        
        modificationPatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const cleaned = this.cleanMatch(match);
                    if (cleaned && this.isSpecific(cleaned)) {
                        accomplished.push({
                            type: 'modification',
                            description: cleaned,
                            confidence: this.calculateConfidence(cleaned)
                        });
                    }
                });
            }
        });
        
        return accomplished.slice(0, 10); // Limit to most relevant
    }

    /**
     * Extract specific problems solved with context
     */
    extractProblemsSolved(content, messages) {
        const problems = [];
        
        // Look for problem-solution patterns
        const problemSolutionPatterns = [
            /(?:problem|issue|bug|error):\s*([^.!?]{10,150})[^.!?]*(?:solution|fix|resolved?):\s*([^.!?]{10,150})/gi,
            /([^.!?]{10,100})\s+(?:was|were)\s+(?:causing|breaking|failing)[^.!?]*(?:fixed|resolved|solved)\s+(?:by|with|through)\s+([^.!?]{10,150})/gi,
            /(?:challenge|difficulty):\s*([^.!?]{10,150})[^.!?]*(?:approach|solution):\s*([^.!?]{10,150})/gi
        ];
        
        problemSolutionPatterns.forEach(pattern => {
            const matches = [...content.matchAll(pattern)];
            matches.forEach(match => {
                if (match.length >= 3) {
                    const problem = this.cleanMatch(match[1]);
                    const solution = this.cleanMatch(match[2]);
                    
                    if (problem && solution && this.isSpecific(problem)) {
                        problems.push({
                            problem,
                            solution,
                            evidence: match[0].substring(0, 200) + '...',
                            confidence: this.calculateConfidence(problem + solution)
                        });
                    }
                }
            });
        });
        
        return problems.slice(0, 5);
    }

    /**
     * Extract decisions with clear rationale
     */
    extractDecisionsWithRationale(content, messages) {
        const decisions = [];
        
        // Look for decision patterns with rationale
        const decisionPatterns = [
            /(?:decided|chose|selected)\s+(?:to\s+)?([^.!?]{10,100})[^.!?]*(?:because|since|due to|to|in order to)\s+([^.!?]{10,150})/gi,
            /([^.!?]{10,100})\s+(?:is|was)\s+(?:better|preferred|recommended|chosen)\s+(?:than|over)\s+[^.!?]*(?:because|since|due to)\s+([^.!?]{10,150})/gi,
            /(?:approach|strategy|method):\s*([^.!?]{10,100})[^.!?]*(?:rationale|reason|why):\s*([^.!?]{10,150})/gi
        ];
        
        decisionPatterns.forEach(pattern => {
            const matches = [...content.matchAll(pattern)];
            matches.forEach(match => {
                if (match.length >= 3) {
                    const decision = this.cleanMatch(match[1]);
                    const rationale = this.cleanMatch(match[2]);
                    
                    if (decision && rationale && this.isSpecific(decision)) {
                        decisions.push({
                            decision,
                            rationale,
                            type: this.classifyDecision(decision),
                            confidence: this.calculateConfidence(decision + rationale)
                        });
                    }
                }
            });
        });
        
        return decisions.slice(0, 8);
    }

    /**
     * Extract specific code changes and patterns
     */
    extractCodeChanges(content, messages) {
        const codeChanges = [];
        
        // Method/function patterns
        const methodPatterns = [
            /(?:function|method|class)\s+(\w+)/gi,
            /(\w+)\s*\([^)]*\)\s*[{=]/g,
            /(?:const|let|var)\s+(\w+)\s*=/g
        ];
        
        methodPatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const cleaned = this.cleanMatch(match);
                    if (cleaned && cleaned.length > 3) {
                        codeChanges.push({
                            type: 'method_signature',
                            pattern: cleaned,
                            context: this.extractContext(content, match, 50)
                        });
                    }
                });
            }
        });
        
        // File patterns
        const filePatterns = [
            /\/[a-zA-Z0-9\-_\/]+\.[a-zA-Z0-9]+/g,
            /[a-zA-Z0-9\-_]+\.(js|ts|py|json|md|css|html)/g
        ];
        
        filePatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    codeChanges.push({
                        type: 'file_reference',
                        pattern: match,
                        context: this.extractContext(content, match, 30)
                    });
                });
            }
        });
        
        return codeChanges.slice(0, 15);
    }

    /**
     * Generate intelligent conversation log with context-aware structure
     */
    async generateIntelligentConversationLog(aicfData, analysis) {
        const date = new Date(aicfData.timestamp).toISOString().split('T')[0];
        const shortId = aicfData.id.substring(0, 12);
        const sessionTypeLabel = analysis.sessionType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        let markdown = `## Chat ${shortId} - ${date} - ${sessionTypeLabel}

### Context & Objective
${this.generateContextSection(aicfData, analysis)}

### Work Accomplished
${this.generateAccomplishmentsSection(analysis.workAccomplished)}

### Problems Solved
${this.generateProblemsSection(analysis.problemsSolved)}

### Key Decisions Made
${this.generateDecisionsSection(analysis.decisionsWithRationale)}

### Technical Implementation
${this.generateTechnicalSection(analysis.codeChanges, analysis.filesModified)}

### Learning Outcomes
${this.generateLearningSection(analysis.learningOutcomes)}

### Next Steps & Follow-up
${this.generateNextStepsSection(aicfData, analysis)}

### Session Metadata
- **Platform**: ${aicfData.metadata?.platform || aicfData.source}
- **Duration**: ${this.calculateDuration(aicfData)}
- **Quality**: ${aicfData.metadata?.quality || 'unknown'} (${Math.round((aicfData.metadata?.confidence || 0) * 100)}% confidence)
- **Files Involved**: ${analysis.codeChanges.filter(c => c.type === 'file_reference').length}
- **Methods/Functions**: ${analysis.codeChanges.filter(c => c.type === 'method_signature').length}
- **Session ID**: ${aicfData.id}

`;

        return markdown;
    }

    generateContextSection(aicfData, analysis) {
        const projectPath = aicfData.metadata?.projectPath || 
                           aicfData.metadata?.workingDirectories?.[0] || 
                           'Unknown project';
        
        const platform = aicfData.source;
        const sessionType = analysis.sessionType;
        
        let context = `**Project**: ${projectPath}\n`;
        context += `**Platform**: ${platform === 'warp' ? 'Warp Terminal' : 'Augment VSCode'}\n`;
        
        if (analysis.projectContext) {
            context += `**Focus**: ${analysis.projectContext}\n`;
        }
        
        // Add session-specific context
        if (sessionType === 'architecture_session') {
            context += `**Objective**: System architecture design and data flow planning`;
        } else if (sessionType === 'debugging_session') {
            context += `**Objective**: Issue diagnosis and problem resolution`;
        } else if (sessionType === 'implementation_session') {
            context += `**Objective**: Feature development and code implementation`;
        } else if (sessionType === 'analysis_session') {
            context += `**Objective**: Data structure analysis and system inspection`;
        }
        
        return context;
    }

    generateAccomplishmentsSection(workAccomplished) {
        if (workAccomplished.length === 0) {
            return '- Session completed but specific accomplishments not clearly identified';
        }
        
        return workAccomplished
            .filter(work => work.confidence > 0.6)
            .map(work => `- ✅ **${work.type}**: ${work.description}`)
            .join('\n');
    }

    generateProblemsSection(problemsSolved) {
        if (problemsSolved.length === 0) {
            return '- No specific problems identified or solved in this session';
        }
        
        return problemsSolved.map(problem => 
            `#### ${problem.problem}
- **Solution**: ${problem.solution}
- **Evidence**: ${problem.evidence}
`
        ).join('\n');
    }

    generateDecisionsSection(decisionsWithRationale) {
        if (decisionsWithRationale.length === 0) {
            return '- No significant decisions documented in this session';
        }
        
        return decisionsWithRationale.map(decision =>
            `#### ${decision.decision}
- **Type**: ${decision.type}
- **Rationale**: ${decision.rationale}
- **Confidence**: ${Math.round(decision.confidence * 100)}%
`
        ).join('\n');
    }

    generateTechnicalSection(codeChanges, filesModified) {
        const methods = codeChanges.filter(c => c.type === 'method_signature');
        const files = codeChanges.filter(c => c.type === 'file_reference');
        
        let section = '';
        
        if (methods.length > 0) {
            section += '**Methods/Functions Worked On**:\n';
            section += methods.slice(0, 8).map(method => 
                `- \`${method.pattern}\`${method.context ? ` - ${method.context}` : ''}`
            ).join('\n');
            section += '\n\n';
        }
        
        if (files.length > 0) {
            section += '**Files Modified/Referenced**:\n';
            section += files.slice(0, 10).map(file => 
                `- \`${file.pattern}\`${file.context ? ` - ${file.context}` : ''}`
            ).join('\n');
        }
        
        return section || '- No specific technical implementations documented';
    }

    generateLearningSection(learningOutcomes) {
        if (learningOutcomes.length === 0) {
            return '- Learning outcomes not explicitly captured in this session';
        }
        
        return learningOutcomes.map(learning => `- 🧠 ${learning}`).join('\n');
    }

    generateNextStepsSection(aicfData, analysis) {
        const nextSteps = [];
        
        // Generate contextual next steps based on session type
        if (analysis.sessionType === 'architecture_session') {
            nextSteps.push('Implement the designed architecture components');
            nextSteps.push('Test integration between system components');
        }
        
        if (analysis.sessionType === 'implementation_session') {
            nextSteps.push('Test the implemented functionality');
            nextSteps.push('Consider edge cases and error handling');
        }
        
        if (analysis.decisionsWithRationale.length > 0) {
            nextSteps.push('Document architectural decisions for future reference');
        }
        
        if (analysis.codeChanges.length > 0) {
            nextSteps.push('Review code changes and consider refactoring opportunities');
        }
        
        // Add specific next steps based on content analysis
        const content = this.extractAllText(aicfData);
        if (content.includes('test')) {
            nextSteps.push('Run comprehensive tests on modified functionality');
        }
        
        return nextSteps.length > 0 ? 
            nextSteps.map(step => `- ${step}`).join('\n') :
            '- Review session outcomes and identify follow-up actions';
    }

    // Utility methods
    classifySession(analysis) {
        return analysis.sessionType;
    }

    cleanMatch(match) {
        if (!match) return null;
        return match
            .replace(/^(created?|built?|implemented?|developed?|added?|updated?|modified?|decided?|chose?)/i, '')
            .replace(/^\s*(to\s+)?/, '')
            .trim();
    }

    isSpecific(text) {
        if (!text || text.length < 10) return false;
        
        // Filter out generic phrases
        const genericPhrases = [
            'development work', 'implementation', 'functionality',
            'system', 'process', 'method', 'approach'
        ];
        
        return !genericPhrases.some(phrase => 
            text.toLowerCase().includes(phrase) && text.length < 50
        );
    }

    calculateConfidence(text) {
        let confidence = 0.5;
        
        if (text.length > 50) confidence += 0.2;
        if (/[A-Z][a-z]+/.test(text)) confidence += 0.1; // Has proper nouns
        if (/\w+\.\w+/.test(text)) confidence += 0.1; // Has method/file references
        if (text.includes('because') || text.includes('to')) confidence += 0.1; // Has rationale
        
        return Math.min(1.0, confidence);
    }

    extractContext(content, match, contextLength) {
        const index = content.indexOf(match);
        if (index === -1) return null;
        
        const start = Math.max(0, index - contextLength);
        const end = Math.min(content.length, index + match.length + contextLength);
        
        return content.substring(start, end).replace(/\s+/g, ' ').trim();
    }

    classifyDecision(decision) {
        const lowerDecision = decision.toLowerCase();
        
        if (lowerDecision.includes('architecture') || lowerDecision.includes('system') || lowerDecision.includes('design')) {
            return 'architectural_decision';
        }
        if (lowerDecision.includes('ui') || lowerDecision.includes('interface') || lowerDecision.includes('user')) {
            return 'design_decision';
        }
        if (lowerDecision.includes('implement') || lowerDecision.includes('code') || lowerDecision.includes('method')) {
            return 'implementation_decision';
        }
        if (lowerDecision.includes('process') || lowerDecision.includes('workflow')) {
            return 'process_decision';
        }
        
        return 'general_decision';
    }

    calculateDuration(aicfData) {
        if (aicfData.metadata?.timespan?.duration) {
            const minutes = Math.round(aicfData.metadata.timespan.duration / 1000 / 60);
            return `${minutes} minutes`;
        }
        return 'Unknown duration';
    }

    calculateSpecificity(content) {
        // Simple heuristic for content specificity
        const specificIndicators = [
            /\w+\.\w+/g, // Method calls, file extensions
            /[A-Z][a-z]+[A-Z]/g, // CamelCase
            /\/[a-zA-Z0-9\-_\/]+/g, // File paths
            /"[^"]+"/g, // Quoted strings
            /\b\w+:\s/g // Key-value patterns
        ];
        
        let specificityScore = 0;
        specificIndicators.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                specificityScore += matches.length;
            }
        });
        
        return Math.min(1.0, specificityScore / 20);
    }

    calculateActionability(content) {
        const actionableIndicators = [
            /\b(implement|create|build|update|fix|change|add|remove|test)\b/gi,
            /\b(should|must|need to|will|can)\b/gi,
            /\b(next|then|after|follow up|continue)\b/gi
        ];
        
        let actionabilityScore = 0;
        actionableIndicators.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                actionabilityScore += matches.length;
            }
        });
        
        return Math.min(1.0, actionabilityScore / 10);
    }

    extractProjectContext(aicfData) {
        const workingDirs = aicfData.metadata?.workingDirectories || [];
        if (workingDirs.length > 0) {
            const projectName = workingDirs[0].split('/').pop();
            return `Working on ${projectName} project`;
        }
        return null;
    }

    extractToolsUsed(content, messages) {
        const tools = new Set();
        const toolPatterns = [
            /\b(warp|vscode|augment|claude|git|npm|node|sqlite|leveldb|strings)\b/gi
        ];
        
        toolPatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                matches.forEach(match => tools.add(match.toLowerCase()));
            }
        });
        
        return Array.from(tools);
    }

    extractLearningOutcomes(content, messages) {
        const learnings = [];
        
        const learningPatterns = [
            /(?:learned|discovered|found out|realized|understood)\s+(?:that\s+)?([^.!?]{15,150})/gi,
            /(?:key insight|important|crucial|critical):\s*([^.!?]{15,150})/gi,
            /(?:now i understand|makes sense|clear that)\s+([^.!?]{15,150})/gi
        ];
        
        learningPatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const cleaned = this.cleanMatch(match);
                    if (cleaned && this.isSpecific(cleaned)) {
                        learnings.push(cleaned);
                    }
                });
            }
        });
        
        return learnings.slice(0, 5);
    }

    extractEvidence(content, messages) {
        // Extract quoted text as evidence
        const quotes = content.match(/"([^"]{20,200})"/g);
        return quotes ? quotes.slice(0, 5) : [];
    }

    extractMethodsCreated(content, messages) {
        const methods = [];
        const methodPatterns = [
            /(?:function|method)\s+(\w+)\s*\([^)]*\)/gi,
            /(\w+)\s*\([^)]*\)\s*\{/g,
            /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>)/gi
        ];
        
        methodPatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                methods.push(...matches);
            }
        });
        
        return methods.slice(0, 10);
    }

    extractFilesModified(content, messages) {
        const files = new Set();
        const filePatterns = [
            /\/[a-zA-Z0-9\-_\/]+\.[a-zA-Z0-9]+/g,
            /[a-zA-Z0-9\-_]+\.(js|ts|py|json|md|css|html|jsx|tsx)/g
        ];
        
        filePatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                matches.forEach(match => files.add(match));
            }
        });
        
        return Array.from(files);
    }

    extractAPIChanges(content, messages) {
        const apiChanges = [];
        
        // Look for API-related patterns
        const apiPatterns = [
            /(?:api|endpoint|route)\s+([^.!?]{10,100})/gi,
            /(?:request|response|parameter)\s+([^.!?]{10,100})/gi
        ];
        
        apiPatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    const cleaned = this.cleanMatch(match);
                    if (cleaned && this.isSpecific(cleaned)) {
                        apiChanges.push(cleaned);
                    }
                });
            }
        });
        
        return apiChanges.slice(0, 5);
    }

    /**
     * Generate additional specialized documentation files
     */
    async generateTechnicalDecisions(aicfData, analysis) {
        if (analysis.decisionsWithRationale.length === 0) {
            return null;
        }

        const date = new Date(aicfData.timestamp).toISOString().split('T')[0];
        
        return `# Technical Decisions - ${date}

## Session Context
- **Project**: ${analysis.projectContext || 'Unknown project'}
- **Session Type**: ${analysis.sessionType.replace('_', ' ')}
- **Platform**: ${aicfData.source}

## Decisions Made

${analysis.decisionsWithRationale.map(decision => `### ${decision.decision}

**Category**: ${decision.type.replace('_', ' ')}
**Rationale**: ${decision.rationale}
**Confidence Level**: ${Math.round(decision.confidence * 100)}%

---
`).join('\n')}

## Impact Assessment

${analysis.decisionsWithRationale.filter(d => d.confidence > 0.7).length > 0 ? 
`**High Confidence Decisions**: ${analysis.decisionsWithRationale.filter(d => d.confidence > 0.7).length}
These decisions have strong rationale and clear context.` :
'No high-confidence decisions identified in this session.'}

## Follow-up Required

${analysis.decisionsWithRationale.some(d => d.type.includes('architectural')) ? 
'- Document architectural decisions in system design docs\n- Review decisions with team if applicable' :
'- Validate implementation of decisions made\n- Monitor outcomes and effectiveness'}
`;
    }

    async generateCodePatterns(aicfData, analysis) {
        if (analysis.codeChanges.length === 0) {
            return null;
        }

        const date = new Date(aicfData.timestamp).toISOString().split('T')[0];
        const methods = analysis.codeChanges.filter(c => c.type === 'method_signature');
        const files = analysis.codeChanges.filter(c => c.type === 'file_reference');

        return `# Code Patterns - ${date}

## Session Overview
- **Methods/Functions**: ${methods.length}
- **Files Referenced**: ${files.length}
- **Session Type**: ${analysis.sessionType.replace('_', ' ')}

${methods.length > 0 ? `## Methods and Functions

${methods.map(method => `### \`${method.pattern}\`
${method.context ? `**Context**: ${method.context}` : ''}

`).join('\n')}` : ''}

${files.length > 0 ? `## Files Modified/Referenced

${files.map(file => `### \`${file.pattern}\`
${file.context ? `**Context**: ${file.context}` : ''}

`).join('\n')}` : ''}

## Implementation Notes
- **Platform**: ${aicfData.source === 'warp' ? 'Warp Terminal' : 'Augment VSCode'}
- **Session ID**: ${aicfData.id}
- **Quality**: ${aicfData.metadata?.quality || 'unknown'}
`;
    }

    async generateProblemSolutions(aicfData, analysis) {
        if (analysis.problemsSolved.length === 0) {
            return null;
        }

        const date = new Date(aicfData.timestamp).toISOString().split('T')[0];

        return `# Problems & Solutions - ${date}

## Session Context
${analysis.projectContext || 'Problem-solving session'}

## Problems Addressed

${analysis.problemsSolved.map((problem, index) => `### Problem ${index + 1}: ${problem.problem}

**Solution**: ${problem.solution}

**Evidence**: 
\`\`\`
${problem.evidence}
\`\`\`

**Confidence**: ${Math.round(problem.confidence * 100)}%

---
`).join('\n')}

## Lessons Learned

${analysis.problemsSolved.map(problem => 
`- **${problem.problem.substring(0, 50)}...** → Solution pattern can be reused for similar issues`
).join('\n')}

## Prevention Strategies

Based on problems encountered:
${analysis.problemsSolved.map(problem => 
`- Consider validation/testing to prevent: ${problem.problem.substring(0, 60)}...`
).join('\n')}
`;
    }

    async generateDesignSystem(aicfData, analysis) {
        const designDecisions = analysis.decisionsWithRationale.filter(d => 
            d.type.includes('design') || d.decision.toLowerCase().includes('ui')
        );

        if (designDecisions.length === 0) {
            return null;
        }

        const date = new Date(aicfData.timestamp).toISOString().split('T')[0];

        return `# Design System Updates - ${date}

## Design Decisions Made

${designDecisions.map(decision => `### ${decision.decision}

**Rationale**: ${decision.rationale}
**Impact**: ${decision.confidence > 0.8 ? 'High' : decision.confidence > 0.6 ? 'Medium' : 'Low'}
**Category**: ${decision.type.replace('_', ' ')}

`).join('\n')}

## Design Principles Established

${designDecisions.map(decision => 
`- ${decision.decision.replace(/^(UI constraint: |Focus on )/, '')}`
).join('\n')}

## Implementation Guidelines

${designDecisions.map(decision => 
`- **${decision.decision.split(':')[0]}**: ${decision.rationale}`
).join('\n')}

## Session Information
- **Source**: ${aicfData.source} conversation
- **Date**: ${aicfData.timestamp}
- **Quality**: ${aicfData.metadata?.quality || 'unknown'}
`;
    }

    async generateActionableNextSteps(aicfData, analysis) {
        const nextSteps = this.generateContextualNextSteps(aicfData, analysis);
        
        if (nextSteps.length === 0) {
            return null;
        }

        return `# Next Steps - ${new Date(aicfData.timestamp).toISOString().split('T')[0]}

## Immediate Actions Required

${nextSteps.immediate.map(step => `- [ ] ${step}`).join('\n')}

## Short-term Follow-up (This Week)

${nextSteps.shortTerm.map(step => `- [ ] ${step}`).join('\n')}

## Long-term Considerations

${nextSteps.longTerm.map(step => `- [ ] ${step}`).join('\n')}

## Context
- **Session Type**: ${analysis.sessionType.replace('_', ' ')}
- **Priority**: ${analysis.actionability > 0.7 ? 'High' : analysis.actionability > 0.4 ? 'Medium' : 'Low'}
- **Based on**: ${aicfData.source} session ${aicfData.id.substring(0, 12)}
`;
    }

    generateContextualNextSteps(aicfData, analysis) {
        const steps = {
            immediate: [],
            shortTerm: [],
            longTerm: []
        };

        // Generate based on session type
        if (analysis.sessionType === 'implementation_session') {
            steps.immediate.push('Test implemented functionality');
            steps.shortTerm.push('Review code for edge cases and error handling');
            steps.longTerm.push('Consider refactoring and optimization opportunities');
        }

        if (analysis.sessionType === 'architecture_session') {
            steps.immediate.push('Document architectural decisions');
            steps.shortTerm.push('Begin implementation of designed components');
            steps.longTerm.push('Plan integration testing strategy');
        }

        if (analysis.sessionType === 'debugging_session') {
            steps.immediate.push('Verify fixes are working correctly');
            steps.shortTerm.push('Add tests to prevent regression');
            steps.longTerm.push('Review similar code areas for potential issues');
        }

        // Add specific next steps based on decisions
        analysis.decisionsWithRationale.forEach(decision => {
            if (decision.type.includes('architectural')) {
                steps.shortTerm.push(`Implement decision: ${decision.decision.substring(0, 60)}`);
            }
        });

        // Add next steps based on problems solved
        analysis.problemsSolved.forEach(problem => {
            steps.shortTerm.push(`Monitor solution effectiveness: ${problem.solution.substring(0, 50)}`);
        });

        return steps;
    }

    /**
     * Write all documentation files to disk
     */
    async writeDocumentationFiles(documentation) {
        const files = {
            'conversation-log.md': documentation.conversationLog,
            'technical-decisions.md': documentation.technicalDecisions,
            'code-patterns.md': documentation.codePatterns,
            'problem-solutions.md': documentation.problemSolutions,
            'design-system.md': documentation.designSystem,
            'next-steps.md': documentation.nextSteps
        };

        const writtenFiles = [];

        for (const [filename, content] of Object.entries(files)) {
            if (content) {
                const filePath = path.join(this.aiDir, filename);
                
                if (this.options.preserveExisting && fs.existsSync(filePath)) {
                    // Append to existing file
                    const existingContent = fs.readFileSync(filePath, 'utf-8');
                    const newContent = existingContent + '\n\n---\n\n' + content;
                    fs.writeFileSync(filePath, newContent, 'utf-8');
                } else {
                    // Create new file
                    fs.writeFileSync(filePath, content, 'utf-8');
                }
                
                writtenFiles.push(filename);
                console.log(`📝 Generated: .ai/${filename} (${content.length} chars)`);
            }
        }

        return writtenFiles;
    }
}

module.exports = { EnhancedMarkdownGenerator };