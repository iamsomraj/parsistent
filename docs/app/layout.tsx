import { Head } from 'nextra/components';
import { getPageMap } from 'nextra/page-map';
import { Footer, Layout, Navbar } from 'nextra-theme-docs';
import type { ReactNode } from 'react';
import 'nextra-theme-docs/style.css';

export const metadata = {
  title: { default: 'parsistent', template: '%s – parsistent' },
  description:
    'Typed localStorage, sessionStorage and cookies, shaped like the browser APIs, with SSR-safe React hooks.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head color={{ hue: 160, saturation: 70 }} />
      <body>
        <Layout
          navbar={
            <Navbar
              logo={<b>parsistent</b>}
              projectLink="https://github.com/iamsomraj/parsistent"
            />
          }
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/iamsomraj/parsistent/tree/main/docs"
          footer={<Footer>MIT {new Date().getFullYear()} © Somraj Mukherjee</Footer>}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}
