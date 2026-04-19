import React from 'react';
import ReactDOM from 'react-dom/client';
import { WeaveCheckout, MerchantBackdrop } from './index';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Demo />
  </React.StrictMode>,
);

function Demo() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0B0F0E' }}>
      <MerchantBackdrop currency="NGN" />
      <div style={{
        position: 'absolute', inset: 0, zIndex: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{ pointerEvents: 'auto' }}>
          <WeaveCheckout
            onSuccess={(txn) => console.log('payment complete', txn)}
            onError={(err) => console.error(err)}
          />
        </div>
      </div>
    </div>
  );
}
