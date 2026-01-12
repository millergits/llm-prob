"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { MOCK_SEQUENCE, TokenData } from "./mockData";
import { GitBranch } from "lucide-react";

export default function NeuralTree() {
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    const toggleNode = (id: string) => {
        const newSet = new Set(expandedNodes);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedNodes(newSet);
    };

    return (
        <div className="w-full h-full flex items-center justify-center bg-[#020205] text-[#e0e0e0] font-sans overflow-hidden relative">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

            <div className="absolute top-8 left-1/2 -translate-x-1/2 text-sm text-gray-500 font-mono">
                VAR. 03 // NEURAL TREE
            </div>

            <div className="relative w-full max-w-6xl h-full overflow-auto flex items-center p-20 cursor-grab active:cursor-grabbing">
                <div className="flex items-center gap-16">
                    {MOCK_SEQUENCE.map((token, index) => (
                        <TreeNode
                            key={token.id}
                            token={token}
                            isExpanded={expandedNodes.has(token.id)}
                            onToggle={() => toggleNode(token.id)}
                            isLast={index === MOCK_SEQUENCE.length - 1}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

function TreeNode({ token, isExpanded, onToggle, isLast }: { token: TokenData, isExpanded: boolean, onToggle: () => void, isLast: boolean }) {
    return (
        <div className="relative flex flex-col items-center">
            {/* Connection Line to Next Node */}
            {!isLast && (
                <div className="absolute top-1/2 left-full w-16 h-0.5 bg-gray-800 -z-10" />
            )}

            {/* Main Token Node */}
            <motion.button
                onClick={onToggle}
                className={`relative w-16 h-16 rounded-full border-2 flex items-center justify-center font-mono text-sm font-bold z-20 hover:scale-110 transition-transform duration-200
                    ${isExpanded ? "bg-[#0a0a10] border-[#00f3ff] text-[#00f3ff] shadow-[0_0_20px_rgba(0,243,255,0.4)]" : "bg-black border-gray-700 text-gray-400 hover:border-gray-500"}
                `}
            >
                {token.text}
                {/* Probability Halo */}
                <svg className="absolute inset-0 -rotate-90 pointer-events-none" width="64" height="64">
                    <circle cx="32" cy="32" r="30" fill="none" strokeWidth="2" stroke="#333" />
                    <circle
                        cx="32" cy="32" r="30" fill="none" strokeWidth="2" stroke="#00f3ff"
                        strokeDasharray={`${token.prob * 188} 188`}
                        opacity={isExpanded ? 1 : 0.5}
                    />
                </svg>
            </motion.button>

            {/* Expanded Branches (Alternatives) */}
            {isExpanded && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-8 flex gap-4">
                    {/* Visual Connector */}
                    <svg className="absolute bottom-full left-1/2 -translate-x-1/2 w-48 h-8 pointer-events-none overflow-visible">
                        <path d="M96,0 C96,20 20,20 20,32" fill="none" stroke="#333" strokeWidth="1" />
                        <path d="M96,0 C96,20 172,20 172,32" fill="none" stroke="#333" strokeWidth="1" />
                        <line x1="96" y1="0" x2="96" y2="32" stroke="#333" strokeWidth="1" />
                    </svg>

                    {token.alternatives.slice(0, 3).map((alt, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex flex-col items-center gap-2"
                        >
                            <div className={`w-3 h-3 rounded-full ${alt.text === token.text ? "bg-[#00f3ff]" : "bg-gray-700"}`} />
                            <div className="p-3 bg-gray-900 border border-gray-800 rounded-lg min-w-[80px] text-center">
                                <div className={`text-sm font-bold ${alt.text === token.text ? "text-[#00f3ff]" : "text-gray-400"}`}>{alt.text}</div>
                                <div className="text-xs text-gray-600 font-mono mt-1">{(alt.prob * 100).toFixed(0)}%</div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    )
}
