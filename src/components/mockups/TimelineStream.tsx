"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MOCK_SEQUENCE, TokenData } from "./mockData";
import { ChevronDown, RefreshCw } from "lucide-react";

export default function TimelineStream() {
    const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);

    const handleTokenClick = (id: string) => {
        setSelectedTokenId(selectedTokenId === id ? null : id);
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#020205] text-[#e0e0e0] font-sans overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,243,255,0.05)_0%,transparent_70%)] pointer-events-none" />

            <div className="w-full max-w-4xl p-8 overflow-x-auto no-scrollbar flex items-center gap-4 relative z-10">
                <AnimatePresence mode="popLayout">
                    {MOCK_SEQUENCE.map((token) => (
                        <TokenNode
                            key={token.id}
                            token={token}
                            isSelected={selectedTokenId === token.id}
                            onClick={() => handleTokenClick(token.id)}
                        />
                    ))}
                </AnimatePresence>
            </div>

            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-sm text-gray-500 font-mono">
                VAR. 01 // TIMELINE STREAM
            </div>
        </div>
    );
}

function TokenNode({
    token,
    isSelected,
    onClick,
}: {
    token: TokenData;
    isSelected: boolean;
    onClick: () => void;
}) {
    return (
        <motion.div
            layout
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="flex flex-col items-center"
        >
            <motion.button
                layout
                onClick={onClick}
                className={`relative px-4 py-2 rounded-lg border backdrop-blur-md transition-all duration-300 flex items-center gap-2
          ${isSelected
                        ? "bg-[#00f3ff]/10 border-[#00f3ff] text-[#00f3ff] shadow-[0_0_15px_rgba(0,243,255,0.3)] scale-105"
                        : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-gray-200"
                    }
        `}
            >
                <span className="text-lg font-medium tracking-tight font-mono">{token.text}</span>
                {isSelected && <ChevronDown size={14} className="opacity-70" />}

                {/* Probability Bar Indicator */}
                <div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-[#00f3ff] to-transparent" style={{ width: `${token.prob * 100}%` }} />
            </motion.button>

            <AnimatePresence>
                {isSelected && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 10, height: "auto" }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        className="w-48 bg-[#0a0a10] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-20"
                    >
                        <div className="p-2 space-y-1">
                            <div className="text-xs text-gray-500 uppercase tracking-wider px-2 py-1 font-bold">Alternatives</div>
                            {token.alternatives.map((alt, idx) => (
                                <div
                                    key={idx}
                                    className="flex justify-between items-center text-sm p-2 rounded hover:bg-white/5 cursor-pointer group"
                                >
                                    <span className={alt.text === token.text ? "text-[#00f3ff]" : "text-gray-400 group-hover:text-gray-200"}>
                                        {alt.text}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono text-gray-600">{Math.round(alt.prob * 100)}%</span>
                                        <div className="w-12 h-1 bg-gray-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-[#00f3ff]" style={{ width: `${alt.prob * 100}%`, opacity: alt.text === token.text ? 1 : 0.5 }} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="bg-white/5 p-2 text-center clickable hover:bg-white/10 cursor-pointer border-t border-white/5">
                            <RefreshCw size={12} className="inline mr-1" />
                            <span className="text-xs">Regenerate from here</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
