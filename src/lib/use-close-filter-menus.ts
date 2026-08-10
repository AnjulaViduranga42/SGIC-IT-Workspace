'use client';

import { useEffect } from 'react';

export function useCloseFilterMenus() {
  useEffect(() => {
    const closeExcept = (target: EventTarget | null) => {
      document.querySelectorAll<HTMLDetailsElement>('details[open]').forEach((menu) => {
        if (!(target instanceof Node) || !menu.contains(target)) menu.open = false;
      });
    };
    const onPointerDown = (event: PointerEvent) => closeExcept(event.target);
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') closeExcept(null); };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('pointerdown', onPointerDown); document.removeEventListener('keydown', onKeyDown); };
  }, []);
}
