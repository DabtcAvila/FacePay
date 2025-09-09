class SelfImprovement {
  constructor() {
    this.brainFile = '../knowledge/brain.json';
    this.protocolsDir = '../protocols';
    this.learningQueue = [];
  }

  async integrateKnowledge(document) {
    console.log('Integrating new knowledge...');
    
    const knowledge = this.extractKnowledge(document);
    const brain = this.loadBrain();
    
    for (const item of knowledge) {
      const category = this.categorizeKnowledge(item);
      if (!brain.capabilities[category]) {
        brain.capabilities[category] = { level: 'basic', knowledge: [] };
      }
      
      brain.capabilities[category].knowledge.push({
        concept: item.concept,
        details: item.details,
        source: item.source,
        integrated: new Date().toISOString()
      });
      
      brain.capabilities[category].level = this.updateLevel(
        brain.capabilities[category].knowledge.length
      );
    }
    
    brain.knowledge_sources.push({
      document: document.title || 'Unknown',
      integrated: new Date().toISOString(),
      items: knowledge.length
    });
    
    brain.improvement_metrics.knowledge_items += knowledge.length;
    brain.last_updated = new Date().toISOString();
    
    this.saveBrain(brain);
    return { success: true, itemsIntegrated: knowledge.length };
  }

  extractKnowledge(document) {
    const knowledge = [];
    
    if (document.best_practices) {
      document.best_practices.forEach(practice => {
        knowledge.push({
          concept: practice.name,
          details: practice.description,
          category: 'best_practices',
          source: document.source || 'research'
        });
      });
    }
    
    if (document.patterns) {
      document.patterns.forEach(pattern => {
        knowledge.push({
          concept: pattern.name,
          details: pattern.implementation,
          category: 'system_design',
          source: document.source || 'research'
        });
      });
    }
    
    if (document.protocols) {
      document.protocols.forEach(protocol => {
        knowledge.push({
          concept: protocol.name,
          details: protocol.steps,
          category: 'protocols',
          source: document.source || 'research'
        });
      });
    }
    
    return knowledge;
  }

  categorizeKnowledge(item) {
    const categories = {
      orchestration: ['orchestr', 'coordinat', 'manag', 'control'],
      automation: ['automat', 'script', 'task', 'workflow'],
      system_design: ['pattern', 'architect', 'design', 'structure'],
      best_practices: ['best', 'practice', 'standard', 'convention'],
      protocols: ['protocol', 'procedure', 'process', 'method']
    };
    
    const concept = item.concept.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => concept.includes(keyword))) {
        return category;
      }
    }
    
    return item.category || 'best_practices';
  }

  updateLevel(knowledgeCount) {
    if (knowledgeCount >= 20) return 'expert';
    if (knowledgeCount >= 10) return 'advanced';
    if (knowledgeCount >= 5) return 'intermediate';
    return 'basic';
  }

  loadBrain() {
    const fs = require('fs');
    const path = require('path');
    try {
      return JSON.parse(fs.readFileSync(path.join(__dirname, this.brainFile), 'utf8'));
    } catch (error) {
      console.error('Failed to load brain:', error.message);
      return { capabilities: {}, knowledge_sources: [], improvement_metrics: {} };
    }
  }

  saveBrain(brain) {
    const fs = require('fs');
    const path = require('path');
    try {
      fs.writeFileSync(
        path.join(__dirname, this.brainFile),
        JSON.stringify(brain, null, 2)
      );
      console.log('Brain updated successfully');
    } catch (error) {
      console.error('Failed to save brain:', error.message);
    }
  }

  generateLearningRequest() {
    const brain = this.loadBrain();
    const priorities = [];
    
    for (const [capability, data] of Object.entries(brain.capabilities)) {
      if (data.level === 'basic' || data.knowledge.length < 5) {
        priorities.push(capability);
      }
    }
    
    const learningTopics = brain.learning_goals.filter(goal => 
      !brain.knowledge_sources.some(source => 
        source.document?.toLowerCase().includes(goal.toLowerCase())
      )
    );
    
    return {
      priority_areas: priorities,
      suggested_topics: learningTopics.slice(0, 3),
      current_level: this.calculateOverallLevel(brain)
    };
  }

  calculateOverallLevel(brain) {
    const levels = { basic: 1, intermediate: 2, advanced: 3, expert: 4 };
    let total = 0;
    let count = 0;
    
    for (const data of Object.values(brain.capabilities)) {
      total += levels[data.level] || 1;
      count++;
    }
    
    const avg = total / count;
    if (avg >= 3.5) return 'expert';
    if (avg >= 2.5) return 'advanced';
    if (avg >= 1.5) return 'intermediate';
    return 'basic';
  }
}

module.exports = SelfImprovement;