import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import { useState } from 'react';

import styles from './playground.module.css';

function PlaygroundDemo() {
  const [email, setEmail] = useState('demo@example.com');
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [logs, setLogs] = useState<string[]>(['🎮 FacePay Interactive Playground loaded']);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const checkSupport = async () => {
    setIsLoading(true);
    addLog('🔍 Checking biometric support...');
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (typeof window !== 'undefined' && 'PublicKeyCredential' in window) {
      setIsSupported(true);
      addLog('✅ WebAuthn supported! Device has biometric capabilities.');
    } else {
      setIsSupported(false);
      addLog('❌ WebAuthn not supported. Try on a modern browser with HTTPS.');
    }
    setIsLoading(false);
  };

  const simulateEnrollment = async () => {
    if (!email) {
      addLog('❌ Please enter an email address');
      return;
    }
    
    setIsLoading(true);
    addLog(`👤 Starting enrollment for ${email}...`);
    
    // Simulate enrollment process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    addLog('📷 Please look at your camera and follow biometric prompts');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    addLog('🔐 Biometric data captured successfully');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    addLog('✅ Enrollment completed! User can now authenticate with biometrics.');
    addLog('📄 Credential ID: cred_abc123...');
    addLog('🎯 Biometric Type: Face ID');
    
    setIsLoading(false);
  };

  const simulateAuthentication = async () => {
    if (!email) {
      addLog('❌ Please enter an email address');
      return;
    }
    
    setIsLoading(true);
    addLog(`🔓 Starting authentication for ${email}...`);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    addLog('📷 Please look at your camera...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    addLog('🔍 Verifying biometric data...');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    addLog('✅ Authentication successful!');
    addLog('👤 User verified with Face ID');
    addLog('⏱️ Authentication time: 1.8 seconds');
    
    setIsLoading(false);
  };

  const clearLogs = () => {
    setLogs(['🎮 FacePay Interactive Playground loaded']);
  };

  return (
    <div className={styles.playground}>
      <div className="container">
        <div className="row">
          <div className="col col--6">
            <div className={styles.demoPanel}>
              <Heading as="h3">Demo Controls</Heading>
              
              <div className={styles.inputGroup}>
                <label htmlFor="email">Email Address:</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className={styles.input}
                />
              </div>

              <div className={styles.buttonGroup}>
                <button
                  onClick={checkSupport}
                  disabled={isLoading}
                  className={`button button--outline ${styles.demoButton}`}
                >
                  1. Check Support
                </button>
                
                <button
                  onClick={simulateEnrollment}
                  disabled={isLoading || isSupported === false}
                  className={`button button--primary ${styles.demoButton}`}
                >
                  2. Enroll User
                </button>
                
                <button
                  onClick={simulateAuthentication}
                  disabled={isLoading || isSupported === false}
                  className={`button button--secondary ${styles.demoButton}`}
                >
                  3. Authenticate
                </button>
              </div>

              {isSupported !== null && (
                <div className={styles.supportStatus}>
                  {isSupported ? (
                    <div className={styles.supportedBadge}>
                      ✅ Biometric Support Detected
                    </div>
                  ) : (
                    <div className={styles.unsupportedBadge}>
                      ❌ Biometric Support Not Available
                    </div>
                  )}
                </div>
              )}

              <div className={styles.codeExample}>
                <Heading as="h4">Code Example</Heading>
                <pre className={styles.codeBlock}>
                  <code>{`// Initialize FacePay
const facePay = new FacePay({
  apiKey: 'pk_test_demo_key'
});

// Check support
const support = await facePay.isSupported();

// Enroll user
const enrollment = await facePay.enroll('${email}');

// Authenticate user  
const result = await facePay.authenticate('${email}');

if (result.verified) {
  console.log('User authenticated!');
}`}</code>
                </pre>
              </div>
            </div>
          </div>
          
          <div className="col col--6">
            <div className={styles.logsPanel}>
              <div className={styles.logsHeader}>
                <Heading as="h3">Live Demo Logs</Heading>
                <button
                  onClick={clearLogs}
                  className={`button button--sm button--outline ${styles.clearButton}`}
                >
                  Clear
                </button>
              </div>
              
              <div className={styles.logsContainer}>
                {logs.map((log, index) => (
                  <div key={index} className={styles.logEntry}>
                    {log}
                  </div>
                ))}
                {isLoading && (
                  <div className={`${styles.logEntry} ${styles.loading}`}>
                    ⏳ Processing...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Playground(): ReactNode {
  return (
    <Layout
      title="Interactive Playground"
      description="Try FacePay biometric authentication live in your browser. See how easy it is to integrate Face ID, Touch ID, and WebAuthn.">
      <main>
        <div className={styles.playgroundHeader}>
          <div className="container">
            <div className="row">
              <div className="col col--12 text--center">
                <Heading as="h1">🎮 Interactive Playground</Heading>
                <p className={styles.subtitle}>
                  Experience FacePay biometric authentication live in your browser. 
                  No signup required!
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <PlaygroundDemo />
        
        <div className={styles.playgroundFooter}>
          <div className="container">
            <div className="row">
              <div className="col col--12 text--center">
                <Heading as="h2">Ready to integrate?</Heading>
                <p>This playground demonstrates the core FacePay SDK functionality.</p>
                <div className={styles.footerButtons}>
                  <a href="/docs/getting-started/quickstart" className="button button--primary button--lg">
                    🚀 Start Building
                  </a>
                  <a href="/docs/sdk/overview" className="button button--outline button--lg">
                    📚 View SDK Docs
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}