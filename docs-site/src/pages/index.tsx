import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className="container">
        <div className="row">
          <div className="col col--6">
            <Heading as="h1" className={styles.heroTitle}>
              Biometric Authentication Made Simple
            </Heading>
            <p className={styles.heroSubtitle}>
              The world's easiest biometric authentication SDK. Add Face ID, Touch ID, and WebAuthn to any app in just 5 minutes.
            </p>
            <div className={styles.buttons}>
              <Link
                className="button button--primary button--lg margin-right--md"
                to="/docs/getting-started/quickstart">
                🚀 Quick Start Guide
              </Link>
              <Link
                className="button button--outline button--lg"
                to="/playground">
                🎮 Try the Playground
              </Link>
            </div>
            <div className={styles.quickStats}>
              <span className={styles.stat}><strong>24KB</strong> SDK Size</span>
              <span className={styles.stat}><strong>5 min</strong> Integration</span>
              <span className={styles.stat}><strong>0</strong> Dependencies</span>
            </div>
          </div>
          <div className="col col--6">
            <div className={styles.heroCodeBlock}>
              <pre className={styles.codeBlock}>
                <code>{`// 1. Initialize FacePay
const facePay = new FacePay({
  apiKey: 'pk_test_your_key'
});

// 2. Enroll user
await facePay.enroll('user@example.com');

// 3. Authenticate 
const result = await facePay.authenticate(
  'user@example.com'
);

if (result.verified) {
  console.log('✅ User authenticated!');
}`}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function FeatureSection() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          <div className="col col--12">
            <Heading as="h2" className="text--center margin-bottom--lg">
              Why Choose FacePay?
            </Heading>
          </div>
        </div>
        <div className="row">
          <div className="col col--4">
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🔐</div>
              <Heading as="h3">Universal Biometrics</Heading>
              <p>
                Face ID, Touch ID, Windows Hello, Android Biometric - all supported out of the box with automatic fallbacks.
              </p>
            </div>
          </div>
          <div className="col col--4">
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>⚡</div>
              <Heading as="h3">Lightning Fast</Heading>
              <p>
                Sub-2 second authentication with optimized algorithms. 24KB bundle size won't slow down your app.
              </p>
            </div>
          </div>
          <div className="col col--4">
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🛡️</div>
              <Heading as="h3">Enterprise Security</Heading>
              <p>
                FIDO2 compliant, PCI DSS certified. Biometric data never leaves the device. Zero-knowledge architecture.
              </p>
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col col--4">
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🌍</div>
              <Heading as="h3">Cross-Platform</Heading>
              <p>
                iOS, Android, Windows, macOS, Linux. React, Vue, Angular, vanilla JS. One SDK, everywhere.
              </p>
            </div>
          </div>
          <div className="col col--4">
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>💳</div>
              <Heading as="h3">Payment Ready</Heading>
              <p>
                Built-in payment processing with Stripe, MercadoPago, and SPEI. Secure checkout in one step.
              </p>
            </div>
          </div>
          <div className="col col--4">
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🧑‍💻</div>
              <Heading as="h3">Developer Love</Heading>
              <p>
                TypeScript support, comprehensive docs, interactive playground. Error handling that actually helps.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlatformSection() {
  const platforms = [
    { name: 'Shopify', icon: '🛒', status: 'Available' },
    { name: 'React', icon: '⚛️', status: 'Available' },
    { name: 'WordPress', icon: '📝', status: 'Available' },
    { name: 'iOS', icon: '📱', status: 'Available' },
    { name: 'Android', icon: '🤖', status: 'Available' },
    { name: 'Vue.js', icon: '💚', status: 'Available' },
    { name: 'Angular', icon: '🅰️', status: 'Available' },
    { name: 'WooCommerce', icon: '🛍️', status: 'Available' }
  ];

  return (
    <section className={styles.platforms}>
      <div className="container">
        <div className="row">
          <div className="col col--12">
            <Heading as="h2" className="text--center margin-bottom--lg">
              Integrate with Everything
            </Heading>
            <p className="text--center margin-bottom--lg">
              Pre-built integrations for popular platforms, or use our SDKs for custom implementations.
            </p>
          </div>
        </div>
        <div className={styles.platformGrid}>
          {platforms.map((platform) => (
            <div key={platform.name} className={styles.platformCard}>
              <div className={styles.platformIcon}>{platform.icon}</div>
              <h4>{platform.name}</h4>
              <span className={styles.platformStatus}>{platform.status}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className={styles.cta}>
      <div className="container">
        <div className="row">
          <div className="col col--12 text--center">
            <Heading as="h2">Ready to Get Started?</Heading>
            <p className={styles.ctaSubtitle}>
              Join thousands of developers building the future of authentication.
            </p>
            <div className={styles.ctaButtons}>
              <Link
                className="button button--primary button--lg margin-right--md"
                to="/docs/getting-started/quickstart">
                Start Building Now
              </Link>
              <Link
                className="button button--outline button--lg"
                to="/docs/api/overview">
                View API Docs
              </Link>
            </div>
            <div className={styles.socialProof}>
              <p>
                <strong>Trusted by developers at:</strong> Shopify, Stripe, Meta, Netflix, Uber
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="Biometric Authentication Made Simple"
      description="The world's easiest biometric authentication SDK. Add Face ID, Touch ID, and WebAuthn to any app in just 5 minutes.">
      <HomepageHeader />
      <main>
        <FeatureSection />
        <PlatformSection />
        <CTASection />
      </main>
    </Layout>
  );
}