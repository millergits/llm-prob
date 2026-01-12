import { GoogleGenerativeAI } from "@google/generative-ai";
import { PredictionResponse } from './types';

const SIMULATION_MODE = false;

export interface TokenData {
    token: string;
    prob: number;
    logprob: number;
    top_k: {
        token: string;
        logprob: number;
        prob: number;
    }[];
}

async function simulateProbabilities(text: string): Promise<{ tokens: TokenData[] }> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const simulatedResponse = ` allows us to solve complex problems.`;
    const words = simulatedResponse.split(" ");

    // Deterministic pseudo-random based on input length
    let seed = text.length;
    const random = () => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    };

    const tokens: TokenData[] = words.map(word => {
        const prob = 0.7 + (random() * 0.25); // High confidence
        const logprob = Math.log(prob);

        // Generate convincing alternatives
        const alts = [
            { token: " helps", prob: 0.1, logprob: Math.log(0.1) },
            { token: " enables", prob: 0.05, logprob: Math.log(0.05) },
            { token: " permits", prob: 0.02, logprob: Math.log(0.02) },
            { token: " lets", prob: 0.01, logprob: Math.log(0.01) },
        ];

        return {
            token: " " + word,
            prob,
            logprob,
            top_k: alts
        };
    });

    return { tokens };
}

const apiKey = process.env.GEMINI_API_KEY || "";

export async function getProbabilities(text: string): Promise<PredictionResponse> {
    if (SIMULATION_MODE) {
        console.log("Running in simulation mode, returning mock data.");
        return simulateProbabilities(text);
    }

    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text }] }],
            generationConfig: {
                responseLogprobs: true,
                logprobs: 5,
                maxOutputTokens: 20
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API Error ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    const candidate = result.candidates?.[0];

    if (!candidate || !candidate.logprobsResult) {
        // Fallback or empty if no logprobs
        return { tokens: [] };
    }

    const logprobs = candidate.logprobsResult;
    const chosen = logprobs.chosenCandidates || [];
    const topCandidates = logprobs.topCandidates || [];

    const tokens: TokenData[] = chosen.map((c: any, index: number) => {
        const alternatives = topCandidates[index]?.candidates || [];

        return {
            token: c.token,
            logprob: c.logProbability,
            prob: Math.exp(c.logProbability),
            top_k: alternatives.map((alt: any) => ({
                token: alt.token,
                logprob: alt.logProbability,
                prob: Math.exp(alt.logProbability)
            }))
        };
    });

    return { tokens };
}

// Get only the NEXT token alternatives for word-by-word generation
export interface Token {
    token: string;
    token_id: number;
    probability: number;
    log_probability: number;
    is_other: boolean;
}

export interface NextTokenResponse {
    alternatives: Token[];
}

/**
 * Convert log probabilities to probabilities using softmax.
 * Per FUNCTIONS_UTILITIES.md spec - uses max subtraction for numerical stability.
 */
function logprobsToProbs(candidates: { token: string; logProbability: number }[]): Token[] {
    if (candidates.length === 0) {
        return [];
    }

    // Extract log probabilities
    const logprobs = candidates.map(c => c.logProbability);

    // Find max for numerical stability (prevents overflow)
    const maxLogProb = Math.max(...logprobs);

    // Compute exp values (shifted by max)
    const expValues = logprobs.map(lp => Math.exp(lp - maxLogProb));

    // Sum of exp values (partition function)
    const sumExp = expValues.reduce((sum, val) => sum + val, 0);

    // Convert to probabilities and create Token objects
    return candidates.map((candidate, i) => ({
        token: candidate.token,
        token_id: i,
        probability: expValues[i] / sumExp,
        log_probability: candidate.logProbability,
        is_other: false
    }));
}

/**
 * Add "other" category for remaining probability mass.
 * Per FUNCTIONS_UTILITIES.md spec.
 */
function addOtherCategory(tokens: Token[], minProbability: number = 0.01): Token[] {
    // Calculate sum of current probabilities
    const totalProb = tokens.reduce((sum, t) => sum + t.probability, 0);

    // Calculate remaining probability
    const remainingProb = Math.max(0, 1.0 - totalProb);

    // Only add "other" if remaining probability is significant
    if (remainingProb >= minProbability) {
        const otherToken: Token = {
            token: "<OTHER>",
            token_id: -1,
            probability: remainingProb,
            log_probability: Math.log(remainingProb),
            is_other: true
        };

        return [...tokens, otherToken];
    }

    return tokens;
}

