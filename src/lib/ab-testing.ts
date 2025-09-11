import { v4 as uuidv4 } from 'uuid';

// A/B Testing Types
export interface ABTest {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate: string;
  endDate?: string;
  traffic: number; // Percentage of users to include (0-100)
  variants: ABVariant[];
  targetingRules?: TargetingRule[];
  metrics: string[];
  created: string;
  createdBy: string;
}

export interface ABVariant {
  id: string;
  name: string;
  description: string;
  weight: number; // Percentage allocation within the test (0-100)
  config: Record<string, any>;
  isControl: boolean;
}

export interface TargetingRule {
  id: string;
  type: 'user_property' | 'location' | 'device' | 'time' | 'custom';
  property: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface ABTestAssignment {
  testId: string;
  variantId: string;
  userId?: string;
  sessionId: string;
  assignedAt: string;
  exposureLogged: boolean;
}

export interface ABTestResult {
  testId: string;
  variantId: string;
  metric: string;
  value: number;
  userId?: string;
  sessionId: string;
  timestamp: string;
}

export interface ABTestAnalytics {
  testId: string;
  variants: {
    [variantId: string]: {
      users: number;
      sessions: number;
      conversions: number;
      conversionRate: number;
      revenue?: number;
      avgSessionDuration?: number;
      bounceRate?: number;
      confidence: number;
      isStatisticallySignificant: boolean;
    };
  };
  winner?: string;
  recommendedAction: 'continue' | 'stop' | 'choose_variant';
}

// A/B Testing Configuration
interface ABTestingConfig {
  apiEndpoint?: string;
  enableLocalStorage?: boolean;
  enableAutoExposure?: boolean;
  defaultTrafficPercentage?: number;
  minSampleSize?: number;
  confidenceLevel?: number;
}

// A/B Testing Framework
class ABTestingFramework {
  private config: ABTestingConfig;
  private tests: Map<string, ABTest> = new Map();
  private assignments: Map<string, ABTestAssignment> = new Map();
  private results: ABTestResult[] = [];
  private userId?: string;
  private sessionId: string;
  private isInitialized = false;

  constructor(config: ABTestingConfig = {}) {
    this.config = {
      enableLocalStorage: true,
      enableAutoExposure: true,
      defaultTrafficPercentage: 100,
      minSampleSize: 100,
      confidenceLevel: 0.95,
      ...config
    };
    this.sessionId = uuidv4();
    this.initializeFramework();
  }

  private async initializeFramework() {
    // Load tests from API or local storage
    await this.loadTests();
    
    // Load existing assignments
    if (this.config.enableLocalStorage) {
      this.loadAssignmentsFromStorage();
    }

    this.isInitialized = true;
  }

  private async loadTests() {
    try {
      if (this.config.apiEndpoint) {
        const response = await fetch(`${this.config.apiEndpoint}/tests`);
        const tests: ABTest[] = await response.json();
        
        tests.forEach(test => {
          this.tests.set(test.id, test);
        });
      }
    } catch (error) {
      console.warn('Failed to load A/B tests:', error);
    }
  }

  private loadAssignmentsFromStorage() {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('ab_test_assignments');
      if (stored) {
        const assignments: ABTestAssignment[] = JSON.parse(stored);
        assignments.forEach(assignment => {
          this.assignments.set(assignment.testId, assignment);
        });
      }
    } catch (error) {
      console.warn('Failed to load A/B test assignments from storage:', error);
    }
  }

  private saveAssignmentsToStorage() {
    if (typeof window === 'undefined' || !this.config.enableLocalStorage) return;

    try {
      const assignments = Array.from(this.assignments.values());
      localStorage.setItem('ab_test_assignments', JSON.stringify(assignments));
    } catch (error) {
      console.warn('Failed to save A/B test assignments to storage:', error);
    }
  }

  // Set user identification
  public setUser(userId: string) {
    this.userId = userId;
    
    // Re-evaluate assignments for new user
    this.reevaluateAssignments();
  }

