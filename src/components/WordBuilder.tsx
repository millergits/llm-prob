"use client";

import React, { useState, useRef, FormEvent, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plinko } from './games/Plinko';
import { SpinWheel } from './games/SpinWheel';
import { SlotMachine } from './games/SlotMachine';
import { DiceRoll } from './games/DiceRoll';
import { LotteryBalls } from './games/LotteryBalls';
import { DebugPanel, DebugLogEntry } from './DebugPanel';
import { RefreshCw, Zap, Bug, Settings, X, Undo2 } from 'lucide-react';
import { getTokenColor, getTokenColorLight, getTokenColorBorder, isValidToken } from '@/lib/colors';

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
    const [showSettings, setShowSettings] = useState(false);
    const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([]);
    const [model, setModel] = useState("gemini-2.0-flash");
    const [maxTokens, setMaxTokens] = useState(12);
    const [selectedGame, setSelectedGame] = useState<'plinko' | 'wheel' | 'slots' | 'dice' | 'lottery'>('plinko');
    const [otherExpanded, setOtherExpanded] = useState(true);
    const [floatingWord, setFloatingWord] = useState<string | null>(null);
    const settingsRef = useRef<HTMLDivElement>(null);
    const hasInitialized = useRef(false);


    const MIN_PROBABILITY_THRESHOLD = 0.03;

    // Merge tokens with same display text, then group into main (>=3%) and other (<3%)
    const { mainTokens, otherTokens, otherProbSum } = useMemo(() => {
        // Filter out invalid tokens (control tokens, special chars, etc.)
        const filtered = [...alternatives].filter(a => !a.is_other && isValidToken(a.token));

        // Merge tokens with same trimmed display text
        const mergedMap = new Map<string, Alternative>();
        for (const alt of filtered) {
            const displayKey = alt.token.trim().toLowerCase();
            const existing = mergedMap.get(displayKey);

            if (existing) {
                // Merge: sum probabilities, prefer space-prefixed token
                const preferredToken = alt.token.startsWith(' ') ? alt.token : existing.token;
                mergedMap.set(displayKey, {
                    ...existing,
                    token: preferredToken,
                    probability: existing.probability + alt.probability,
                    log_probability: Math.log(Math.exp(existing.log_probability) + Math.exp(alt.log_probability)),
                });
            } else {
                mergedMap.set(displayKey, { ...alt });
            }
        }

        // Sort merged tokens by probability
        const sorted = Array.from(mergedMap.values())
            .sort((a, b) => b.probability - a.probability)
            .slice(0, maxTokens);

        const main: Alternative[] = [];
        const other: Alternative[] = [];

        for (const alt of sorted) {
            if (alt.probability >= MIN_PROBABILITY_THRESHOLD) {
                main.push(alt);
            } else {
                other.push(alt);
            }
        }

        return {
            mainTokens: main,
            otherTokens: other,
            otherProbSum: other.reduce((sum, t) => sum + t.probability, 0)
        };
    }, [alternatives, maxTokens]);

    // Handle clicking "Other" - pick random from grouped tokens
    const handleOtherClicked = () => {
        if (otherTokens.length === 0) return;
        const randomToken = otherTokens[Math.floor(Math.random() * otherTokens.length)];
        handleWordSelected(randomToken.token);
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
                setShowSettings(false);
            }
        };
        if (showSettings) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showSettings]);

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

        // After sentence-ending punctuation, add a space so LLM suggests new words
        // instead of continuation tokens or more punctuation
        const sentenceEndingPunctuation = /[.!?;:"')\]}>]$/;
        const normalizedPrefix = sentenceEndingPunctuation.test(prefix.trim())
            ? prefix.trimEnd() + ' '
            : prefix;

        addDebugLog('request', { prefix: normalizedPrefix, model, maxTokens });

        try {
            const response = await fetch('/api/next-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prefix: normalizedPrefix, model }),
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

    useEffect(() => {
        if (!hasInitialized.current) {
            hasInitialized.current = true;
            fetchNextToken(seedInput);
        }
    }, []);

    const handleWordSelected = (token: string, fromGame: boolean = false) => {
        const spacedToken = token.startsWith(' ') ? token : ' ' + token;

        if (fromGame) {
            // Show floating animation
            setFloatingWord(spacedToken.trim());

            // After animation completes, add to sentence
            setTimeout(() => {
                setFloatingWord(null);
                const newSentence = [...builtSentence, spacedToken];
                setBuiltSentence(newSentence);
                const fullText = seedInput + newSentence.join('');
                fetchNextToken(fullText);
            }, 800);
        } else {
            // Immediate add for manual selection
            const newSentence = [...builtSentence, spacedToken];
            setBuiltSentence(newSentence);
            const fullText = seedInput + newSentence.join('');
            fetchNextToken(fullText);
        }
    };

    const handleReset = () => {
        setBuiltSentence([]);
        setAlternatives([]);
        setError(null);
        setDebugLogs([]);
        fetchNextToken(seedInput);
    };

    const handleUndo = () => {
        if (builtSentence.length === 0) return;
        const newSentence = builtSentence.slice(0, -1);
        setBuiltSentence(newSentence);
        const fullText = seedInput + newSentence.join('');
        fetchNextToken(fullText);
    };

    return (
        <div className="unified-app">
            <header className="app-header">
                <div className="header-brand">
                    <Zap className="brand-icon" size={22} />
                    <span className="brand-name">Probability Pulse</span>
                </div>

                <form className="header-seed" onSubmit={(e) => {
                    e.preventDefault();
                    const input = e.currentTarget.querySelector('input');
                    const value = input?.value?.trim();
                    if (value && value !== seedInput) {
                        setSeedInput(value);
                        setBuiltSentence([]);
                        fetchNextToken(value);
                    }
                }}>
                    <span className="seed-label">Seed:</span>
                    <input
                        type="text"
                        className="seed-input-field"
                        defaultValue={seedInput}
                        key={seedInput}
                        placeholder="Enter a seed sentence..."
                        onBlur={(e) => {
                            const value = e.target.value.trim();
                            if (value && value !== seedInput) {
                                setSeedInput(value);
                                setBuiltSentence([]);
                                fetchNextToken(value);
                            }
                        }}
                    />
                    <motion.button
                        type="button"
                        className="seed-reset-btn"
                        onClick={handleReset}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title="Reset"
                    >
                        <RefreshCw size={14} />
                    </motion.button>
                    <motion.button
                        type="button"
                        className="seed-undo-btn"
                        onClick={handleUndo}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        disabled={builtSentence.length === 0}
                        title="Undo last word"
                        style={{ opacity: builtSentence.length === 0 ? 0.3 : 1 }}
                    >
                        <Undo2 size={14} />
                    </motion.button>
                </form>

                <div className="header-controls">
                    {/* Settings - more common, comes first */}
                    <div className="settings-wrapper" ref={settingsRef}>
                        <motion.button
                            className={`header-icon-btn ${showSettings ? 'active' : ''}`}
                            onClick={() => setShowSettings(!showSettings)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            title="Settings"
                        >
                            <Settings size={16} />
                        </motion.button>

                        <AnimatePresence>
                            {showSettings && (
                                <motion.div
                                    className="settings-dropdown"
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    <div className="settings-header">
                                        <span>Settings</span>
                                        <button className="close-btn" onClick={() => setShowSettings(false)}>
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <div className="settings-content">
                                        <div className="settings-group">
                                            <label className="settings-label">
                                                <span>LLM Model</span>
                                                <select
                                                    className="settings-select"
                                                    value={model}
                                                    onChange={(e) => setModel(e.target.value)}
                                                >
                                                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                                                    <option value="gemini-2.5-pro-preview-06-05">Gemini 2.5 Pro Preview</option>
                                                    <option value="gemini-3-pro">Gemini 3 Pro</option>
                                                </select>
                                            </label>
                                        </div>
                                        <div className="settings-group">
                                            <label className="settings-label">
                                                <span>Max Words Shown</span>
                                                <input
                                                    type="number"
                                                    className="settings-input"
                                                    value={maxTokens}
                                                    onChange={(e) => setMaxTokens(Math.max(1, Math.min(20, parseInt(e.target.value) || 12)))}
                                                    min={1}
                                                    max={20}
                                                />
                                            </label>
                                        </div>
                                        <div className="settings-info">
                                            <span className="info-label">Logprobs</span>
                                            <span className="info-value enabled">Enabled</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Debug - power user feature, comes last */}
                    <motion.button
                        className={`header-icon-btn ${showDebug ? 'active' : ''}`}
                        onClick={() => setShowDebug(!showDebug)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title="Debug Panel"
                    >
                        <Bug size={16} />
                        {debugLogs.length > 0 && <span className="debug-count">{debugLogs.length}</span>}
                    </motion.button>
                </div>
            </header>

            <main className="app-main">
                <div className="workspace">
                    <div className="sentence-hero">
                        <div className="sentence-content">
                            <span className="seed-part">{seedInput}</span>
                            {builtSentence.map((word, i) => (
                                <motion.span
                                    key={i}
                                    className="added-word"
                                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ type: 'spring', damping: 15 }}
                                >
                                    {word}
                                </motion.span>
                            ))}
                            {isLoading ? (
                                <span className="typing-cursor">▋</span>
                            ) : (
                                <span className="next-word-hint">?</span>
                            )}
                        </div>
                        <div className="sentence-meta">
                            {builtSentence.length > 0 && (
                                <span className="word-count">{builtSentence.length} word{builtSentence.length !== 1 ? 's' : ''} added</span>
                            )}
                        </div>

                        {/* Floating word animation overlay */}
                        <AnimatePresence>
                            {floatingWord && (
                                <motion.div
                                    className="floating-word-overlay"
                                    initial={{
                                        opacity: 0,
                                        y: 200,
                                        scale: 1.2,
                                        x: '-50%'
                                    }}
                                    animate={{
                                        opacity: [0, 1, 1, 0],
                                        y: [200, 50, -20, -40],
                                        scale: [1.2, 1.1, 1, 0.8],
                                        x: '-50%'
                                    }}
                                    transition={{
                                        duration: 0.8,
                                        times: [0, 0.3, 0.7, 1],
                                        ease: "easeOut"
                                    }}
                                    style={{
                                        position: 'absolute',
                                        left: '50%',
                                        top: '30%',
                                        zIndex: 100,
                                        background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.95), rgba(168, 85, 247, 0.95))',
                                        color: 'white',
                                        padding: '0.75rem 1.5rem',
                                        borderRadius: '0.75rem',
                                        fontSize: '1.5rem',
                                        fontWeight: 700,
                                        boxShadow: '0 10px 40px rgba(34, 211, 238, 0.4), 0 0 60px rgba(168, 85, 247, 0.3)',
                                        pointerEvents: 'none',
                                    }}
                                >
                                    {floatingWord}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Two-Column Game Area */}
                    <div className="game-grid">
                        {/* Left: Chance Game */}
                        <div className="plinko-section">
                            <div className="section-header">
                                <span className="section-icon">🎲</span>
                                <span className="section-title">Chance Game</span>
                                <span className="section-subtitle">Let fate decide</span>
                                <div className="game-selector" style={{ flexWrap: 'wrap', gap: '0.25rem' }}>
                                    <button
                                        className={`game-tab ${selectedGame === 'plinko' ? 'active' : ''}`}
                                        onClick={() => setSelectedGame('plinko')}
                                    >
                                        🎯 Plinko
                                    </button>
                                    <button
                                        className={`game-tab ${selectedGame === 'wheel' ? 'active' : ''}`}
                                        onClick={() => setSelectedGame('wheel')}
                                    >
                                        🎡 Wheel
                                    </button>
                                    <button
                                        className={`game-tab ${selectedGame === 'slots' ? 'active' : ''}`}
                                        onClick={() => setSelectedGame('slots')}
                                    >
                                        🎰 Slots
                                    </button>
                                    <button
                                        className={`game-tab ${selectedGame === 'dice' ? 'active' : ''}`}
                                        onClick={() => setSelectedGame('dice')}
                                    >
                                        🎲 Dice
                                    </button>
                                    <button
                                        className={`game-tab ${selectedGame === 'lottery' ? 'active' : ''}`}
                                        onClick={() => setSelectedGame('lottery')}
                                    >
                                        🎱 Lottery
                                    </button>
                                </div>
                            </div>
                            <div className="plinko-container">
                                {isLoading ? (
                                    <div className="center-loading">
                                        <div className="loader-orb" />
                                        <span>Analyzing tokens...</span>
                                    </div>
                                ) : error ? (
                                    <div className="center-error">{error}</div>
                                ) : alternatives.length > 0 ? (
                                    selectedGame === 'plinko' ? (
                                        <Plinko
                                            alternatives={alternatives}
                                            onResult={(token) => handleWordSelected(token, true)}
                                        />
                                    ) : selectedGame === 'wheel' ? (
                                        <SpinWheel
                                            alternatives={alternatives}
                                            onResult={(token) => handleWordSelected(token, true)}
                                        />
                                    ) : selectedGame === 'slots' ? (
                                        <SlotMachine
                                            alternatives={alternatives}
                                            onResult={(token) => handleWordSelected(token, true)}
                                        />
                                    ) : selectedGame === 'dice' ? (
                                        <DiceRoll
                                            alternatives={alternatives}
                                            onResult={(token) => handleWordSelected(token, true)}
                                        />
                                    ) : (
                                        <LotteryBalls
                                            alternatives={alternatives}
                                            onResult={(token) => handleWordSelected(token, true)}
                                        />
                                    )
                                ) : (
                                    <div className="center-empty">Waiting for data...</div>
                                )}
                            </div>
                        </div>

                        {/* Right: Word Selection */}
                        <div className="words-section">
                            <div className="section-header">
                                <span className="section-icon">👆</span>
                                <span className="section-title">Or Pick a Word</span>
                                <span className="section-subtitle">Choose directly</span>
                            </div>
                            <div className="word-grid">
                                {isLoading ? (
                                    <div className="panel-loading">
                                        <div className="mini-loader" />
                                    </div>
                                ) : mainTokens.length > 0 || otherTokens.length > 0 ? (
                                    <>
                                        {mainTokens.map((alt: Alternative, i: number) => (
                                            <motion.button
                                                key={alt.token_id}
                                                className="word-chip"
                                                onClick={() => handleWordSelected(alt.token)}
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: i * 0.02 }}
                                                whileHover={{ scale: 1.05, y: -2 }}
                                                whileTap={{ scale: 0.95 }}
                                                style={{
                                                    background: getTokenColorLight(i),
                                                    borderColor: getTokenColorBorder(i),
                                                }}
                                            >
                                                <span className="chip-word" style={{ color: getTokenColor(i) }}>
                                                    {alt.token.trim() || '(space)'}
                                                </span>
                                                <span className="chip-prob" style={{ color: getTokenColor(i) }}>
                                                    {(alt.probability * 100).toFixed(1)}%
                                                </span>
                                            </motion.button>
                                        ))}
                                        {otherTokens.length > 0 && (
                                            <>
                                                {/* Other header - click to expand/collapse */}
                                                <motion.button
                                                    key="other-header"
                                                    className="word-chip other-chip"
                                                    onClick={() => setOtherExpanded(!otherExpanded)}
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: mainTokens.length * 0.02 }}
                                                    whileHover={{ scale: 1.05, y: -2 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    style={{
                                                        background: 'rgba(100, 116, 139, 0.15)',
                                                        borderColor: 'rgba(100, 116, 139, 0.4)',
                                                    }}
                                                >
                                                    <span className="chip-word" style={{ color: 'rgba(148, 163, 184, 0.9)' }}>
                                                        {otherExpanded ? '▼' : '▶'} Other ({otherTokens.length})
                                                    </span>
                                                    <span className="chip-prob" style={{ color: 'rgba(148, 163, 184, 0.7)' }}>
                                                        {(otherProbSum * 100).toFixed(1)}%
                                                    </span>
                                                </motion.button>

                                                {/* Expanded other tokens */}
                                                <AnimatePresence>
                                                    {otherExpanded && otherTokens.map((alt: Alternative, i: number) => (
                                                        <motion.button
                                                            key={alt.token_id}
                                                            className="word-chip other-chip-item"
                                                            onClick={() => handleWordSelected(alt.token)}
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            exit={{ opacity: 0, x: -10 }}
                                                            transition={{ delay: i * 0.02 }}
                                                            whileHover={{ scale: 1.05, y: -2 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            style={{
                                                                background: 'rgba(100, 116, 139, 0.1)',
                                                                borderColor: 'rgba(100, 116, 139, 0.3)',
                                                                marginLeft: '1rem',
                                                            }}
                                                        >
                                                            <span className="chip-word" style={{ color: 'rgba(148, 163, 184, 0.85)' }}>
                                                                {alt.token.trim() || '(space)'}
                                                            </span>
                                                            <span className="chip-prob" style={{ color: 'rgba(148, 163, 184, 0.6)' }}>
                                                                {(alt.probability * 100).toFixed(2)}%
                                                            </span>
                                                        </motion.button>
                                                    ))}
                                                </AnimatePresence>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <div className="panel-empty">No words available</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

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
