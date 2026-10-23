'use client';

import { useItem } from 'parsistent/react';
import { useEffect, useRef } from 'react';
import { local } from './stores';

/**
 * localStorage is not sent to the server: this renders the default (0) on the server and
 * during hydration, then the stored value. useItem makes that switch without a mismatch.
 */
export function Visits() {
  const [visits, setVisits] = useItem(local, 'visits');
  // Count once per page load: in development, StrictMode runs effects twice
  const counted = useRef(false);

  useEffect(() => {
    if (counted.current) {
      return;
    }
    counted.current = true;
    setVisits((count) => count + 1);
  }, [setVisits]);

  return (
    <section>
      <span>
        Visits in this browser: <strong>{visits}</strong>
      </span>
      <button onClick={() => setVisits(null)}>Reset</button>
    </section>
  );
}
