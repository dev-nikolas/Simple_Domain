/**
 * Simple Domain — Hook de Enrutamiento Ligero SPA
 * Soporta navegación con pushState, popstate y enlaces directos.
 */

import { useCallback, useEffect, useState } from 'react';

export type AppRoute = '/' | '/data-sources' | '/patterns' | '/research' | '/settings' | '/analysis';

export function useRouter() {
  const getNormalizedPath = (): AppRoute => {
    const p = window.location.pathname;
    if (
      p === '/data-sources' ||
      p === '/patterns' ||
      p === '/research' ||
      p === '/settings' ||
      p === '/analysis'
    ) {
      return p as AppRoute;
    }
    return '/';
  };

  const [currentRoute, setCurrentRoute] = useState<AppRoute>(getNormalizedPath);

  useEffect(() => {
    const onPopState = () => setCurrentRoute(getNormalizedPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((route: AppRoute) => {
    if (window.location.pathname !== route) {
      window.history.pushState({}, '', route);
      setCurrentRoute(route);
    }
  }, []);

  return { currentRoute, navigate };
}
