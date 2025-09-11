import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  // Main documentation sidebar
  docsSidebar: [
    {
      type: 'doc',
      id: 'intro',
      label: 'Introduction',
    },
    {
      type: 'category',
      label: 'Getting Started',
      collapsible: true,
      collapsed: false,
      items: [
        'getting-started/quickstart',
        // More getting started docs will be added here
      ],
    },
    // More categories will be added as we create more documents
  ],

  // API Reference sidebar  
  apiSidebar: [
    {
      type: 'doc',
      id: 'api/overview',
      label: 'API Overview',
    },
    // API endpoints will be added here as they are created
  ],

  // SDK Reference sidebar
  sdkSidebar: [
    {
      type: 'doc',
      id: 'sdk/overview',
      label: 'SDK Overview',
    },
    {
      type: 'category',
      label: 'JavaScript SDK',
      collapsible: true,
      collapsed: false,
      items: [
        'sdk/javascript/installation',
        // More JavaScript SDK docs will be added here
      ],
    },
    // More SDK categories will be added here
  ],

  // Integrations sidebar
  integrationsSidebar: [
    {
      type: 'doc',
      id: 'integrations/overview',
      label: 'Integration Overview',
    },
    // Integration guides will be added here as they are created
  ],
};

export default sidebars;