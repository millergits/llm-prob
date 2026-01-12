"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface Alternative {
    token: string;
    token_id: number;
    probability: number;
    log_probability: number;
    is_other: boolean;
}

interface ManualSelectorProps {
    alternatives: Alternative[];
    onResult: (token: string) => void;
    disabled?: boolean;
}

export const ManualSelector: React.FC<ManualSelectorProps> = ({ alternatives, onResult, disabled }) => {
    return (
        <div className="manual-container">
            <div className="manual-title">Select Next Word</div>
            <div className="manual-options">
                {alternatives.map((alt, i) => (
                    <motion.button
                        key={i}
                        className={`manual-option ${alt.is_other ? 'other-option' : ''}`}
                        onClick={() => !disabled && onResult(alt.token)}
                        disabled={disabled}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div className="option-main">
                            <span className="option-token">{alt.is_other ? '〈OTHER〉' : alt.token}</span>
                            <span className="option-prob">{(alt.probability * 100).toFixed(1)}%</span>
                        </div>
                        <div
                            className="option-bar"
                            style={{ width: `${Math.min(alt.probability * 100, 100)}%` }}
                        />
                    </motion.button>
                ))}
            </div>
        </div>
    );
};
