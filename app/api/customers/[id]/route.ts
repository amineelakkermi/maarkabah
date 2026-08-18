import { NextRequest, NextResponse } from 'next/server';
import { getAccessTokenFromRequest } from '@/lib/auth-cookies';

export async function GET(request: NextRequest, {params}: {params: Promise<{id: string}>}) {
    const customerId = Number((await params).id);

    if(isNaN(customerId) || customerId <= 0){
     return NextResponse.json(
        { error: 'Invalid customer id'},
        { status: 400 }
    )
    }

    try{
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232'}/api/customers/${customerId}` , {
        method: "GET",
        headers: {
      'Authorization': `Bearer ${getAccessTokenFromRequest(request) || ''}`
      },
    });

    if(!response.ok){
        const errorData = await response.json().catch(() => null);
        return NextResponse.json({ error: 'Failed to fetch customer' }, { status: response.status });
    }

    const data = await response.json();
    console.log(`[DEBUG] GET /api/customers/${customerId} backend response:`, JSON.stringify(data, null, 2));
    return NextResponse.json(data);

    } catch(error){
        console.error('Error fetching customer:', error);
         return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );

    }

}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const customerId = Number((await params).id);
    if(isNaN(customerId) || customerId <= 0){
        return NextResponse.json({
            error: 'Invalid customer id',
        }, { status: 400 });
    }

    try{
        const body = await request.json();
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232'}/api/customers/${customerId}`, {
            method: "PUT",
            headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAccessTokenFromRequest(request) || ''}`,
            },

            body: JSON.stringify(body),
        
        });

        if(!response.ok){
            const responseText = await response.text().catch(() => '');
            let errorData = null;
            try { errorData = responseText ? JSON.parse(responseText) : null; } catch {}
            console.error('Backend update customer error:', response.status, responseText, errorData);
            return NextResponse.json(
              { error: errorData?.error || errorData?.message || 'Failed to update customer', details: errorData || responseText },
              { status: response.status }
            );
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            return new NextResponse(null, { status: response.status });
        }

        const text = await response.text();
        const data = text ? JSON.parse(text) : null;
        return NextResponse.json(data);

    }catch(error){
    console.error('Error updating customer:', error);
    return NextResponse.json(
    { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
    { status: 500 }
    );

    }
    
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const customerId = Number((await params).id);
    if(isNaN(customerId) || customerId <= 0){
        return NextResponse.json({
            error: 'Invalid customer id',
        }, { status: 400 });
    }

    try{
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232'}/api/customers/${customerId}`, {
            method: "DELETE",
            headers: {
            'Authorization': `Bearer ${getAccessTokenFromRequest(request) || ''}`,
            },
        });

        if(!response.ok){
            const errorData = await response.json().catch(() => null);
            return NextResponse.json({ error: errorData?.error || 'Failed to delete customer' }, { status: response.status });
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            return new NextResponse(null, { status: response.status });
        }

        const text = await response.text();
        const data = text ? JSON.parse(text) : null;
        return NextResponse.json(data);

    }catch(error){
    console.error('Error deleting customer:', error);
    return NextResponse.json(
    { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
    { status: 500 }
    );

    }
    
}