  // Create a new A/B test
  public async createTest(test: Omit<ABTest, 'id' | 'created'>): Promise<string> {
    const testId = uuidv4();
    const newTest: ABTest = {
      ...test,
      id: testId,
      created: new Date().toISOString()
    };

    // Validate test configuration
    this.validateTest(newTest);

    this.tests.set(testId, newTest);

    // Save to API if configured
    if (this.config.apiEndpoint) {
      try {
        await fetch(`${this.config.apiEndpoint}/tests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTest)
        });
      } catch (error) {
        console.warn('Failed to save test to API:', error);
      }
    }

    return testId;
  }

  // Start a test
  public async startTest(testId: string): Promise<void> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    test.status = 'running';
    test.startDate = new Date().toISOString();
    
    // Update API
    await this.updateTest(test);
  }

  // Stop a test
  public async stopTest(testId: string): Promise<void> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    test.status = 'completed';
    test.endDate = new Date().toISOString();
    
    // Update API
    await this.updateTest(test);
  }

  private async updateTest(test: ABTest): Promise<void> {
    if (this.config.apiEndpoint) {
      try {
        await fetch(`${this.config.apiEndpoint}/tests/${test.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(test)
        });
      } catch (error) {
        console.warn('Failed to update test in API:', error);
      }
    }
  }

  // Get variant for a test
  public getVariant(testId: string): ABVariant | null {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'running') {
      return null;
    }

    // Check if user should be included in test
    if (!this.shouldIncludeUser(test)) {
      return null;
    }

    // Get existing assignment
    let assignment = this.assignments.get(testId);
    
    if (!assignment) {
      // Create new assignment
      const newAssignment = this.assignVariant(test);
      if (!newAssignment) return null;
      assignment = newAssignment;
      
      this.assignments.set(testId, assignment);
      this.saveAssignmentsToStorage();
    }

    // Log exposure if enabled
    if (this.config.enableAutoExposure && !assignment.exposureLogged) {
      this.logExposure(testId, assignment.variantId);
      assignment.exposureLogged = true;
    }

