"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTokenColor, isValidToken } from '@/lib/colors';

interface Alternative {
    token: string;
    token_id: number;
    probability: number;
    log_probability: number;
    is_other: boolean;
}

interface SlotMachineProps {
    alternatives: Alternative[];
    onResult: (token: string) => void;
    disabled?: boolean;
}

export const SlotMachine: React.FC<SlotMachineProps> = ({ alternatives, onResult, disabled }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [canStop, setCanStop] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [result, setResult] = useState<string | null>(null);
    const [leverPulled, setLeverPulled] = useState(false);
    const spinIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Merge tokens with same display text and filter out invalid tokens
    const displayAlternatives = useMemo(() => {
        const filtered = [...alternatives].filter(a => !a.is_other && isValidToken(a.token));

        const mergedMap = new Map<string, Alternative>();
        for (const alt of filtered) {
            const displayKey = alt.token.trim().toLowerCase();
            const existing = mergedMap.get(displayKey);

            if (existing) {
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

        return Array.from(mergedMap.values())
            .sort((a, b) => b.probability - a.probability)
            .slice(0, 12);
    }, [alternatives]);

    // Create extended reel items for visual variety
    const reelItems = React.useMemo(() => {
        const items: Alternative[] = [];
        // Add all alternatives multiple times
        for (let i = 0; i < 5; i++) {
            items.push(...displayAlternatives);
        }
        return items;
    }, [displayAlternatives]);

    // Determine the winning token based on weighted probability
    const getWinningToken = useCallback(() => {
        const total = alternatives.reduce((sum, a) => sum + a.probability, 0);
        let random = Math.random() * total;

        for (const alt of alternatives) {
            random -= alt.probability;
            if (random <= 0) {
                return alt.token;
            }
        }
        return alternatives[0]?.token || '';
    }, [alternatives]);

    const pullLever = useCallback(() => {
        if (isSpinning || disabled || displayAlternatives.length === 0) return;

        setLeverPulled(true);
        setIsSpinning(true);
        setCanStop(false);
        setResult(null);

        // Reset lever animation after a moment
        setTimeout(() => setLeverPulled(false), 300);

        // Start spinning - fast at first
        let speed = 50;
        let currentIdx = 0;

        const spin = () => {
            currentIdx = (currentIdx + 1) % reelItems.length;
            setCurrentIndex(currentIdx);

            // Schedule next spin
            spinIntervalRef.current = setTimeout(spin, speed);
        };

        spin();

        // Enable stop button after minimum spin time
        setTimeout(() => {
            setCanStop(true);
        }, 800);

        // Auto-stop after max time if user doesn't stop manually
        stopTimeoutRef.current = setTimeout(() => {
            stopReel();
        }, 5000);
    }, [isSpinning, disabled, displayAlternatives, reelItems]);

    const stopReel = useCallback(() => {
        if (!isSpinning) return;

        // Clear auto-stop timeout
        if (stopTimeoutRef.current) {
            clearTimeout(stopTimeoutRef.current);
            stopTimeoutRef.current = null;
        }

        // Start slowdown animation
        setCanStop(false);

        // Clear current spin interval
        if (spinIntervalRef.current) {
            clearTimeout(spinIntervalRef.current);
        }

        // Determine winning token
        const winningToken = getWinningToken();

        // Find index of winning token in reel
        const winningIndex = reelItems.findIndex(item => item.token === winningToken);
        const targetIndex = winningIndex >= 0 ? winningIndex : 0;

        // Slowdown animation
        let speed = 80;
        let remaining = 10 + Math.floor(Math.random() * 5);

        const slowdown = () => {
            remaining--;
            speed += 30; // Gradually slow down

            if (remaining > 0) {
                const nextIdx = (currentIndex + 1) % reelItems.length;
                setCurrentIndex(nextIdx);
                spinIntervalRef.current = setTimeout(slowdown, speed);
            } else {
                // Land on winning token
                setCurrentIndex(targetIndex);
                setIsSpinning(false);
                setResult(winningToken);
                onResult(winningToken);
            }
        };

        slowdown();
    }, [isSpinning, currentIndex, getWinningToken, reelItems, onResult]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (spinIntervalRef.current) clearTimeout(spinIntervalRef.current);
            if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
        };
    }, []);

    // Get visible items (current and adjacent for scroll effect)
    const getVisibleItems = () => {
        if (reelItems.length === 0) return [];

        const prevIndex = (currentIndex - 1 + reelItems.length) % reelItems.length;
        const nextIndex = (currentIndex + 1) % reelItems.length;

        return [
            reelItems[prevIndex],
            reelItems[currentIndex],
            reelItems[nextIndex],
        ];
    };

    const visibleItems = getVisibleItems();

    return (
        <div className="slot-container">
            <div className="slot-machine-single">
                {/* Machine Frame */}
                <div className="slot-frame">
                    <div className="slot-header-single">
                        <span className="slot-title">🎰 WORD SLOTS</span>
                    </div>

                    {/* Single Reel Window */}
                    <div className="slot-window">
                        <div className="slot-reel-single">
                            <AnimatePresence mode="popLayout">
                                {visibleItems.map((item, i) => (
                                    <motion.div
                                        key={`${currentIndex}-${i}`}
                                        className={`slot-item ${i === 1 ? 'center' : ''}`}
                                        initial={{ opacity: 0, y: i === 0 ? -40 : 40 }}
                                        animate={{ opacity: i === 1 ? 1 : 0.3, y: 0 }}
                                        exit={{ opacity: 0, y: i === 2 ? 40 : -40 }}
                                        transition={{ duration: 0.05 }}
                                    >
                                        <span className="slot-token">{item?.token?.trim() || '?'}</span>
                                        {i === 1 && item && (
                                            <span className="slot-prob">{(item.probability * 100).toFixed(0)}%</span>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                        {/* Pointer indicators */}
                        <div className="slot-pointer left">▶</div>
                        <div className="slot-pointer right">◀</div>
                    </div>

                    {/* Status */}
                    <div className="slot-status">
                        {isSpinning && canStop && <span className="stop-hint">Press STOP!</span>}
                        {isSpinning && !canStop && <span className="spin-hint">Spinning...</span>}
                    </div>
                </div>

                {/* Lever */}
                <motion.div
                    className={`slot-lever-arm ${leverPulled ? 'pulled' : ''}`}
                    animate={{ rotateZ: leverPulled ? 30 : 0 }}
                    transition={{ type: "spring", stiffness: 400 }}
                >
                    <button
                        className="slot-lever-handle"
                        onClick={pullLever}
                        disabled={isSpinning || disabled}
                    >
                        <div className="lever-ball" />
                    </button>
                    <div className="lever-shaft" />
                </motion.div>
            </div>

            {/* Controls */}
            <div className="slot-controls">
                <button
                    className="slot-pull-btn"
                    onClick={pullLever}
                    disabled={isSpinning || disabled}
                >
                    {isSpinning ? '🎲 SPINNING...' : '🎲 PULL LEVER'}
                </button>
                {isSpinning && (
                    <motion.button
                        className={`slot-stop-btn ${canStop ? 'active' : ''}`}
                        onClick={stopReel}
                        disabled={!canStop}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        ⏹ STOP
                    </motion.button>
                )}
            </div>

            {/* Result */}
            {result && (
                <motion.div
                    className="slot-result-single"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <span className="result-emoji">🎉</span>
                    <span className="result-text">Winner: <strong>{result}</strong></span>
                </motion.div>
            )}
        </div>
    );
};
