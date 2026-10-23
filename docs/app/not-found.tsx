import { NotFoundPage } from 'nextra-theme-docs';

/** 404 page, with a link to report the broken link on GitHub. */
export default function NotFound() {
  return (
    <NotFoundPage content="Report this broken link" labels="documentation">
      <h1>Page not found</h1>
    </NotFoundPage>
  );
}
