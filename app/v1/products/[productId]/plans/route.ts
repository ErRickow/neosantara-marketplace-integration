import { NextResponse } from 'next/server';
export async function GET(
  request: Request, { params }: { params: { productId: string } }
) {
  // Fetch tiers from main Neosantara API
  const response = await fetch(
    `${process.env.NEOSANTARA_API_URL}/internal/tiers`,
    {
      headers: {
        'X-Internal-Secret': process.env.NEOSANTARA_INTERNAL_SECRET!,
      },
    }
  );
  const tiers = await response.json();
  // Transform to Vercel Marketplace format
  const plans = tiers.map((tier: any) => ({
    id: tier.id,
    name: tier.name,
    price: calculatePrice(tier.cost_per_1k_tokens, tier.monthly_limit),
    features: [
      `${tier.daily_limit.toLocaleString()} tokens/day`,
      `${tier.monthly_limit.toLocaleString()} tokens/month`,
      'All Indonesian models',
      tier.name === 'Pro' ? 'Priority support' : 'Community support',
    ],
  }));
  return NextResponse.json({ plans });
}