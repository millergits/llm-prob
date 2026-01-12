"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles, ChevronRight, X } from 'lucide-react';
import { PredictionResponse, TokenData } from '@/lib/types';
import TokenNode from './TokenNode';

export default function ProbabilityExplorer() {
    const [input, setInput] = useState("The future of AI is");
    const [data, setData] = useState<PredictionResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedTokenIdx, setSelectedTokenIdx] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const analyze = async () => {
        setLoading(true);
        setSelectedTokenIdx(null);
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

    // Auto-scroll to end on new data
    useEffect(() => {
        if (data && containerRef.current) {
            containerRef.current.scrollLeft = containerRef.current.scrollWidth;
        }
    }, [data]);

    const handleAlternativeSelect = (token: TokenData) => {
        // In a real app this would splice the string and re-predict
        // For this demo, we'll just log and maybe append if it was the last token
        console.log("Selected alternative:", token.token);

        // Optimistic update for demo purposes:
        // If we selected an alternative for a token, we might want to replace it in the UI
        // For now, let's just close the selector
        setSelectedTokenIdx(null);
    };

    return (
        <div className="w-full max-w-6xl mx-auto p-4 space-y-12 relative min-h-[600px] flex flex-col items-center">

            {/* Input & Control-Bar */}
            <div className="w-full max-w-2xl glass-panel p-2 rounded-full flex items-center gap-4 relative z-50">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && analyze()}
                    className="flex-1 bg-transparent border-none text-lg px-6 py-2 text-white placeholder-white/20 focus:outline-none font-light tracking-wide bg-none"
                    placeholder="Enter a prompt to explore..."
                />
                <button
                    onClick={analyze}
                    disabled={loading}
                    className="px-6 py-2 rounded-full bg-primary/20 hover:bg-primary/30 border border-primary/50 text-primary font-bold tracking-wider uppercase text-xs flex items-center gap-2 transition-all hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>Visualize</span>
                </button>
            </div>

            {/* Error State */}
            {data?.error && (
                <div className="text-red-400 bg-red-900/20 border border-red-500/30 px-6 py-3 rounded-lg flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    {data.error}
                </div>
            )}

            {/* Main Visaulization Area */}
            <AnimatePresence mode="wait">
                {data?.tokens && !loading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="w-full relative"
                    >
                        {/* Token Stream */}
                        <div className="relative">
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 -left-12 text-white/20">
                                <ChevronRight className="w-8 h-8" />
                            </div>

                            <div
                                ref={containerRef}
                                className="flex gap-4 overflow-x-auto pb-8 pt-4 px-4 scrollbar-hide snap-x"
                                style={{ scrollBehavior: 'smooth' }}
                            >
                                {data.tokens.map((token, i) => (
                                    <div key={i} className="snap-center shrink-0">
                                        <TokenNode
                                            data={token}
                                            index={i}
                                            isSelected={selectedTokenIdx === i}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedTokenIdx(selectedTokenIdx === i ? null : i);
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Connection Lines (Visual Decor) */}
                        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none -z-10" />

                        {/* Alternatives Panel (Overlay) */}
                        <AnimatePresence>
                            {selectedTokenIdx !== null && data.tokens[selectedTokenIdx] && (
                                <div className="absolute top-32 left-0 w-full flex justify-center z-40 pointer-events-none">
                                    <motion.div
                                        initial={{ opacity: 0, y: -20, scale: 0.9 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -10, scale: 0.9 }}
                                        className="relative pointer-events-auto"
                                    >
                                        <div className="glass p-6 rounded-2xl border border-white/10 min-w-[300px]">
                                            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                                                <h3 className="text-xs font-mono text-primary uppercase tracking-widest">
                                                    Alternatives for "{data.tokens[selectedTokenIdx].token.trim()}"
                                                </h3>
                                                <button
                                                    onClick={() => setSelectedTokenIdx(null)}
                                                    className="text-white/40 hover:text-white transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                {data.tokens[selectedTokenIdx].top_k?.map((alt, j) => (
                                                    <div
                                                        key={j}
                                                        onClick={() => handleAlternativeSelect(alt)}
                                                        className="group flex items-center justify-between p-3 rounded-lg hover:bg-white/5 cursor-pointer border border-transparent hover:border-white/10 transition-all"
                                                    >
                                                        <span className="font-mono text-sm text-white/80 group-hover:text-primary transition-colors">
                                                            {alt.token}
                                                        </span>
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-1 w-16 bg-white/10 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-primary"
                                                                    style={{ width: `${alt.prob * 100}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs font-mono text-white/40 w-10 text-right">
                                                                {(alt.prob * 100).toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {(!data.tokens[selectedTokenIdx].top_k || data.tokens[selectedTokenIdx].top_k!.length === 0) && (
                                                    <div className="text-center text-white/30 text-sm py-4 italic">
                                                        No alternatives available
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Connecting Line to Parent */}
                                        {/* Note: This is tricky to position perfectly without refs to the specific TokenNode, 
                                            so strictly relying on centered UI for now or we just keep it as a floating panel below */}
                                    </motion.div>
                                </div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Empty State / Prompt */}
            {!data && !loading && (
                <div className="flex flex-col items-center justify-center mt-20 opacity-30 pointer-events-none text-center space-y-4">
                    <div className="w-24 h-24 rounded-full border border-white/20 flex items-center justify-center animate-pulse">
                        <div className="w-16 h-16 rounded-full bg-white/5" />
                    </div>
                    <p className="font-light tracking-widest text-sm uppercase">Waiting for input stream...</p>
                </div>
            )}
        </div>
    );
}
