import { NextRequest, NextResponse } from "next/server";
import { getAccessTokenFromRequest } from '@/lib/auth-cookies';

export async function GET(request: NextRequest){
    try{
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://139.59.140.232'}/api/customers/verification-statuses` , {
    method: 'GET',
    headers: { 
        'Authorization': `Bearer ${getAccessTokenFromRequest(request) || ''}`,
     }
     });

     if(!response.ok){
     const errorData = await response.json().catch(() => null);
     return NextResponse.json({ error: 'Failed to fetch verification statuses' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

    } catch(error){
        console.error('Error fetching verification statuses:', error);
        return NextResponse.json({ error: 'Failed to fetch verification statuses' }, { status: 500 });

    }
}