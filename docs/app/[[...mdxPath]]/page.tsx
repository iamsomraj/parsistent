import { generateStaticParamsFor, importPage } from 'nextra/pages';
import { useMDXComponents as getMDXComponents } from '../../mdx-components';

/** Every page of `content/`, pre-rendered for the static export. */
export const generateStaticParams = generateStaticParamsFor('mdxPath');

type PageProps = { params: Promise<{ mdxPath?: string[] }> };

export async function generateMetadata(props: PageProps) {
  const params = await props.params;
  const { metadata } = await importPage(params.mdxPath);
  return metadata;
}

type MDXWrapper = NonNullable<ReturnType<typeof getMDXComponents>['wrapper']>;

/** The docs theme's page wrapper (table of contents, metadata, edit link). */
function getWrapper(): MDXWrapper {
  const { wrapper } = getMDXComponents();
  if (!wrapper) {
    throw new Error('[docs] nextra-theme-docs did not provide an MDX wrapper');
  }
  return wrapper;
}

const Wrapper = getWrapper();

export default async function Page(props: PageProps) {
  const params = await props.params;
  const { default: MDXContent, toc, metadata, sourceCode } = await importPage(params.mdxPath);
  return (
    <Wrapper toc={toc} metadata={metadata} sourceCode={sourceCode}>
      <MDXContent {...props} params={params} />
    </Wrapper>
  );
}
