"use client";

import React, { useState, useRef, FormEvent, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plinko } from './games/Plinko';
import { DebugPanel, DebugLogEntry } from './DebugPanel';
import { RefreshCw, Zap, Bug } from 'lucide-react';

interface Alternative {
    token: string;
    token_id: number;
    probability: number;
    log_probability: number;
    is_other: boolean;
}

export const WordBuilder: React.FC = () => {
    const [seedInput, setSeedInput] = useState("The future of AI is");
    const [builtSentence, setBuiltSentence] = useState<string[]>([]);
    const [alternatives, setAlternatives] = useState<Alternative[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showDebug, setShowDebug] = useState(false);
    const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const hasInitialized = useRef(false);

    // Get sorted alternatives for display (exclude <OTHER>)
    const sortedAlternatives = useMemo(() => {
        return [...alternatives]
            .filter(a => !a.is_other)
            .sort((a, b) => b.probability - a.probability)
            .slice(0, 12);
    }, [alternatives]);

    // Find max probability for scaling bars
    const maxProb = useMemo(() => {
        return Math.max(...sortedAlternatives.map(a => a.probability), 0.01);
    }, [sortedAlternatives]);

    const addDebugLog = (type: 'request' | 'response', data: DebugLogEntry['data']) => {
        const entry: DebugLogEntry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            timestamp: new Date(),
            type,
            data,
        };
        setDebugLogs(prev => [entry, ...prev].slice(0, 50));
    };

    const fetchNextToken = async (prefix: string) => {
        setIsLoading(true);
        setError(null);
        addDebugLog('request', { prefix });

        try {
            const response = await fetch('/api/next-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prefix }),
            });

            if (!response.ok) throw new Error("Failed to fetch next token");

            const data = await response.json();
            const alts = data.alternatives || [];
            setAlternatives(alts);
            addDebugLog('response', { alternatives: alts });
        } catch (err) {
            const errorMsg = "Failed to get next word options";
            setError(errorMsg);
            addDebugLog('response', { error: errorMsg });
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-start on mount with default seed
    useEffect(() => {
        if (!hasInitialized.current) {
            hasInitialized.current = true;
            fetchNextToken(seedInput);
        }
    }, []);

    // Handle new seed submission
    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const value = inputRef.current?.value || seedInput;
        if (!value.trim()) return;

        setSeedInput(value.trim());
        setBuiltSentence([]);
        fetchNextToken(value.trim());
    };

    const handleWordSelected = (token: string) => {
        const spacedToken = token.startsWith(' ') ? token : ' ' + token;
        const newSentence = [...builtSentence, spacedToken];
        setBuiltSentence(newSentence);

        const fullText = seedInput + newSentence.join('');
        fetchNextToken(fullText);
    };

    const handleReset = () => {
        setBuiltSentence([]);
        setAlternatives([]);
        setError(null);
        setDebugLogs([]);
        // Re-fetch with current seed
        fetchNextToken(seedInput);
    };

    return (
        <div className="unified-app">
            {/* Header - just branding and controls */}
            <header className="app-header">
                <div className="header-brand">
                    <Zap className="brand-icon" size={22} />
                    <span className="brand-name">Probability Pulse</span>
                </div>

                {/* Seed sentence display */}
                <div className="header-seed">
                    <span className="seed-label">Seed Sentence</span>
                    <span className="seed-value">{seedInput}</span>
                </div>

                {/* Right side controls */}
                <div className="header-controls">
                    <motion.button
                        className="header-reset-btn"
                        onClick={handleReset}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title="Reset"
                    >
                        <RefreshCw size={16} />
                    </motion.button>

                    <motion.button
                        className={`debug-btn ${showDebug ? 'active' : ''}`}
                        onClick={() => setShowDebug(!showDebug)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Bug size={16} />
                        {debugLogs.length > 0 && <span className="debug-count">{debugLogs.length}</span>}
                    </motion.button>
                </div>
            </header>

            {/* Main Content - Always show workspace */}
            <main className="app-main">
                <div className="workspace">
                    {/* Sentence Display */}
                    <div className="sentence-bar">
                        <div className="sentence-text">
                            <span className="seed-part">{seedInput}</span>
                            {builtSentence.map((word, i) => (
                                <motion.span
                                    key={i}
                                    className="added-word"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                >
                                    {word}
                                </motion.span>
                            ))}
                            {isLoading && <span className="typing-cursor">|</span>}
                        </div>
                        <span className="word-count">{builtSentence.length} added</span>
                    </div>

                    {/* Three-Column Layout */}
                    <div className="main-grid">
                        {/* Left: Probability Bars */}
                        <div className="prob-panel">
                            <div className="panel-header">
                                <span className="panel-title">Probabilities</span>
                            </div>
                            <div className="prob-bars">
                                {isLoading ? (
                                    <div className="panel-loading">
                                        <div className="mini-loader" />
                                    </div>
                                ) : sortedAlternatives.length > 0 ? (
                                    sortedAlternatives.slice(0, 8).map((alt, i) => (
                                        <motion.div
                                            key={alt.token_id}
                                            className="prob-bar-item"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.03 }}
                                        >
                                            <div className="bar-label">{alt.token.trim() || '␣'}</div>
                                            <div className="bar-track">
                                                <motion.div
                                                    className="bar-fill"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(alt.probability / maxProb) * 100}%` }}
                                                    transition={{ duration: 0.5, delay: i * 0.03 }}
                                                />
                                            </div>
                                            <div className="bar-value">{(alt.probability * 100).toFixed(1)}%</div>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="panel-empty">No data</div>
                                )}
                            </div>
                        </div>

                        {/* Center: Plinko Game */}
                        <div className="plinko-panel">
                            {isLoading ? (
                                <div className="center-loading">
                                    <div className="loader-orb" />
                                    <span>Analyzing...</span>
                                </div>
                            ) : error ? (
                                <div className="center-error">{error}</div>
                            ) : alternatives.length > 0 ? (
                                <Plinko
                                    alternatives={alternatives}
                                    onResult={handleWordSelected}
                                />
                            ) : (
                                <div className="center-empty">Waiting for data...</div>
                            )}
                        </div>

                        {/* Right: Word List */}
                        <div className="words-panel">
                            <div className="panel-header">
                                <span className="panel-title">Click to Select</span>
                            </div>
                            <div className="word-list">
                                {isLoading ? (
                                    <div className="panel-loading">
                                        <div className="mini-loader" />
                                    </div>
                                ) : sortedAlternatives.length > 0 ? (
                                    sortedAlternatives.map((alt, i) => (
                                        <motion.button
                                            key={alt.token_id}
                                            className="word-btn"
                                            onClick={() => handleWordSelected(alt.token)}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.03 }}
                                            whileHover={{ scale: 1.02, x: -4 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <span className="word-text">{alt.token.trim() || '(space)'}</span>
                                            <span className="word-prob">{(alt.probability * 100).toFixed(1)}%</span>
                                        </motion.button>
                                    ))
                                ) : (
                                    <div className="panel-empty">No words</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Debug Panel */}
            <AnimatePresence>
                {showDebug && (
                    <DebugPanel
                        logs={debugLogs}
                        onClose={() => setShowDebug(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
