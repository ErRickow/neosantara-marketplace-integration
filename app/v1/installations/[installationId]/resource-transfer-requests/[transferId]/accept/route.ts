import { NextRequest, NextResponse } from 'next/server';
import { getTransferRequest, setTransferRequest, transferResource } from '@/lib/partner';
import { Params, validateTransferId } from '../../utils';
import { withAuth } from '@/lib/vercel/auth';
import { buildError } from '@/lib/utils';

export const POST = withAuth(
    async (_oidcClaims, _request: NextRequest, { params }: { params: Promise<Params> }) => {
        const awaitedParams = await params;
        if (!validateTransferId(awaitedParams.transferId)) {
            return NextResponse.json(buildError('bad_request', 'Invalid ID'), { status: 400 });
        }

        const matchingClaim = await getTransferRequest(
            awaitedParams.transferId,
        );

        // does claim exist?
        if (!matchingClaim) {
            return NextResponse.json(buildError('not_found', 'Transfer request not found'), { status: 404 });
        }
    
        // does the target installation ID match?
        if (!matchingClaim.targetInstallationIds.some(id => id === awaitedParams.installationId)) {
            return NextResponse.json(buildError('bad_request', 'Invalid target installation ID'), { status: 400 });
        }

        // idemoptentcy - no need to re-complete
        if (matchingClaim.status === 'complete' && awaitedParams.installationId === matchingClaim.claimedByInstallationId) {
            return new NextResponse( null, { status: 200 });
        }

        // is the claim in a state that can be completed?
        const now = new Date().getTime();
        if (matchingClaim.status !== 'verified') {
            return NextResponse.json(buildError('conflict', 'The provided transfer request has not been verified for the target installation'), { status: 409 });
        }
        if(matchingClaim.expiration < now) {
            return NextResponse.json(buildError('conflict', 'The provided transfer request has expired'), { status: 409 });
        }

        for (const resourceId of matchingClaim.resourceIds) {
          transferResource(matchingClaim.sourceInstallationId, resourceId, awaitedParams.installationId);
        }

        await setTransferRequest({
            ...matchingClaim,
            status: 'complete',
            claimedByInstallationId: awaitedParams.installationId,
        })

        return new NextResponse(null, { status: 200 });
    },
);
