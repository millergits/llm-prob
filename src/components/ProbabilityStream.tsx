"use client";

import React, { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { TokenGear } from './TokenGear';
import { TokenData } from '@/lib/llm';
import { RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

interface ProbabilityStreamProps {
    initialTokens?: TokenData[];
}

export const ProbabilityStream: React.FC<ProbabilityStreamProps> = ({ initialTokens = [] }) => {
    const [tokens, setTokens] = useState<TokenData[]>(initialTokens);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [seedInput, setSeedInput] = useState("The future of AI is");
    const [currentPrompt, setCurrentPrompt] = useState("");

    // Auto-generate on first load
    useEffect(() => {
        if (tokens.length === 0 && !isLoading && !currentPrompt) {
            handleGenerate(seedInput);
        }
    }, []);

    const handleGenerate = async (prompt: string) => {
        setIsLoading(true);
        setError(null);
        setCurrentPrompt(prompt);
        try {
            const response = await fetch('/api/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: prompt }),
            });

            if (!response.ok) throw new Error("Generation failed");

            const data = await response.json();
            setTokens(data.tokens || []);
        } catch (err) {
            setError("Failed to stream probabilities");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (seedInput.trim()) {
            setTokens([]);
            handleGenerate(seedInput.trim());
        }
    };

    const handleTokenSelect = async (newToken: string, index: number) => {
        const prefixTokens = tokens.slice(0, index);
        const prefixText = currentPrompt + prefixTokens.map(t => t.token).join("") + newToken;

        const optimisticToken: TokenData = {
            token: newToken,
            prob: 1.0,
            logprob: 0,
            top_k: []
        };

        setTokens([...prefixTokens, optimisticToken]);

        setIsLoading(true);
        try {
            const response = await fetch('/api/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: prefixText }),
            });

            if (!response.ok) throw new Error("Steering failed");

            const data = await response.json();
            setTokens([...prefixTokens, optimisticToken, ...(data.tokens || [])]);
        } catch (err) {
            setError("Failed to steer generation");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="stream-container">
            {/* Header */}
            <div className="stream-header">
                <div>
                    <h2 className="stream-title">PROBABILITY STREAM</h2>
                    <p className="stream-subtitle">
                        Enter a seed sentence, then turn the gears to steer the AI.
                    </p>
                </div>

                <button
                    className={`reset-btn ${isLoading ? 'loading' : ''}`}
                    onClick={() => {
                        setTokens([]);
                        setSeedInput("The future of AI is");
                        handleGenerate("The future of AI is");
                    }}
                >
                    <RefreshCw />
                    Reset
                </button>
            </div>

            {/* Seed Input Form */}
            <form className="seed-input-form" onSubmit={handleSubmit}>
                <input
                    type="text"
                    className="seed-input"
                    placeholder="Type your seed sentence..."
                    value={seedInput}
                    onChange={(e) => setSeedInput(e.target.value)}
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    className="generate-btn"
                    disabled={isLoading || !seedInput.trim()}
                >
                    <Sparkles />
                    Generate
                </button>
            </form>

            {/* Token Stream */}
            <div className="token-stream">
                <LayoutGroup>
                    <AnimatePresence mode="popLayout">
                        {tokens.map((token, index) => (
                            <TokenGear
                                key={`${index}-${token.token}`}
                                index={index}
                                tokenData={token}
                                isActive={false}
                                onSelect={handleTokenSelect}
                            />
                        ))}
                    </AnimatePresence>
                </LayoutGroup>

                {tokens.length === 0 && !isLoading && (
                    <div className="empty-state">
                        Enter a seed sentence and click Generate
                    </div>
                )}
            </div>

            {/* Status Bar */}
            <div className="status-bar">
                {isLoading && (
                    <motion.div
                        className="status-loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <div className="status-dot" />
                        Calculating Probabilistic Trajectories...
                    </motion.div>
                )}
                {error && (
                    <div className="status-error">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
};