export async function getNextToken(prefix: string): Promise<NextTokenResponse> {
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    // System instruction to enforce pure text continuation (not chat/completion)
    const systemInstruction = `You are a text continuation engine. Your ONLY job is to continue the text that follows.
Do not start a new sentence. Do not add punctuation. Do not be helpful.
Simply predict what word or token comes immediately next in the sequence.
Continue from exactly where the text ends, maintaining the same case and style.`;

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: systemInstruction }] },
            contents: [{ parts: [{ text: prefix }] }],
            generationConfig: {
                responseLogprobs: true,
                logprobs: 20, // Per spec: get top 20 alternatives
                maxOutputTokens: 1
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API Error ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log("Raw API response topCandidates:", JSON.stringify(result.candidates?.[0]?.logprobsResult?.topCandidates?.[0]?.candidates?.slice(0, 5)));

    const candidate = result.candidates?.[0];

    if (!candidate || !candidate.logprobsResult) {
        return { alternatives: [] };
    }

    const topCandidates = candidate.logprobsResult.topCandidates?.[0]?.candidates || [];

    // Convert log probabilities to probabilities using proper softmax
    const tokens = logprobsToProbs(topCandidates);

    // Add "other" category for remaining probability mass
    const tokensWithOther = addOtherCategory(tokens);

    return { alternatives: tokensWithOther };
}

// Weighted random selection based on probabilities
export function selectWeighted(alternatives: { token: string; prob: number }[]): string {
    if (alternatives.length === 0) return "";

    const total = alternatives.reduce((sum, a) => sum + a.prob, 0);
    let random = Math.random() * total;

    for (const alt of alternatives) {
        random -= alt.prob;
        if (random <= 0) return alt.token;
    }

    return alternatives[0].token;
}

// Lookahead mode: For each token, generate a preview of where it leads
export interface LookaheadAlternative {
    token: string;
    prob: number;
    preview: string; // Full phrase preview (token + continuation)
}

export interface LookaheadResponse {
    alternatives: LookaheadAlternative[];
}

export async function getTokenWithLookahead(prefix: string, previewLength: number = 5): Promise<LookaheadResponse> {
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    // First, get the top token alternatives
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prefix }] }],
            generationConfig: {
                responseLogprobs: true,
                logprobs: 5, // Get top 5 for lookahead (less API calls)
                maxOutputTokens: 1
            }
        })
    });

    if (!response.ok) {
        throw new Error(`Gemini API Error ${response.status}`);
    }

    const result = await response.json();
    const candidate = result.candidates?.[0];

    if (!candidate || !candidate.logprobsResult) {
        return { alternatives: [] };
    }

    const topCandidates = candidate.logprobsResult.topCandidates?.[0]?.candidates || [];

    // Apply temperature scaling
    const temperature = 2.5;
    const rawAlts = topCandidates.map((alt: any) => ({
        token: alt.token,
        prob: Math.exp((alt.logProbability || 0) / temperature)
    }));

    const totalProb = rawAlts.reduce((sum: number, a: any) => sum + a.prob, 0);
    const normalizedAlts = rawAlts.map((a: any) => ({
        token: a.token,
        prob: totalProb > 0 ? a.prob / totalProb : 1 / rawAlts.length
    }));

    // For each alternative, generate a continuation preview
    const alternatives: LookaheadAlternative[] = await Promise.all(
        normalizedAlts.slice(0, 5).map(async (alt: { token: string; prob: number }) => {
            try {
                // Generate continuation from prefix + this token
                const fullPrefix = prefix + alt.token;
                const contResponse = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: fullPrefix }] }],
                        generationConfig: {
                            maxOutputTokens: previewLength,
                            temperature: 0.7 // Slightly lower temp for coherent previews
                        }
                    })
                });

                if (!contResponse.ok) {
                    return { ...alt, preview: alt.token };
                }

                const contResult = await contResponse.json();
                const continuation = contResult.candidates?.[0]?.content?.parts?.[0]?.text || "";

                // Show token + continuation trimmed to reasonable length
                const preview = continuation.trim().slice(0, 35);
                return { ...alt, preview: preview || alt.token.trim() };
            } catch {
                return { ...alt, preview: alt.token };
            }
        })
    );

    return { alternatives };
}
