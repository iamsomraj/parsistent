import { useMDXComponents as getThemeComponents } from 'nextra-theme-docs';
import type { MDXComponents } from 'nextra/mdx-components';

const themeComponents = getThemeComponents();

/** Components available in every MDX page: the docs theme's, plus page overrides. */
export function useMDXComponents(components?: MDXComponents): MDXComponents {
  return { ...themeComponents, ...components };
}
