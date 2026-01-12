"use client";

import React, { useState } from "react";
import TimelineStream from "@/components/mockups/TimelineStream";
import FocusStack from "@/components/mockups/FocusStack";
import NeuralTree from "@/components/mockups/NeuralTree";
import { Monitor, Layers, GitBranch, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function MockupsPage() {
    const [activeTab, setActiveTab] = useState<"timeline" | "focus" | "tree">("timeline");

    return (
        <div className="flex flex-col h-screen bg-[#020205] text-white overflow-hidden">
            {/* Navigation Header */}
            <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[#050508]/80 backdrop-blur-md z-50">
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                        <ArrowLeft size={20} />
                    </Link>
                    <div className="font-mono font-bold tracking-widest text-[#00f3ff]">
                        PROBABILITY PULSE <span className="text-gray-500">// LABORATORIES</span>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/5">
                    <button
                        onClick={() => setActiveTab("timeline")}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all
              ${activeTab === "timeline" ? "bg-[#00f3ff]/20 text-[#00f3ff] shadow-[0_0_10px_rgba(0,243,255,0.2)]" : "text-gray-400 hover:text-white hover:bg-white/5"}
            `}
                    >
                        <Monitor size={14} />
                        Timeline Stream
                    </button>
                    <button
                        onClick={() => setActiveTab("focus")}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all
               ${activeTab === "focus" ? "bg-[#00f3ff]/20 text-[#00f3ff] shadow-[0_0_10px_rgba(0,243,255,0.2)]" : "text-gray-400 hover:text-white hover:bg-white/5"}
             `}
                    >
                        <Layers size={14} />
                        Focus Stack
                    </button>
                    <button
                        onClick={() => setActiveTab("tree")}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all
               ${activeTab === "tree" ? "bg-[#00f3ff]/20 text-[#00f3ff] shadow-[0_0_10px_rgba(0,243,255,0.2)]" : "text-gray-400 hover:text-white hover:bg-white/5"}
             `}
                    >
                        <GitBranch size={14} />
                        Neural Tree
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 w-full relative">
                {activeTab === "timeline" && <TimelineStream />}
                {activeTab === "focus" && <FocusStack />}
                {activeTab === "tree" && <NeuralTree />}
            </div>
        </div>
    );
}
