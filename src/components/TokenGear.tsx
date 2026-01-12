"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TokenData } from '@/lib/llm';

interface TokenGearProps {
    tokenData: TokenData;
    index: number;
    onSelect: (newToken: string, index: number) => void;
    isActive: boolean;
}

export const TokenGear: React.FC<TokenGearProps> = ({ tokenData, index, onSelect, isActive }) => {
    const [isOpen, setIsOpen] = useState(false);

    // Filter alternatives to unique tokens
    const alternatives = React.useMemo(() => {
        const unique = new Map();
        unique.set(tokenData.token, { token: tokenData.token, prob: tokenData.prob });

        tokenData.top_k.forEach(alt => {
            if (!unique.has(alt.token)) {
                unique.set(alt.token, alt);
            }
        });
        return Array.from(unique.values()).sort((a, b) => b.prob - a.prob);
    }, [tokenData]);

    return (
        <motion.div
            layout
            className="token-gear"
            onMouseLeave={() => setIsOpen(false)}
            onClick={() => setIsOpen(!isOpen)}
        >
            {/* Main Token Display */}
            <motion.div
                layoutId={`token-${index}`}
                className={`token-face ${isOpen ? 'active' : ''}`}
            >
                {tokenData.token}
                <div
                    className="token-prob-bar"
                    style={{ width: `${Math.max(tokenData.prob * 100, 2)}%` }}
                />
            </motion.div>

            {/* Alternatives Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="token-alternatives"
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                    >
                        <div className="alternatives-title">Alternatives</div>
                        {alternatives.map((alt, i) => (
                            <motion.button
                                key={i}
                                className={`alt-option ${alt.token === tokenData.token ? 'selected' : ''}`}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.03 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelect(alt.token, index);
                                    setIsOpen(false);
                                }}
                            >
                                <span>{alt.token}</span>
                                <span className="alt-prob">{(alt.prob * 100).toFixed(0)}%</span>
                            </motion.button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
