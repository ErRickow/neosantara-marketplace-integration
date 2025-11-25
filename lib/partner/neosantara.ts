/**
 * Neosantara API Integration
 * Handles communication with Neosantara main API for user provisioning
 */

import { env } from '@/lib/env';

export interface NeosantaraUser {
  id: string;
  username: string;
  email: string;
}

export interface ProvisionUserResponse {
  status: boolean;
  data: {
    resourceId: string;
    apiKey: string;
    apiKeyId: string;
    user: NeosantaraUser;
    tier: string;
    isNewUser: boolean;
  };
}

export interface UsageStats {
  daily_usage: number;
  monthly_usage: number;
  daily_limit: number;
  monthly_limit: number;
  tier: string;
  is_active: boolean;
}

/**
 * Provision or link a user in Neosantara API
 * Uses email matching to link to existing accounts
 */
export async function provisionNeosantaraUser(
  email: string,
  vercelUserId: string,
  vercelTeamId: string | null,
  vercelUsername: string | null,
  tierName: string = 'Free'
): Promise<ProvisionUserResponse> {
  const response = await fetch(
    `${env.NEOSANTARA_API_URL}/internal/provision-vercel-user`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': env.NEOSANTARA_INTERNAL_SECRET,
      },
      body: JSON.stringify({
        email,
        vercelUserId,
        vercelTeamId,
        vercelUsername,
        tier: tierName,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to provision Neosantara user: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Get usage statistics for a user
 */
export async function getNeosantaraUsage(userId: string): Promise<UsageStats> {
  const response = await fetch(
    `${env.NEOSANTARA_API_URL}/internal/usage/${userId}`,
    {
      headers: {
        'X-Internal-Secret': env.NEOSANTARA_INTERNAL_SECRET,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get usage stats: ${response.status}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Deactivate an API key
 */
export async function deactivateNeosantaraKey(apiKey: string): Promise<void> {
  const response = await fetch(
    `${env.NEOSANTARA_API_URL}/internal/deactivate-key`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': env.NEOSANTARA_INTERNAL_SECRET,
      },
      body: JSON.stringify({ apiKey }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to deactivate key: ${response.status}`);
  }
}

/**
 * Update user tier
 */
export async function updateNeosantaraTier(
  userId: string,
  tierName: string
): Promise<void> {
  const response = await fetch(
    `${env.NEOSANTARA_API_URL}/internal/update-tier`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': env.NEOSANTARA_INTERNAL_SECRET,
      },
      body: JSON.stringify({ userId, tier: tierName }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to update tier: ${response.status}`);
  }
}
