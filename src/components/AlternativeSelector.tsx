"use client";

import { motion } from 'framer-motion';
import { TokenData } from '@/lib/types';
import clsx from 'clsx';

interface AlternativeSelectorProps {
    token: TokenData;
    onSelect: (newToken: string) => void;
    onClose: () => void;
    position: { x: number, y: number };
}

export default function AlternativeSelector({ token, onSelect, onClose, position }: AlternativeSelectorProps) {
    if (!token.top_k) return null;

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                style={{ top: position.y + 40, left: position.x - 100 }}
                className="fixed z-50 w-64 glass rounded-xl overflow-hidden shadow-2xl"
            >
                <div className="p-3 border-b border-white/10 bg-white/5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white/50">Alternatives</h4>
                </div>

                <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                    {token.top_k.map((alt, i) => (
                        <button
                            key={i}
                            onClick={() => onSelect(alt.token)}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 transition-colors group text-left"
                        >
                            <span className="font-mono text-cyan-200 group-hover:text-cyan-400 transition-colors">
                                {alt.token === " " ? "␣" : alt.token}
                            </span>

                            <div className="flex items-center gap-2">
                                <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-500 to-cyan-500"
                                        style={{ width: `${alt.prob * 100}%` }}
                                    />
                                </div>
                                <span className="text-[10px] text-white/40 font-mono w-8 text-right">
                                    {(alt.prob * 100).toFixed(0)}%
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </motion.div>
        </>
    );
}
