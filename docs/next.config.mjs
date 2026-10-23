import nextra from 'nextra';

const withNextra = nextra({
  // Pages live in `content/`, served from the site root
  contentDirBasePath: '/',
});

export default withNextra({
  // Static HTML for GitHub Pages
  output: 'export',
  // GitHub Pages serves the site under /parsistent/
  basePath: process.env.DOCS_BASE_PATH ?? '',
  images: { unoptimized: true },
  // `/api/index.html` instead of `/api.html`: works on GitHub Pages and any static server
  trailingSlash: true,
  turbopack: {
    // The repository root has its own package.json and lockfile: pin the app root to this folder
    root: import.meta.dirname,
    resolveAlias: {
      // Nextra 4.6 points this at a module Next.js 16 no longer ships; use our MDX components,
      // like Nextra's webpack configuration does
      'next-mdx-import-source-file': './mdx-components.tsx',
    },
  },
  // `install-links` copies parsistent into node_modules: it ships plain ESM, no transpiling needed
  reactStrictMode: true,
});
