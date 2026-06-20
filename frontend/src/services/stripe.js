import { loadStripe } from '@stripe/stripe-js';

const PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// Singleton: solo se carga una vez la librería de Stripe
let _stripePromise = null;
export const getStripe = () => {
  if (!_stripePromise) {
    if (!PK) console.error('⚠ Falta VITE_STRIPE_PUBLISHABLE_KEY en .env');
    _stripePromise = loadStripe(PK);
  }
  return _stripePromise;
};
