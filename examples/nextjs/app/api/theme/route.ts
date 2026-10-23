import { appCookies } from '../../stores';

/** Toggles the theme on the server: read with fromHeader(), write with serialize(). */
export function POST(request: Request) {
  const current = appCookies.fromHeader(request).get('theme');
  const next = current === 'light' ? 'dark' : 'light';
  return Response.json(
    { theme: next },
    { headers: { 'Set-Cookie': appCookies.serialize('theme', next) } }
  );
}