    // Get variant
    return test.variants.find(v => v.id === assignment!.variantId) || null;
  }

  // Get variant config
  public getVariantConfig(testId: string, key: string, defaultValue: any = null): any {
    const variant = this.getVariant(testId);
    if (!variant) return defaultValue;
    
    return variant.config[key] ?? defaultValue;
  }

  // Check if user is in test
  public isInTest(testId: string): boolean {
    return this.getVariant(testId) !== null;
  }

  // Log exposure (when user sees the variant)
  public logExposure(testId: string, variantId: string) {
    const assignment = this.assignments.get(testId);
    if (assignment) {
      assignment.exposureLogged = true;
    }

    // Track exposure event
    this.trackEvent('ab_test_exposure', {
      test_id: testId,
      variant_id: variantId,
      user_id: this.userId,
      session_id: this.sessionId
    });
  }

  // Track conversion/result
  public trackConversion(testId: string, metric: string, value: number = 1) {
    const assignment = this.assignments.get(testId);
    if (!assignment) return;

    const result: ABTestResult = {
      testId,
      variantId: assignment.variantId,
      metric,
      value,
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString()
    };

    this.results.push(result);

    // Send to API
    this.sendResult(result);

    // Track conversion event
    this.trackEvent('ab_test_conversion', {
      test_id: testId,
      variant_id: assignment.variantId,
      metric,
      value,
      user_id: this.userId,
      session_id: this.sessionId
    });
  }

  // Get test analytics
  public async getAnalytics(testId: string): Promise<ABTestAnalytics | null> {
    if (!this.config.apiEndpoint) return null;

    try {
      const response = await fetch(`${this.config.apiEndpoint}/tests/${testId}/analytics`);
      return await response.json();
    } catch (error) {
      console.warn('Failed to load test analytics:', error);
      return null;
    }
  }

  // Get all active tests
  public getActiveTests(): ABTest[] {
    return Array.from(this.tests.values()).filter(test => test.status === 'running');
  }

  // Get user's assignments
  public getUserAssignments(): ABTestAssignment[] {
    return Array.from(this.assignments.values());
  }

  private shouldIncludeUser(test: ABTest): boolean {
    // Check traffic percentage
    const hash = this.hashUserId(this.userId || this.sessionId);
    const userPercentile = hash % 100;
    
    if (userPercentile >= test.traffic) {
      return false;
    }

    // Check targeting rules
    if (test.targetingRules && test.targetingRules.length > 0) {
      return this.evaluateTargetingRules(test.targetingRules);
    }

    return true;
  }

  private evaluateTargetingRules(rules: TargetingRule[]): boolean {
    if (rules.length === 0) return true;

    let result = true;
    let currentLogicalOperator = 'AND';

    for (const rule of rules) {
      const ruleResult = this.evaluateRule(rule);
      
      if (currentLogicalOperator === 'AND') {
        result = result && ruleResult;
      } else {
        result = result || ruleResult;
      }

      currentLogicalOperator = rule.logicalOperator || 'AND';
    }

    return result;
  }

  private evaluateRule(rule: TargetingRule): boolean {
    let propertyValue: any;

    switch (rule.type) {
      case 'user_property':
        // This would typically come from user context
        propertyValue = this.getUserProperty(rule.property);
        break;
      case 'location':
        propertyValue = this.getLocationProperty(rule.property);
        break;
      case 'device':
        propertyValue = this.getDeviceProperty(rule.property);
        break;
      case 'time':
        propertyValue = this.getTimeProperty(rule.property);
        break;
      case 'custom':
        propertyValue = this.getCustomProperty(rule.property);
        break;
      default:
        return false;
    }

    switch (rule.operator) {
      case 'equals':
        return propertyValue === rule.value;
      case 'not_equals':
        return propertyValue !== rule.value;
      case 'contains':
        return String(propertyValue).includes(String(rule.value));
      case 'greater_than':
        return Number(propertyValue) > Number(rule.value);
      case 'less_than':
        return Number(propertyValue) < Number(rule.value);
      case 'in':
        return Array.isArray(rule.value) && rule.value.includes(propertyValue);
      case 'not_in':
        return Array.isArray(rule.value) && !rule.value.includes(propertyValue);
      default:
        return false;
    }
  }

  private assignVariant(test: ABTest): ABTestAssignment | null {
    // Calculate cumulative weights
    const cumulativeWeights: { variantId: string; weight: number }[] = [];
    let totalWeight = 0;

    for (const variant of test.variants) {
      totalWeight += variant.weight;
      cumulativeWeights.push({
        variantId: variant.id,
        weight: totalWeight
      });
    }

    // Generate deterministic random number based on user/session
    const hash = this.hashUserId(this.userId || this.sessionId, test.id);
    const randomValue = (hash % 10000) / 100; // 0-99.99

    // Find variant based on weight
    const selectedVariant = cumulativeWeights.find(v => randomValue < v.weight);
    if (!selectedVariant) return null;

    return {
      testId: test.id,
      variantId: selectedVariant.variantId,
      userId: this.userId,
      sessionId: this.sessionId,
      assignedAt: new Date().toISOString(),
      exposureLogged: false
    };
  }

  private hashUserId(userId: string, salt: string = ''): number {
    const str = userId + salt;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private validateTest(test: ABTest): void {
    // Validate variants
    if (!test.variants || test.variants.length === 0) {
      throw new Error('Test must have at least one variant');
    }

    // Validate weights sum to 100
    const totalWeight = test.variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new Error('Variant weights must sum to 100');
    }

    // Validate control variant
    const controlVariants = test.variants.filter(v => v.isControl);
    if (controlVariants.length !== 1) {
      throw new Error('Test must have exactly one control variant');
    }

    // Validate traffic percentage
    if (test.traffic < 0 || test.traffic > 100) {
      throw new Error('Traffic percentage must be between 0 and 100');
    }
  }

  private reevaluateAssignments() {
    // This could be used to reassign users when targeting rules change
    // For now, we'll keep existing assignments stable
  }

  // Helper methods for property evaluation
  private getUserProperty(property: string): any {
    // This would integrate with your user management system
    return null;
  }

  private getLocationProperty(property: string): any {
    if (typeof navigator === 'undefined') return null;
    
    switch (property) {
      case 'language':
        return navigator.language;
      case 'timezone':
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
      default:
        return null;
    }
  }

  private getDeviceProperty(property: string): any {
    if (typeof navigator === 'undefined') return null;
    
    switch (property) {
      case 'platform':
        return navigator.platform;
      case 'userAgent':
        return navigator.userAgent;
      case 'mobile':
        return /Mobi|Android/i.test(navigator.userAgent);
      default:
        return null;
    }
  }

  private getTimeProperty(property: string): any {
    const now = new Date();
    
    switch (property) {
      case 'hour':
        return now.getHours();
      case 'day':
        return now.getDay();
      case 'date':
        return now.toDateString();
      default:
        return null;
    }
  }

  private getCustomProperty(property: string): any {
    // This would integrate with your custom property system
    return null;
  }

  private async sendResult(result: ABTestResult) {
    if (!this.config.apiEndpoint) return;

    try {
      await fetch(`${this.config.apiEndpoint}/tests/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
      });
    } catch (error) {
      console.warn('Failed to send test result:', error);
    }
  }

  private trackEvent(eventName: string, properties: Record<string, any>) {
    // This would integrate with your analytics system
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track(eventName, properties);
    }
  }

  public destroy() {
    this.saveAssignmentsToStorage();
  }
}

// Utility functions for common A/B tests
export const createButtonColorTest = (testName: string, colors: string[]): Omit<ABTest, 'id' | 'created'> => {
  const variants: ABVariant[] = colors.map((color, index) => ({
    id: uuidv4(),
    name: `Button Color ${color}`,
    description: `Button with ${color} background`,
    weight: Math.round(100 / colors.length),
    config: { buttonColor: color },
    isControl: index === 0
  }));

  return {
    name: testName,
    description: `Test different button colors: ${colors.join(', ')}`,
    status: 'draft',
    startDate: new Date().toISOString(),
    traffic: 100,
    variants,
    metrics: ['click_through_rate', 'conversion_rate'],
    createdBy: 'system'
  };
};

export const createPaymentFlowTest = (testName: string): Omit<ABTest, 'id' | 'created'> => {
  return {
    name: testName,
    description: 'Test different payment flow variations',
    status: 'draft',
    startDate: new Date().toISOString(),
    traffic: 50, // Only test on 50% of users for payment flows
    variants: [
      {
        id: uuidv4(),
        name: 'Current Flow',
        description: 'Existing payment flow',
        weight: 50,
        config: { paymentFlow: 'current' },
        isControl: true
      },
      {
        id: uuidv4(),
        name: 'Simplified Flow',
        description: 'Simplified 2-step payment flow',
        weight: 50,
        config: { paymentFlow: 'simplified', steps: 2 },
        isControl: false
      }
    ],
    metrics: ['conversion_rate', 'completion_time', 'abandonment_rate'],
    createdBy: 'system'
  };
};

// Global A/B testing instance
let abTestingInstance: ABTestingFramework | null = null;

export const initializeABTesting = (config?: ABTestingConfig): ABTestingFramework => {
  if (!abTestingInstance) {
    abTestingInstance = new ABTestingFramework(config);
  }
  return abTestingInstance;
};

export const getABTesting = (): ABTestingFramework | null => {
  return abTestingInstance;
};

export default ABTestingFramework;