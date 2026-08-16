import { NextRequest, NextResponse } from "next/server";
import { getAccessTokenFromRequest } from '@/lib/auth-cookies';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    
    const customerId = Number((await params).id);
    if(isNaN(customerId) || customerId <= 0){
         return NextResponse.json(
            { error: 'Invalid customer id'},
            { status: 400 }
        );
    }
    
    try{
        const body = await request.json();
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232'}/api/customers/${customerId}/verification/reject`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAccessTokenFromRequest(request) || ''}`
        },
        body: JSON.stringify(body)
        });

        if(!response.ok){
            const errorData = await response.json().catch(() => null);
            return NextResponse.json({ error: errorData?.error || 'Failed to reject customer verification' }, { status: response.status });
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            return new NextResponse(null, { status: response.status });
        }

        const text = await response.text();
        const data = text ? JSON.parse(text) : null;
        return NextResponse.json(data);

    } catch(error){
        console.error('Error rejecting customer verification:', error);
         return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
    }
}
