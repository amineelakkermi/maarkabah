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
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232'}/api/customers/${customerId}/blacklist`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAccessTokenFromRequest(request) || ''}`
        },
        body: JSON.stringify(body)
        });

        if(!response.ok){
            const errorText = await response.text().catch(() => '');
            const errorData = errorText ? JSON.parse(errorText) : null;
            return NextResponse.json({ error: errorData?.error || errorData?.title || 'Failed to add customer to blacklist' }, { status: response.status });
        }

        const text = await response.text().catch(() => '');
        return NextResponse.json(text ? JSON.parse(text) : { success: true });

    } catch(error){
        console.error('Error adding customer to blacklist:', error);
         return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    
    const customerId = Number((await params).id);
    if(isNaN(customerId) || customerId <= 0){
         return NextResponse.json(
            { error: 'Invalid customer id'},
            { status: 400 }
        );
    }
    
    try{
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232'}/api/customers/${customerId}/blacklist`, {
        method: 'DELETE',
        headers: {
        'Authorization': `Bearer ${getAccessTokenFromRequest(request) || ''}`
        },
        });

        if(!response.ok){
            const errorText = await response.text().catch(() => '');
            const errorData = errorText ? JSON.parse(errorText) : null;
            return NextResponse.json({ error: errorData?.error || errorData?.title || 'Failed to remove customer from blacklist' }, { status: response.status });
        }

        const text = await response.text().catch(() => '');
        return NextResponse.json(text ? JSON.parse(text) : { success: true });

    } catch(error){
        console.error('Error removing customer from blacklist:', error);
         return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
    }
}
