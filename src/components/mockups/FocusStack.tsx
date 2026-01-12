"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MOCK_SEQUENCE, TokenData } from "./mockData";
import { ArrowRight, Layers } from "lucide-react";

export default function FocusStack() {
    const [activeIndex, setActiveIndex] = useState(0);
    const activeToken = MOCK_SEQUENCE[activeIndex];

    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#020205] text-[#e0e0e0] font-sans overflow-hidden relative p-8">
            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-[#bd00ff]/5 to-transparent pointer-events-none" />

            {/* Progress / Navigation Header */}
            <div className="absolute top-8 w-full max-w-2xl flex justify-between items-center text-sm font-mono text-gray-500 z-20">
                <span>VAR. 02 // FOCUS STACK</span>
                <div className="flex gap-1">
                    {MOCK_SEQUENCE.map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-1 rounded-full transition-all duration-300 ${idx === activeIndex ? "w-8 bg-[#00f3ff]" : "w-2 bg-white/10"}`}
                        />
                    ))}
                </div>
            </div>

            <div className="relative w-full max-w-4xl flex items-center justify-center h-[500px]">
                {/* Previous Token (Ghost) */}
                <AnimatePresence>
                    {activeIndex > 0 && (
                        <motion.div
                            initial={{ opacity: 0, x: -100 }}
                            animate={{ opacity: 0.4, x: -250, scale: 0.8 }}
                            exit={{ opacity: 0, x: -400 }}
                            className="absolute z-10 p-6 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-sm w-64 h-80 flex items-center justify-center cursor-pointer hover:opacity-60 transition-opacity"
                            onClick={() => setActiveIndex(activeIndex - 1)}
                        >
                            <span className="text-4xl text-gray-400 font-mono">{MOCK_SEQUENCE[activeIndex - 1].text}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Active Token Stack */}
                <div className="relative z-30 w-80 h-96 perspective-1000">
                    <CardStack token={activeToken} />
                </div>

                {/* Next Token (Preview) */}
                <AnimatePresence>
                    {activeIndex < MOCK_SEQUENCE.length - 1 && (
                        <motion.div
                            initial={{ opacity: 0, x: 100 }}
                            animate={{ opacity: 0.4, x: 250, scale: 0.8 }}
                            exit={{ opacity: 0, x: 400 }}
                            className="absolute z-10 p-6 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-sm w-64 h-80 flex items-center justify-center cursor-pointer hover:opacity-60 transition-opacity"
                            onClick={() => setActiveIndex(activeIndex + 1)}
                        >
                            <span className="text-4xl text-gray-400 font-mono">{MOCK_SEQUENCE[activeIndex + 1].text}</span>
                            <ArrowRight className="absolute bottom-6 right-6 opacity-50" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="absolute bottom-12 text-center space-y-2">
                <p className="text-gray-500 text-sm">Click center stack to cycle alternatives. Click side cards to navigate.</p>
            </div>
        </div>
    );
}

function CardStack({ token }: { token: TokenData }) {
    const [stackIndex, setStackIndex] = useState(0);
    const displayedAlternatives = token.alternatives;

    // Cycle through alternatives when clicking the top card
    const cycleStack = () => {
        setStackIndex((prev) => (prev + 1) % displayedAlternatives.length);
    };

    return (
        <div className="relative w-full h-full cursor-pointer group" onClick={cycleStack}>
            <AnimatePresence mode="popLayout">
                {displayedAlternatives.map((alt, i) => {
                    // Calculate relative index for visual stacking
                    const offset = (i - stackIndex + displayedAlternatives.length) % displayedAlternatives.length;

                    // Only show top 3 for performance/visual clarity
                    if (offset > 2) return null;

                    return (
                        <motion.div
                            key={alt.text} // Use text as key for simplicity in mock
                            layoutId={`${token.id}-${alt.text}`}
                            animate={{
                                zIndex: 30 - offset,
                                scale: 1 - offset * 0.05,
                                y: offset * 15,
                                opacity: 1 - offset * 0.2,
                                rotateX: offset * -5 // slight 3d tilt
                            }}
                            className={`absolute inset-0 rounded-2xl border backdrop-blur-xl flex flex-col justify-between p-8 shadow-2xl transition-colors duration-300
                                ${offset === 0
                                    ? "bg-[#0a0a12]/90 border-[#00f3ff]/30 shadow-[0_0_30px_rgba(0,243,255,0.15)]"
                                    : "bg-[#050508]/90 border-white/5"
                                }
                            `}
                        >
                            <div className="flex justify-between items-start">
                                <span className={`text-xs font-bold tracking-widest uppercase ${offset === 0 ? "text-[#00f3ff]" : "text-gray-600"}`}>
                                    Option {String(i + 1).padStart(2, '0')}
                                </span>
                                {offset === 0 && <Layers size={16} className="text-[#00f3ff]" />}
                            </div>

                            <div className="text-center">
                                <span className={`text-6xl font-bold tracking-tight ${offset === 0 ? "text-white" : "text-gray-500"}`}>
                                    {alt.text}
                                </span>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-mono text-gray-400">
                                    <span>Probability</span>
                                    <span>{(alt.prob * 100).toFixed(1)}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${alt.prob * 100}%` }}
                                        className={`h-full ${offset === 0 ? "bg-[#00f3ff]" : "bg-gray-600"}`}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
