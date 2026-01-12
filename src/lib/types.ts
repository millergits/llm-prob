export interface TokenData {
    token: string;
    prob: number; // 0-1
    logprob: number;
    top_k?: TokenData[];
}

export interface PredictionRequest {
    text: string;
    cursorIndex?: number;
}

export interface PredictionResponse {
    tokens: TokenData[];
    error?: string;
}
