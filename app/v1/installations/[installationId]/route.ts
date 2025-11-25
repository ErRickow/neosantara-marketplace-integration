import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
export async function POST(
  request: Request, { params }: { params: { installationId: string } }
) {
  const body = await request.json();
  const { userId, teamId, configurationId, metadata } = body;
  // 1. Call Neosantara API to create user + API key
  const provisionResponse = await fetch(
    `${process.env.NEOSANTARA_API_URL}/internal/provision-vercel-user`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': process.env.NEOSANTARA_INTERNAL_SECRET!,
      },
      body: JSON.stringify({
        vercelUserId: userId,
        vercelTeamId: teamId,
        tier: metadata.plan || 'Free',
      }),
    }
  );
  const { apiKey, resourceId, user } = await provisionResponse.json();
  // 2. Store mapping in Redis
  await kv.set(`installation:${params.installationId}`, {
    resourceId,
    apiKey,
    userId: user.id,
    vercelUserId: userId,
    vercelTeamId: teamId,
    configurationId,
    createdAt: new Date().toISOString(),
  });
  // 3. Return to Vercel
  return NextResponse.json({
    resourceId,
    envVars: {
      NEOSANTARA_API_KEY: apiKey,
      NEOSANTARA_BASE_URL: process.env.NEOSANTARA_API_URL,
    },
  });
}
export async function GET(
  request: Request, { params }: { params: { installationId: string } }
) {
  // Get installation details + usage stats
  const installation = await
  kv.get(`installation:${params.installationId}`);
  if (!installation) {
    return NextResponse.json({ error: 'Not found' }, {
      status: 404
    });
  }
  // Fetch usage from main API
  const usageResponse = await fetch(
    `${process.env.NEOSANTARA_API_URL}/internal/usage/${installation.userId}`,
    {
      headers: {
        'X-Internal-Secret': process.env.NEOSANTARA_INTERNAL_SECRET!,
      },
    }
  );
  const usage = await usageResponse.json();
  return NextResponse.json({
    ...installation,
    usage,
  });
}
export async function DELETE(
  request: Request, { params }: { params: { installationId: string } }
) {
  // Deactivate API key
  const installation = await
  kv.get(`installation:${params.installationId}`);
  if (installation) {
    await fetch(
      `${process.env.NEOSANTARA_API_URL}/internal/deactivate-key`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': process.env.NEOSANTARA_INTERNAL_SECRET!,
        },
        body: JSON.stringify({ apiKey: installation.apiKey }),
      }
    );
    await kv.del(`installation:${params.installationId}`);
  }
  return NextResponse.json({ success: true });
}