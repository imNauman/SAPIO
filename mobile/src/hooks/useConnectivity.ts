import { useEffect, useState } from 'react';
import { onConnectivityChange } from '../lib/network';

/**
 * Connectivity hook.
 *
 * Why: Production hardening. Exposes the live online/offline state to any
 * screen so it can disable send buttons, show a banner, or queue actions while
 * offline. Reuses the NetInfo subscription from `lib/network`.
 */
export function useConnectivity(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const unsub = onConnectivityChange(setOnline);
    return unsub;
  }, []);

  return online;
}
