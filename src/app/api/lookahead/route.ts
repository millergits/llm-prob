import { NextResponse } from 'next/server';
import { getTokenWithLookahead } from '@/lib/llm';

export async function POST(request: Request) {
    try {
        const { prefix, previewLength } = await request.json();

        if (!prefix) {
            return NextResponse.json({ error: 'Prefix is required' }, { status: 400 });
        }

        const result = await getTokenWithLookahead(prefix, previewLength || 5);
        return NextResponse.json(result);
    } catch (error) {
        console.error('Lookahead API Error:', error);
        return NextResponse.json(
            { error: 'Failed to get lookahead predictions', details: String(error) },
            { status: 500 }
        );
    }
}
