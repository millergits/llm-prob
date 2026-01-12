import { NextResponse } from 'next/server';
import { getProbabilities } from '@/lib/llm';
import { PredictionRequest } from '@/lib/types';

export async function POST(request: Request) {
    try {
        const body: PredictionRequest = await request.json();

        if (!body.text && typeof body.text !== 'string') {
            return NextResponse.json({ error: "Invalid text input" }, { status: 400 });
        }

        const data = await getProbabilities(body.text);
        return NextResponse.json(data);
    } catch (error) {
        console.error("Prediction API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
