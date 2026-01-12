"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';
import { PredictionResponse, TokenData } from '@/lib/types';
import AlternativeSelector from './AlternativeSelector';
import clsx from 'clsx';

export default function Tokenizer() {
    const [input, setInput] = useState("Once upon a time");
    const [data, setData] = useState<PredictionResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedToken, setSelectedToken] = useState<{ idx: number, data: TokenData, pos: { x: number, y: number } } | null>(null);

    const analyze = async () => {
        setLoading(true);
        setSelectedToken(null);
        try {
            const res = await fetch('/api/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: input }),
            });
            const json = await res.json();
            setData(json);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const getProbColor = (p: number) => {
        if (p > 0.8) return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
        if (p > 0.4) return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
        return "text-rose-400 border-rose-500/30 bg-rose-500/10";
    };

    const handleTokenClick = (e: React.MouseEvent, token: TokenData, idx: number) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        // Calculate position to keep it on screen roughly
        setSelectedToken({
            idx,
            data: token,
            pos: { x: rect.left + rect.width / 2, y: rect.bottom + 10 }
        });
    };

    const handleSelection = (newToken: string) => {
        console.log("Selected alternative:", newToken);
        // TODO: Implement actual text replacement logic
        // For now, update the input text if it's sufficiently simple, or just log it.
        // Ideally we replce the word at that index. But we need to map tokens to input string ranges.
        // For this demo, we'll just close the selector.
        setSelectedToken(null);
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-6 space-y-8 relative">

            {/* Input Section */}
            <div className="glass p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="w-full bg-transparent border-none text-2xl font-light focus:ring-0 text-white placeholder-white/20 resize-none outline-none"
                    rows={3}
                    placeholder="Type something amazing..."
                />

                <div className="flex justify-end mt-4">
                    <button
                        onClick={analyze}
                        disabled={loading}
                        className="px-6 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-cyan-400" />}
                        <span className="text-sm font-medium tracking-wider uppercase text-white/80">
                            {loading ? "Calculating..." : "Visualize"}
                        </span>
                    </button>
                </div>
            </div>

            {/* Visualization Section */}
            <AnimatePresence mode="wait">
                {data && data.error && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm font-mono flex items-center gap-3"
                    >
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        API Error: {data.error}
                    </motion.div>
                )}

                {data && !data.error && data.tokens && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="glass p-8 rounded-3xl min-h-[200px]"
                    >
                        <h3 className="text-xs font-mono text-white/40 mb-6 uppercase tracking-[0.2em] flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                            Token Probability Stream
                        </h3>

                        <div className="flex flex-wrap gap-3">
                            {data.tokens.map((t, i) => (
                                <motion.div
                                    key={i}
                                    layoutId={`token-${i}`}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1, transition: { delay: i * 0.05 } }}
                                    className="relative group cursor-pointer"
                                    onClick={(e) => handleTokenClick(e, t, i)}
                                >
                                    <div className={clsx(
                                        "px-4 py-2 rounded-lg border text-lg font-medium transition-all duration-300",
                                        getProbColor(t.prob),
                                        "hover:scale-110 hover:shadow-[0_0_30px_rgba(0,243,255,0.3)] hover:border-cyan-400",
                                        selectedToken?.idx === i && "ring-2 ring-cyan-400 ring-offset-2 ring-offset-black"
                                    )}>
                                        {t.token}

                                        {/* Probability Bar (Mini) */}
                                        <div className="absolute bottom-0 left-0 h-0.5 bg-current opacity-50 transition-all" style={{ width: `${t.prob * 100}%` }} />
                                    </div>

                                    {/* Tooltip */}
                                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all text-[10px] font-mono whitespace-nowrap text-white/60 pointer-events-none">
                                        {(t.prob * 100).toFixed(1)}%
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {selectedToken && (
                    <AlternativeSelector
                        token={selectedToken.data}
                        position={selectedToken.pos}
                        onSelect={handleSelection}
                        onClose={() => setSelectedToken(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
