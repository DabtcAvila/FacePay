import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'FacePay Documentation',
  tagline: 'Biometric Authentication Made Simple - Secure, Fast, Universal',
  favicon: 'img/facepay-favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://docs.facepay.com',
  baseUrl: '/',

  organizationName: 'facepay',
  projectName: 'facepay-docs',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'pt'],
  },

  plugins: [
    [
      'docusaurus-plugin-openapi-docs',
      {
        id: "api",
        docsPluginId: "classic",
        config: {
          facepay: {
            specPath: "../src/lib/openapi-spec.ts",
            outputDir: "docs/api",
            sidebarOptions: {
              groupPathsBy: "tag",
            },
          },
        },
      },
    ],
    '@docusaurus/plugin-ideal-image',
    [
      'docusaurus-lunr-search',
      {
        languages: ['en', 'es', 'pt'],
        indexBaseUrl: true
      }
    ],
  ],

  themes: [
    'docusaurus-theme-openapi-docs',
    '@docusaurus/theme-live-codeblock'
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/facepay/docs/tree/main/',
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          editUrl: 'https://github.com/facepay/docs/tree/main/',
          blogTitle: 'FacePay Engineering Blog',
          blogDescription: 'Technical insights and updates from the FacePay team',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
        gtag: {
          trackingID: 'G-FACEPAY123', // Replace with actual GA ID
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/facepay-social-card.jpg',
    metadata: [
      {name: 'keywords', content: 'biometric authentication, WebAuthn, facial recognition, payment API, SDK'},
      {name: 'twitter:card', content: 'summary_large_image'},
    ],
    navbar: {
      title: 'FacePay',
      logo: {
        alt: 'FacePay Logo',
        src: 'img/facepay-logo.svg',
        srcDark: 'img/facepay-logo-dark.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          type: 'docSidebar',
          sidebarId: 'apiSidebar',
          position: 'left',
          label: 'API Reference',
        },
        {
          type: 'docSidebar',
          sidebarId: 'sdkSidebar',
          position: 'left',
          label: 'SDK',
        },
        {
          type: 'docSidebar',
          sidebarId: 'integrationsSidebar',
          position: 'left',
          label: 'Integrations',
        },
        {to: '/playground', label: 'Playground', position: 'left'},
        {to: '/blog', label: 'Blog', position: 'left'},
        {
          type: 'localeDropdown',
          position: 'right',
        },
        {
          type: 'docsVersionDropdown',
          position: 'right',
        },
        {
          href: 'https://github.com/facepay/sdk',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://dashboard.facepay.com',
          label: 'Dashboard',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      logo: {
        alt: 'FacePay Logo',
        src: 'img/facepay-logo-white.svg',
        href: 'https://facepay.com',
        width: 160,
        height: 40,
      },
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Quick Start',
              to: '/docs/getting-started',
            },
            {
              label: 'API Reference',
              to: '/docs/api',
            },
            {
              label: 'SDK Documentation',
              to: '/docs/sdk',
            },
            {
              label: 'Integrations',
              to: '/docs/integrations',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Discord',
              href: 'https://discord.gg/facepay',
            },
            {
              label: 'Stack Overflow',
              href: 'https://stackoverflow.com/questions/tagged/facepay',
            },
            {
              label: 'X (Twitter)',
              href: 'https://x.com/facepaydev',
            },
            {
              label: 'LinkedIn',
              href: 'https://linkedin.com/company/facepay',
            },
          ],
        },
        {
          title: 'Resources',
          items: [
            {
              label: 'Blog',
              to: '/blog',
            },
            {
              label: 'Changelog',
              to: '/changelog',
            },
            {
              label: 'Status',
              href: 'https://status.facepay.com',
            },
            {
              label: 'Support',
              href: 'https://support.facepay.com',
            },
          ],
        },
        {
          title: 'Company',
          items: [
            {
              label: 'About',
              href: 'https://facepay.com/about',
            },
            {
              label: 'Privacy',
              href: 'https://facepay.com/privacy',
            },
            {
              label: 'Terms',
              href: 'https://facepay.com/terms',
            },
            {
              label: 'Security',
              href: 'https://facepay.com/security',
            },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} FacePay Inc. All rights reserved. Built with ❤️ and Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'diff', 'json', 'javascript', 'typescript', 'jsx', 'tsx', 'python', 'java', 'swift', 'kotlin'],
    },
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    announcementBar: {
      id: 'announcement-bar',
      content:
        '⭐️ If you like FacePay, give it a star on <a target="_blank" rel="noopener noreferrer" href="https://github.com/facepay/sdk">GitHub</a>! ⭐️',
      backgroundColor: '#fafbfc',
      textColor: '#091E42',
      isCloseable: false,
    },
    tableOfContents: {
      minHeadingLevel: 2,
      maxHeadingLevel: 5,
    },
    docs: {
      sidebar: {
        hideable: true,
        autoCollapseCategories: true,
      },
    },
  } satisfies Preset.ThemeConfig,
};

export default config;