'use client';

import { Toaster as SonnerToaster, toast } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      gap={10}
      offset={20}
      duration={4500}
      toastOptions={{
        style: {
          fontFamily: 'var(--font-body)',
          fontSize: 13.5,
          letterSpacing: -0.05,
        },
        classNames: {
          toast:        'weave-toast',
          title:        'weave-toast-title',
          description:  'weave-toast-desc',
          success:      'weave-toast-success',
          error:        'weave-toast-error',
          info:         'weave-toast-info',
          warning:      'weave-toast-warning',
          actionButton: 'weave-toast-action',
          cancelButton: 'weave-toast-cancel',
          closeButton:  'weave-toast-close',
        },
      }}
    />
  );
}

export { toast };
