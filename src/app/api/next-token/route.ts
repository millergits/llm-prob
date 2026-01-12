import { NextResponse } from 'next/server';
import { getNextToken } from '@/lib/llm';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const prefix = body.prefix;
        const model = body.model || 'gemini-2.0-flash';

        if (typeof prefix !== 'string') {
            return NextResponse.json({ error: "Invalid prefix" }, { status: 400 });
        }

        console.log(`[${model}] Prefix:`, JSON.stringify(prefix));
        const data = await getNextToken(prefix, model);
        console.log("Top alternatives:", data.alternatives.slice(0, 3).map(a => `${a.token}: ${(a.probability * 100).toFixed(1)}%`));
        return NextResponse.json(data);
    } catch (error) {
        console.error("Next Token API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
