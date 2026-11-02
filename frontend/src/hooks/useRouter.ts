/**
 * Simple Domain — Hook de Enrutamiento Ligero SPA
 * Soporta ruta raíz (/) y rutas de conversación (/c/:id).
 */

import { useCallback, useEffect, useState } from 'react';

export type AppRoute = '/' | `/c/${string}` | string;

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

    return '/';
  };

  const [currentRoute, setCurrentRoute] = useState<string>(getNormalizedPath);

  const extractConversationId = (route: string): string | null => {
    if (route.startsWith('/c/')) {
      return route.replace('/c/', '').trim() || null;
    }
    return null;
  };

  const [conversationId, setConversationId] = useState<string | null>(() =>
    extractConversationId(getNormalizedPath())
  );

  useEffect(() => {
    const onPopState = () => {
      const path = getNormalizedPath();
      setCurrentRoute(path);
      setConversationId(extractConversationId(path));
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
      window.dispatchEvent(new Event(NAV_EVENT));
    }
  }, []);

  return { currentRoute, conversationId, navigate };
}

export default useRouter;
