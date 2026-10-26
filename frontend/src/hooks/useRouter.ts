/**
 * Simple Domain — Hook de Enrutamiento Ligero SPA
 * Soporta rutas fijas, rutas de conversación (/c/:id) y detalle de fuentes (/data-sources/:id).
 * Menos de 180 líneas.
 */

import { useCallback, useEffect, useState } from 'react';

export type AppRoute =
  | '/'
  | '/data-sources'
  | '/patterns'
  | '/research'
  | '/settings'
  | '/analysis'
  | string;

const NAV_EVENT = 'simple-domain:navigate';

export function useRouter() {
  const getNormalizedPath = (): string => {
    const p = window.location.pathname;
    const search = window.location.search;
    const params = new URLSearchParams(search);

    if (params.get('c')) {
      return `/c/${params.get('c')}`;
    }

    if (p.startsWith('/c/')) {
      return p;
    }

    if (p.startsWith('/data-sources')) {
      if (params.get('id')) {
        return `/data-sources/${params.get('id')}`;
      }
      return p;
    }

    if (
      p === '/patterns' ||
      p === '/research' ||
      p === '/settings' ||
      p === '/analysis'
    ) {
      return p;
    }
    return '/';
  };

  const [currentRoute, setCurrentRoute] = useState<string>(getNormalizedPath);

  const extractConversationId = (route: string): string | null => {
    if (route.startsWith('/c/')) {
      return route.replace('/c/', '').trim() || null;
    }
    return null;
  };

  const extractSourceId = (route: string): string | null => {
    if (route.startsWith('/data-sources/')) {
      const part = route.replace('/data-sources/', '').trim();
      return part && part !== 'details' ? part : null;
    }
    return null;
  };

  const [conversationId, setConversationId] = useState<string | null>(() =>
    extractConversationId(getNormalizedPath())
  );
  const [sourceId, setSourceId] = useState<string | null>(() =>
    extractSourceId(getNormalizedPath())
  );

  useEffect(() => {
    const onPopState = () => {
      const path = getNormalizedPath();
      setCurrentRoute(path);
      setConversationId(extractConversationId(path));
      setSourceId(extractSourceId(path));
    };
    window.addEventListener('popstate', onPopState);
    window.addEventListener(NAV_EVENT, onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener(NAV_EVENT, onPopState);
    };
  }, []);

  const navigate = useCallback((route: string, replace = false) => {
    const currentFull = window.location.pathname;
    if (currentFull !== route) {
      if (replace) {
        window.history.replaceState({}, '', route);
      } else {
        window.history.pushState({}, '', route);
      }
      setCurrentRoute(route);
      setConversationId(extractConversationId(route));
      setSourceId(extractSourceId(route));
      // Sincroniza el resto de instancias del hook (p. ej. App vs. vistas hijas)
      window.dispatchEvent(new Event(NAV_EVENT));
    }
  }, []);

  return { currentRoute, conversationId, sourceId, navigate };
}
