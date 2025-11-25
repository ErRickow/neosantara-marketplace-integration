import { z } from "zod";
import { stringify } from "querystring";
import { fetchVercelApi } from "./api";
import { env } from "../env";

const IntegrationsExternalTokenResponse = z.object({
  token_type: z.string(),
  access_token: z.string(),
  installation_id: z.string(),
  user_id: z.string(),
  team_id: z.string().nullable(),
});

export async function exchangeExternalCodeForToken(
  code: string,
  redirectUri: string,
): Promise<z.TypeOf<typeof IntegrationsExternalTokenResponse>> {
  return IntegrationsExternalTokenResponse.parse(
    await fetchVercelApi("/v2/oauth/access_token", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: stringify({
        code,
        client_id: env.INTEGRATION_CLIENT_ID,
        client_secret: env.INTEGRATION_CLIENT_SECRET,
        redirect_uri: redirectUri,
      }),
    }),
  );
}

const VercelUserSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string().nullable(),
    username: z.string(),
  }),
});

/**
 * Fetch authenticated user information from Vercel API
 * Uses the access token from installation
 */
export async function getVercelUser(accessToken: string): Promise<{
  id: string;
  email: string;
  name: string | null;
  username: string;
}> {
  const response = await fetch("https://api.vercel.com/v2/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Vercel user: ${response.status}`);
  }

  const data = await response.json();
  const parsed = VercelUserSchema.parse(data);
  return parsed.user;
}
