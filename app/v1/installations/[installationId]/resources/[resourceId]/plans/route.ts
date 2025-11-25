import { getResourceBillingPlans } from "@/lib/partner";
import { withAuth } from "@/lib/vercel/auth";
import { NextRequest, NextResponse } from "next/server";

interface Params {
  installationId: string;
  resourceId: string;
}

export const GET = withAuth(
  async (claims, _request: NextRequest, { params }: { params: Promise<Params> }) => {
    const { resourceId } = await params;
    const response = await getResourceBillingPlans(
      claims.installation_id,
      resourceId,
    );

    return NextResponse.json(response);
  },
);
