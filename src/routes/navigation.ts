import { flushSync } from 'react-dom';
import type { AroundNavHandler } from 'wouter';

import { canAnimateViewTransition } from '@utils';

export const navigateWithTransition: AroundNavHandler = (
  navigate,
  to,
  options
) => {
  const changesPage =
    new URL(to, window.location.href).pathname !== window.location.pathname;
  const go = () => {
    navigate(to, options);
    if (changesPage) window.scrollTo(0, 0);
  };
  if (!changesPage || !canAnimateViewTransition()) {
    go();
    return;
  }
  document.startViewTransition(() => flushSync(go));
};
