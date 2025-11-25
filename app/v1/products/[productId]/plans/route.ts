import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

/**
 * Calculate monthly price based on cost per 1K tokens and monthly limit
 * Formula: (cost_per_1k_tokens * monthly_limit) / 1000
 */
function calculatePrice(costPer1kTokens: number, monthlyLimit: number): string {
  if (costPer1kTokens === 0 || monthlyLimit === -1) {
    return 'Free';
  }

  const monthlyPrice = (costPer1kTokens * monthlyLimit) / 1000;
  return `$${monthlyPrice.toFixed(2)}`;
}

/**
 * GET /v1/products/[productId]/plans
 * Returns billing plans for Neosantara AI
 * Called by Vercel when showing plan selection UI
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    await params;
    // Fetch tiers from main Neosantara API
    const response = await fetch(
      `${env.NEOSANTARA_API_URL}/internal/tiers`,
      {
        headers: {
          'X-Internal-Secret': env.NEOSANTARA_INTERNAL_SECRET,
        },
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch tiers from Neosantara API:', response.status);
      return NextResponse.json(
        { error: 'Failed to fetch billing plans' },
        { status: 500 }
      );
    }

    const tierData = await response.json();

    if (!tierData.status || !tierData.data) {
      console.error('Invalid response from Neosantara API:', tierData);
      return NextResponse.json(
        { error: 'Invalid response from API' },
        { status: 500 }
      );
    }

    const tiers = tierData.data;

    // Transform to Vercel Marketplace format
    const plans = tiers.map((tier: any) => ({
      id: tier.name.toLowerCase(), // Use lowercase name as ID
      scope: 'resource',
      name: tier.name,
      cost: calculatePrice(tier.cost_per_1k_tokens, tier.monthly_limit),
      type: 'subscription',
      description: `${tier.monthly_limit.toLocaleString()} tokens per month`,
      paymentMethodRequired: tier.cost_per_1k_tokens > 0,
      details: [
        { label: 'Daily limit', value: `${tier.daily_limit.toLocaleString()} tokens` },
        { label: 'Monthly limit', value: `${tier.monthly_limit.toLocaleString()} tokens` },
        { label: 'Models', value: 'All Indonesian models' },
      ],
      highlightedDetails: [
        { label: 'Support', value: tier.name === 'Pro' || tier.name === 'Enterprise' ? 'Priority' : 'Community' },
        { label: 'Rate limiting', value: 'Per-minute, per-hour, per-day' },
      ],
    }));

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Error fetching billing plans:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}