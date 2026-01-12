"use client";

import { motion } from "framer-motion";
import { TokenData } from "@/lib/types";
import clsx from "clsx";

interface TokenNodeProps {
    data: TokenData;
    index: number;
    isSelected?: boolean;
    onClick: (e: React.MouseEvent) => void;
    isAlternativesView?: boolean;
}

export default function TokenNode({ data, index, isSelected, onClick, isAlternativesView = false }: TokenNodeProps) {
    // Determine color based on probability
    const getProbColor = (p: number) => {
        if (p > 0.8) return "text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/20 shadow-[0_0_15px_rgba(52,211,153,0.3)]";
        if (p > 0.4) return "text-yellow-400 border-yellow-500/50 hover:bg-yellow-500/20 shadow-[0_0_15px_rgba(250,204,21,0.3)]";
        return "text-rose-400 border-rose-500/50 hover:bg-rose-500/20 shadow-[0_0_15px_rgba(251,113,133,0.3)]";
    };

    const baseClasses = "relative px-4 py-2 rounded-xl border backdrop-blur-md transition-all duration-300 font-mono text-sm sm:text-base cursor-pointer select-none flex flex-col items-center justify-center min-w-[60px]";

    const probColor = getProbColor(data.prob);

    return (
        <motion.div
            layoutId={isAlternativesView ? `alt-${data.token}-${index}` : `token-${index}`}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            whileHover={{ scale: 1.1, zIndex: 10 }}
            onClick={onClick}
            className={clsx(
                baseClasses,
                probColor,
                isSelected ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-110 z-20 bg-white/10" : "bg-black/40",
                isAlternativesView ? "min-w-[100px]" : ""
            )}
        >
            <span className="relative z-10 font-bold tracking-tight">{data.token}</span>

            {/* Probability Bar */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10 overflow-hidden rounded-b-xl">
                <div
                    className="h-full bg-current opacity-80"
                    style={{ width: `${data.prob * 100}%` }}
                />
            </div>

            {/* Hover Tooltip */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-black/80 text-white px-2 py-1 rounded border border-white/10 whitespace-nowrap pointer-events-none">
                {(data.prob * 100).toFixed(1)}%
            </div>
        </motion.div>
    );
}
