import Stripe from "stripe";

const apiKey =
  process.env.STRIPE_SECRET_KEY ||
  "sk_test_placeholder_for_nextjs_build_evaluation";

export const stripe = new Stripe(apiKey);
export default stripe;
