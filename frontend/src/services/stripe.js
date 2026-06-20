import { loadStripe } from '@stripe/stripe-js';

const PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// cargamos stripe una sola vez para no duplicar la instancia
let _stripePromise = null;
export const getStripe = () => {
  if (!_stripePromise) {
    if (!PK) console.error('⚠ Falta VITE_STRIPE_PUBLISHABLE_KEY en .env');
    _stripePromise = loadStripe(PK);
  }
  return _stripePromise;
};
