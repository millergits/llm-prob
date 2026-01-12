"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, ArrowDown } from 'lucide-react';

export interface DebugLogEntry {
    id: string;
    timestamp: Date;
    type: 'request' | 'response';
    data: {
        prefix?: string;
        alternatives?: Array<{
            token: string;
            probability: number;
            log_probability: number;
            is_other: boolean;
        }>;
        error?: string;
    };
}

interface DebugPanelProps {
    logs: DebugLogEntry[];
    onClose: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ logs, onClose }) => {
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    const formatProb = (prob: number) => {
        return (prob * 100).toFixed(1) + '%';
    };

    return (
        <motion.div
            className="debug-panel"
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
            <div className="debug-header">
                <h3>🔍 API Debug Log</h3>
                <button className="debug-close" onClick={onClose}>
                    <X size={18} />
                </button>
            </div>

            <div className="debug-content">
                {logs.length === 0 ? (
                    <div className="debug-empty">
                        No API calls yet. Start building a sentence!
                    </div>
                ) : (
                    <div className="debug-logs">
                        {logs.map((log) => (
                            <div key={log.id} className={`debug-entry debug-${log.type}`}>
                                <div className="debug-entry-header">
                                    <span className={`debug-badge debug-badge-${log.type}`}>
                                        {log.type === 'request' ? <Send size={12} /> : <ArrowDown size={12} />}
                                        {log.type.toUpperCase()}
                                    </span>
                                    <span className="debug-time">{formatTime(log.timestamp)}</span>
                                </div>

                                {log.type === 'request' && log.data.prefix && (
                                    <div className="debug-body">
                                        <div className="debug-label">Prefix:</div>
                                        <pre className="debug-code">{JSON.stringify(log.data.prefix)}</pre>
                                    </div>
                                )}

                                {log.type === 'response' && log.data.alternatives && (
                                    <div className="debug-body">
                                        <div className="debug-label">Top Alternatives:</div>
                                        <table className="debug-table">
                                            <thead>
                                                <tr>
                                                    <th>Token</th>
                                                    <th>Prob</th>
                                                    <th>LogProb</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {log.data.alternatives.slice(0, 5).map((alt, i) => (
                                                    <tr key={i} className={alt.is_other ? 'other-row' : ''}>
                                                        <td className="token-cell">
                                                            {alt.is_other ? (
                                                                <span className="other-token">{alt.token}</span>
                                                            ) : (
                                                                <code>{JSON.stringify(alt.token)}</code>
                                                            )}
                                                        </td>
                                                        <td className="prob-cell">{formatProb(alt.probability)}</td>
                                                        <td className="logprob-cell">{alt.log_probability.toFixed(3)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {log.data.alternatives.length > 5 && (
                                            <div className="debug-more">
                                                +{log.data.alternatives.length - 5} more alternatives
                                            </div>
                                        )}
                                    </div>
                                )}

                                {log.type === 'response' && log.data.error && (
                                    <div className="debug-body debug-error">
                                        <div className="debug-label">Error:</div>
                                        <pre className="debug-code error">{log.data.error}</pre>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
};
