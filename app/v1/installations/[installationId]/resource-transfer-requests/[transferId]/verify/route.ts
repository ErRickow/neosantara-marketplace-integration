import { getTransferRequest, setTransferRequest } from '@/lib/partner';
import { NextRequest, NextResponse } from 'next/server';
import { Params, validateTransferId } from '../../utils';
import { withAuth } from '@/lib/vercel/auth';
import { buildError } from '@/lib/utils';

export const POST = withAuth(
    async (_oidcClaims, _request: NextRequest, { params }: { params: Promise<Params> }) => {
        const awaitedParams = await params;
        if (!validateTransferId(awaitedParams.transferId)) {
            return NextResponse.json(buildError('bad_request', 'Input has failed validation'), { status: 400 });
        }

        const matchingClaim = await getTransferRequest(
            awaitedParams.transferId,
        );

        // does claim exist?
        if (!matchingClaim) {
            return NextResponse.json(buildError('not_found', 'Transfer request not found'), { status: 404 });
        }


        // is the claim in a state that can be verified?
        const now = new Date().getTime();
        if (matchingClaim.status === 'complete') {
            return NextResponse.json(buildError('conflict', 'The provided transfer request has already been completed'), { status: 409 });
        }
        if (matchingClaim.expiration < now) {
            return NextResponse.json(buildError('conflict', 'The provided transfer request has expired'), { status: 409 });
        }

        const targetInstallations = new Set(matchingClaim.targetInstallationIds);
        targetInstallations.add(awaitedParams.installationId);

        await setTransferRequest({
            ...matchingClaim,
            status: 'verified',
            targetInstallationIds: [...(Array.from(targetInstallations))],
        })

        return NextResponse.json({});
    },
);
