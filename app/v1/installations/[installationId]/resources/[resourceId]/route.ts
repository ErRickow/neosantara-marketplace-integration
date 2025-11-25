import { deleteResource, getResource, updateResource } from "@/lib/partner";
import { readRequestBodyWithSchema } from "@/lib/utils";
import { withAuth } from "@/lib/vercel/auth";
import { updateResourceRequestSchema } from "@/lib/vercel/schemas";
import { NextRequest, NextResponse } from "next/server";

interface Params {
  installationId: string;
  resourceId: string;
}

export const GET = withAuth(
  async (claims, _request: NextRequest, { params }: { params: Promise<Params> }) => {
    const { resourceId } = await params;
    const resource = await getResource(
      claims.installation_id,
      resourceId,
    );

    if (!resource) {
      return NextResponse.json(
        {
          error: true,
          code: "not_found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(resource);
  },
);

export const PATCH = withAuth(
  async (claims, request: NextRequest, { params }: { params: Promise<Params> }) => {
    const { resourceId } = await params;
    const requestBody = await readRequestBodyWithSchema(
      request,
      updateResourceRequestSchema,
    );

    if (!requestBody.success) {
      return new NextResponse(null, { status: 400 });
    }

    const updatedResource = await updateResource(
      claims.installation_id,
      resourceId,
      requestBody.data,
    );

    return NextResponse.json(updatedResource, {
      status: 200,
    });
  },
);

export const DELETE = withAuth(
  async (claims, _request: NextRequest, { params }: { params: Promise<Params> }) => {
    const { resourceId } = await params;
    await deleteResource(claims.installation_id, resourceId);

    return new NextResponse(null, { status: 204 });
  },
);
