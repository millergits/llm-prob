"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTokenColor, getTokenColorLight, getTokenColorBorder, OTHER_COLOR, isValidToken } from '@/lib/colors';

interface Alternative {
    token: string;
    token_id: number;
    probability: number;
    log_probability: number;
    is_other: boolean;
}

interface BinData {
    token: string;
    probability: number;
    isOther: boolean;
    otherTokens?: Alternative[]; // For "Other" bin, stores the grouped tokens
    widthPercent: number;
    startPercent: number;
    colorIndex: number; // Original sorted index for consistent color matching
}

interface PlinkoProps {
    alternatives: Alternative[];
    onResult: (token: string) => void;
    disabled?: boolean;
}

// Minimum probability threshold to get its own bin (3%)
const MIN_PROBABILITY_THRESHOLD = 0.03;

export const Plinko: React.FC<PlinkoProps> = ({ alternatives, onResult, disabled }) => {
    const [isDropping, setIsDropping] = useState(false);
    const [showBall, setShowBall] = useState(false);
    const [ballPosition, setBallPosition] = useState({ x: 350, y: -30 });
    const [result, setResult] = useState<string | null>(null);
    const [landedBin, setLandedBin] = useState<number | null>(null);
    const [hoverX, setHoverX] = useState<number | null>(null);
    const [isPickingOther, setIsPickingOther] = useState(false);
    const [otherPickedToken, setOtherPickedToken] = useState<string | null>(null);

    const boardWidth = 700;
    const boardHeight = 480;
    const pegRows = 10;


    // Create bins with probability-based widths and "Other" category
    const bins: BinData[] = useMemo(() => {
        // Filter out invalid tokens (control tokens, special chars, etc.)
        const filtered = [...alternatives].filter(a => !a.is_other && isValidToken(a.token));

        // Merge tokens with same trimmed display text
        const mergedMap = new Map<string, Alternative>();
        for (const alt of filtered) {
            const displayKey = alt.token.trim().toLowerCase();
            const existing = mergedMap.get(displayKey);

            if (existing) {
                const preferredToken = alt.token.startsWith(' ') ? alt.token : existing.token;
                mergedMap.set(displayKey, {
                    ...existing,
                    token: preferredToken,
                    probability: existing.probability + alt.probability,
                    log_probability: Math.log(Math.exp(existing.log_probability) + Math.exp(alt.log_probability)),
                });
            } else {
                mergedMap.set(displayKey, { ...alt });
            }
        }

        const sorted = Array.from(mergedMap.values())
            .sort((a, b) => b.probability - a.probability);

        const mainTokens: { alt: Alternative; colorIndex: number }[] = [];
        const otherTokens: Alternative[] = [];

        // Split into main tokens and "other" tokens, preserving sorted index for colors
        for (let i = 0; i < sorted.length; i++) {
            const alt = sorted[i];
            if (alt.probability >= MIN_PROBABILITY_THRESHOLD) {
                mainTokens.push({ alt, colorIndex: i });
            } else {
                otherTokens.push(alt);
            }
        }

        // Calculate total probability for normalization
        const otherProbSum = otherTokens.reduce((sum, t) => sum + t.probability, 0);
        const mainProbSum = mainTokens.reduce((sum, t) => sum + t.alt.probability, 0);
        const totalProb = mainProbSum + otherProbSum;

        // Create bins with proportional widths
        const result: BinData[] = [];
        let startPercent = 0;

        // Add main token bins (arrange high prob in center)
        const centerArranged = arrangeForCenter(mainTokens);

        for (const { alt, colorIndex } of centerArranged) {
            const widthPercent = (alt.probability / totalProb) * 100;
            result.push({
                token: alt.token,
                probability: alt.probability,
                isOther: false,
                widthPercent,
                startPercent,
                colorIndex,
            });
            startPercent += widthPercent;
        }

        // Add "Other" bin if there are grouped tokens
        if (otherTokens.length > 0 && otherProbSum > 0) {
            const widthPercent = (otherProbSum / totalProb) * 100;
            result.push({
                token: 'Other',
                probability: otherProbSum,
                isOther: true,
                otherTokens,
                widthPercent,
                startPercent,
                colorIndex: -1, // Not used for Other
            });
        }

        return result;
    }, [alternatives]);

    // Arrange bins so highest probability is in center
    function arrangeForCenter(alts: { alt: Alternative; colorIndex: number }[]): { alt: Alternative; colorIndex: number }[] {
        if (alts.length <= 1) return alts;

        const sorted = [...alts].sort((a, b) => b.alt.probability - a.alt.probability);
        const arranged: { alt: Alternative; colorIndex: number }[] = [];

        // Interleave from both ends, starting with highest in middle
        let left: { alt: Alternative; colorIndex: number }[] = [];
        let right: { alt: Alternative; colorIndex: number }[] = [];

        for (let i = 0; i < sorted.length; i++) {
            if (i === 0) {
                // Highest goes to middle (will be placed after interleaving)
                continue;
            } else if (i % 2 === 1) {
                left.unshift(sorted[i]);
            } else {
                right.push(sorted[i]);
            }
        }

        return [...left, sorted[0], ...right];
    }

    // Generate pegs
    const pegs = useMemo(() => {
        const pegsList: { x: number; y: number; row: number }[] = [];
        const horizontalSpacing = 50;
        const verticalSpacing = 40;
        const startY = 55;
        const edgePadding = 20;
        const pegsPerRow = Math.floor((boardWidth - edgePadding * 2) / horizontalSpacing) + 1;
        const rowWidth = (pegsPerRow - 1) * horizontalSpacing;
        const startX = (boardWidth - rowWidth) / 2;

        // Only render pegRows - 1 regular rows; the last row will just have divider pegs
        for (let row = 0; row < pegRows - 1; row++) {
            const rowOffset = (row % 2 === 0) ? 0 : horizontalSpacing / 2;
            const effectivePegs = (row % 2 === 0) ? pegsPerRow : pegsPerRow - 1;
            const effectiveStartX = startX + rowOffset;

            for (let col = 0; col < effectivePegs; col++) {
                pegsList.push({
                    x: effectiveStartX + col * horizontalSpacing,
                    y: startY + row * verticalSpacing,
                    row
                });
            }
        }

        // Add pegs at bin divider positions
        const dividerY = boardHeight - 65;
        let currentX = 0;
        for (const bin of bins) {
            const binWidth = (bin.widthPercent / 100) * boardWidth;
            pegsList.push({ x: currentX, y: dividerY, row: pegRows });
            currentX += binWidth;
        }
        pegsList.push({ x: boardWidth, y: dividerY, row: pegRows });

        return pegsList;
    }, [boardWidth, boardHeight, pegRows, bins]);

    const handleDropZoneClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (isDropping || disabled || bins.length === 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const dropX = Math.max(30, Math.min(boardWidth - 30, clickX));
        drop(dropX);
    }, [isDropping, disabled, bins, boardWidth]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (isDropping) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        setHoverX(Math.max(30, Math.min(boardWidth - 30, mouseX)));
    }, [isDropping, boardWidth]);

    const handleMouseLeave = useCallback(() => setHoverX(null), []);

    // Find which bin a position lands in
    const getBinAtPosition = useCallback((x: number): number => {
        const percent = (x / boardWidth) * 100;
        for (let i = 0; i < bins.length; i++) {
            const binEnd = bins[i].startPercent + bins[i].widthPercent;
            if (percent < binEnd) return i;
        }
        return bins.length - 1;
    }, [bins, boardWidth]);

    const drop = useCallback((startX: number) => {
        setIsDropping(true);
        setShowBall(true);
        setResult(null);
        setLandedBin(null);
        setHoverX(null);
        setIsPickingOther(false);
        setOtherPickedToken(null);

        const horizontalSpacing = 50;
        const verticalSpacing = 40;
        const startY = 55;

        const path: { x: number; y: number }[] = [];
        let x = startX;

        path.push({ x, y: -15 });
        path.push({ x, y: 15 });
        path.push({ x, y: 40 });

        for (let row = 0; row < pegRows; row++) {
            const pegY = startY + row * verticalSpacing;
            const goRight = Math.random() > 0.5;
            const direction = goRight ? 1 : -1;
            const bounceAmount = (horizontalSpacing * 0.5) * (0.9 + Math.random() * 0.2);
            const wobble = (Math.random() - 0.5) * 3;

            path.push({ x: x + wobble, y: pegY - 2 });
            path.push({ x: x, y: pegY + 4 });
            const newX = x + direction * bounceAmount * 0.6;
            path.push({ x: newX, y: pegY + 12 });
            x = x + direction * bounceAmount;
            x = Math.max(30, Math.min(boardWidth - 30, x));
            path.push({ x, y: pegY + verticalSpacing * 0.8 });
        }

        // Determine final bin
        const finalBin = getBinAtPosition(x);
        const bin = bins[finalBin];

        // Calculate final X position (center of the bin)
        const binStartX = (bin.startPercent / 100) * boardWidth;
        const binWidth = (bin.widthPercent / 100) * boardWidth;
        const finalX = binStartX + binWidth / 2;

        path.push({ x: x, y: boardHeight - 60 });
        path.push({ x: (x + finalX) / 2, y: boardHeight - 50 });
        path.push({ x: finalX, y: boardHeight - 42 });
        path.push({ x: finalX, y: boardHeight - 38 });

        let step = 0;
        const baseDelay = 120;

        const animate = () => {
            if (step < path.length) {
                setBallPosition(path[step]);
                step++;
                const delay = baseDelay + Math.random() * 40;
                setTimeout(animate, delay);
            } else {
                setIsDropping(false);
                setLandedBin(finalBin);

                if (bin.isOther && bin.otherTokens && bin.otherTokens.length > 0) {
                    // "Other" was selected - show picking animation then choose random
                    setIsPickingOther(true);

                    // Cycle through "other" tokens visually
                    let cycleCount = 0;
                    const maxCycles = 12;
                    const cycleDelay = 100;

                    const cycle = () => {
                        if (cycleCount < maxCycles) {
                            const randomToken = bin.otherTokens![Math.floor(Math.random() * bin.otherTokens!.length)];
                            setOtherPickedToken(randomToken.token);
                            cycleCount++;
                            setTimeout(cycle, cycleDelay + cycleCount * 15); // Slow down over time
                        } else {
                            // Final selection
                            const finalToken = bin.otherTokens![Math.floor(Math.random() * bin.otherTokens!.length)];
                            setOtherPickedToken(finalToken.token);
                            setResult(finalToken.token);
                            setIsPickingOther(false);
                            onResult(finalToken.token);
                        }
                    };
                    cycle();
                } else {
                    setResult(bin.token);
                    onResult(bin.token);
                }
            }
        };
        animate();
    }, [bins, boardHeight, boardWidth, onResult, pegRows, getBinAtPosition]);

    return (
        <div className="plinko-container">
            <div className="plinko-board" style={{ width: boardWidth, height: boardHeight }}>
                {/* Drop Zone */}
                <div
                    className={`plinko-drop-zone ${isDropping ? 'disabled' : ''}`}
                    onClick={handleDropZoneClick}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                >
                    <span className="drop-zone-label">TAP ANYWHERE HERE TO DROP</span>
                    {hoverX !== null && !isDropping && (
                        <div className="drop-preview" style={{ left: hoverX - 10 }} />
                    )}
                </div>

                <div className="plinko-grid" />

                {/* Pegs */}
                {pegs.map((peg, i) => (
                    <div
                        key={i}
                        className="plinko-peg"
                        style={{ left: peg.x - 4, top: peg.y - 4 }}
                    />
                ))}

                {/* Ball */}
                {showBall && (
                    <motion.div
                        className="plinko-ball"
                        animate={{ x: ballPosition.x - 10, y: ballPosition.y - 10 }}
                        transition={{ type: "spring", stiffness: 450, damping: 30, mass: 0.5 }}
                    />
                )}

                {/* Bins with probability-based widths */}
                <div className="plinko-bins">
                    {bins.map((bin, i) => {
                        const color = bin.isOther ? OTHER_COLOR : getTokenColor(bin.colorIndex);
                        const bgColor = bin.isOther
                            ? 'rgba(100, 116, 139, 0.15)'
                            : getTokenColorLight(bin.colorIndex);
                        const borderColor = bin.isOther
                            ? 'rgba(100, 116, 139, 0.4)'
                            : getTokenColorBorder(bin.colorIndex);

                        return (
                            <div
                                key={i}
                                className={`plinko-bin ${landedBin === i ? 'active' : ''} ${bin.isOther ? 'other-bin' : ''}`}
                                style={{
                                    width: `${bin.widthPercent}%`,
                                    background: `linear-gradient(180deg, ${bgColor}, rgba(0,0,0,0.1))`,
                                    borderColor: borderColor,
                                }}
                            >
                                <span className="bin-token" style={{ color }}>
                                    {bin.isOther ? '🎲 Other' : (bin.token.trim() || '(space)')}
                                </span>
                                <span className="bin-prob" style={{ color, opacity: 0.7 }}>
                                    {(bin.probability * 100).toFixed(0)}%
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* "Other" Picking Animation */}
            <AnimatePresence>
                {isPickingOther && otherPickedToken && (
                    <motion.div
                        className="other-picking-overlay"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                    >
                        <div className="other-picking-content">
                            <span className="picking-label">🎲 Picking from Others...</span>
                            <motion.span
                                className="picking-token"
                                key={otherPickedToken}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                {otherPickedToken}
                            </motion.span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Result */}
            {
                result && !isPickingOther && (
                    <motion.div
                        className="plinko-result"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <span className="result-label">Picked:</span>
                        <strong className="result-token">{result}</strong>
                    </motion.div>
                )
            }
        </div >
    );
};
