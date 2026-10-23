import { cookies } from 'next/headers';
import { appCookies } from './stores';
import { ThemeControls } from './theme-controls';
import { Visits } from './visits';

export default async function Page() {
  // Server components read cookies directly, fully typed
  const theme = appCookies.fromHeader(await cookies()).get('theme');

  return (
    <>
      <h1>parsistent + Next.js</h1>
      <p className="hint">
        Rendered on the server with <code>theme = &apos;{theme}&apos;</code>. Reload: no flash.
      </p>
      <ThemeControls />
      <Visits />
    </>
  );
}
