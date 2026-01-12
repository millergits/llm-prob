"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';

interface Alternative {
    token: string;
    token_id: number;
    probability: number;
    log_probability: number;
    is_other: boolean;
}

interface PlinkoProps {
    alternatives: Alternative[];
    onResult: (token: string) => void;
    disabled?: boolean;
}

/**
 * Maps LLM probabilities to Plinko bin positions using binomial distribution.
 */
function arrangeBinsByProbability(alternatives: Alternative[], binCount: number): Alternative[] {
    const sorted = [...alternatives]
        .filter(a => !a.is_other)
        .sort((a, b) => b.probability - a.probability)
        .slice(0, binCount);

    const arranged: (Alternative | null)[] = new Array(binCount).fill(null);
    const centerIndex = Math.floor(binCount / 2);

    let left = centerIndex;
    let right = centerIndex;
    let useLeft = true;

    for (let i = 0; i < sorted.length; i++) {
        if (i === 0) {
            arranged[centerIndex] = sorted[i];
        } else if (useLeft && left > 0) {
            left--;
            arranged[left] = sorted[i];
            useLeft = false;
        } else if (right < binCount - 1) {
            right++;
            arranged[right] = sorted[i];
            useLeft = true;
        } else if (left > 0) {
            left--;
            arranged[left] = sorted[i];
        }
    }

    const remaining = alternatives.filter(a => !a.is_other && !sorted.includes(a));
    let remainingIdx = 0;
    for (let i = 0; i < arranged.length; i++) {
        if (!arranged[i] && remainingIdx < remaining.length) {
            arranged[i] = remaining[remainingIdx++];
        }
    }

    return arranged.filter((a): a is Alternative => a !== null);
}

export const Plinko: React.FC<PlinkoProps> = ({ alternatives, onResult, disabled }) => {
    const [isDropping, setIsDropping] = useState(false);
    const [showBall, setShowBall] = useState(false); // Keep ball visible after landing
    const [ballPosition, setBallPosition] = useState({ x: 350, y: -30 });
    const [result, setResult] = useState<string | null>(null);
    const [landedBin, setLandedBin] = useState<number | null>(null);
    const [hoverX, setHoverX] = useState<number | null>(null);

    // BIGGER dimensions
    const boardWidth = 700;
    const boardHeight = 480;
    const pegRows = 10;
    const binCount = 12; // More bins = more words

    // Arrange bins so high-probability words are in center
    const arrangedAlternatives = useMemo(
        () => arrangeBinsByProbability(alternatives, binCount),
        [alternatives, binCount]
    );

    // Generate peg positions - equidistant hexagonal grid
    const pegs = useMemo(() => {
        const pegsList: { x: number; y: number; row: number }[] = [];

        // Use consistent spacing for equidistant layout
        const horizontalSpacing = 50; // Same spacing between all pegs
        const verticalSpacing = 40;   // Same vertical spacing between rows
        const startY = 55;            // Top margin

        // Calculate how many pegs fit per row
        const pegsPerRow = Math.floor((boardWidth - 60) / horizontalSpacing);
        const rowWidth = (pegsPerRow - 1) * horizontalSpacing;
        const startX = (boardWidth - rowWidth) / 2;

        for (let row = 0; row < pegRows; row++) {
            // Offset alternating rows by half spacing for hexagonal pattern
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
        return pegsList;
    }, [boardWidth, pegRows]);

    // Handle click on drop zone
    const handleDropZoneClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (isDropping || disabled || arrangedAlternatives.length === 0) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;

        // Clamp to valid range
        const dropX = Math.max(30, Math.min(boardWidth - 30, clickX));

        drop(dropX);
    }, [isDropping, disabled, arrangedAlternatives, boardWidth]);

    // Track mouse position for preview
    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (isDropping) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        setHoverX(Math.max(30, Math.min(boardWidth - 30, mouseX)));
    }, [isDropping, boardWidth]);

    const handleMouseLeave = useCallback(() => {
        setHoverX(null);
    }, []);

    const drop = useCallback((startX: number) => {
        setIsDropping(true);
        setShowBall(true);
        setResult(null);
        setLandedBin(null);
        setHoverX(null);

        // Match the peg grid spacing
        const horizontalSpacing = 50;
        const verticalSpacing = 40;
        const startY = 55;

        const path: { x: number; y: number }[] = [];
        let x = startX;

        // Start above the board - drop down to first row
        path.push({ x, y: -15 });
        path.push({ x, y: 15 });
        path.push({ x, y: 40 });

        // Navigate through each row - ball hits peg then bounces
        for (let row = 0; row < pegRows; row++) {
            const pegY = startY + row * verticalSpacing;

            // TRUE 50/50 random bounce direction
            const goRight = Math.random() > 0.5;
            const direction = goRight ? 1 : -1;

            // Add slight variation to make it feel more natural
            const bounceAmount = (horizontalSpacing * 0.5) * (0.9 + Math.random() * 0.2);

            // 1. Ball approaches peg (slight wobble)
            const wobble = (Math.random() - 0.5) * 3;
            path.push({ x: x + wobble, y: pegY - 2 });

            // 2. Ball hits peg center
            path.push({ x: x, y: pegY + 4 });

            // 3. Ball bounces to the side (hits the peg and deflects)
            const newX = x + direction * bounceAmount * 0.6;
            path.push({ x: newX, y: pegY + 12 });

            // 4. Ball continues falling to next row
            x = x + direction * bounceAmount;
            x = Math.max(30, Math.min(boardWidth - 30, x));
            path.push({ x, y: pegY + verticalSpacing * 0.8 });
        }

        // Calculate which bin the ball lands in
        const binWidth = boardWidth / binCount;
        let finalBin = Math.floor(x / binWidth);
        finalBin = Math.max(0, Math.min(binCount - 1, finalBin));

        const finalX = binWidth * finalBin + binWidth / 2;

        // Final approach to bin - settle in
        path.push({ x: x, y: boardHeight - 60 });
        path.push({ x: (x + finalX) / 2, y: boardHeight - 50 });
        path.push({ x: finalX, y: boardHeight - 42 });
        path.push({ x: finalX, y: boardHeight - 38 }); // Small settle

        // Animate ball along path - SLOWER timing
        let step = 0;
        const baseDelay = 120; // Much slower base speed

        const animate = () => {
            if (step < path.length) {
                setBallPosition(path[step]);
                step++;
                // Variable timing - slower near pegs (early in each row cycle)
                const delay = baseDelay + Math.random() * 40;
                setTimeout(animate, delay);
            } else {
                setIsDropping(false);
                setLandedBin(finalBin);

                if (finalBin < arrangedAlternatives.length) {
                    const selectedToken = arrangedAlternatives[finalBin].token;
                    setResult(selectedToken);
                    onResult(selectedToken);
                }
            }
        };
        animate();
    }, [arrangedAlternatives, binCount, boardHeight, boardWidth, onResult, pegRows]);

    return (
        <div className="plinko-container">
            {/* Instructions */}
            <div className="plinko-hint">
                👆 Click anywhere along the top to drop the chip
            </div>

            <div
                className="plinko-board"
                style={{ width: boardWidth, height: boardHeight }}
            >
                {/* Drop Zone - clickable area at top */}
                <div
                    className={`plinko-drop-zone ${isDropping ? 'disabled' : ''}`}
                    onClick={handleDropZoneClick}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                >
                    {/* Hover preview */}
                    {hoverX !== null && !isDropping && (
                        <div
                            className="drop-preview"
                            style={{ left: hoverX - 10 }}
                        />
                    )}
                </div>

                <div className="plinko-grid" />

                {/* Pegs */}
                {pegs.map((peg, i) => (
                    <div
                        key={i}
                        className="plinko-peg"
                        style={{
                            left: peg.x - 4,
                            top: peg.y - 4,
                        }}
                    />
                ))}

                {/* Ball - only show when active */}
                {showBall && (
                    <motion.div
                        className="plinko-ball"
                        animate={{
                            x: ballPosition.x - 10,
                            y: ballPosition.y - 10,
                        }}
                        transition={{
                            type: "spring",
                            stiffness: 450,
                            damping: 30,
                            mass: 0.5
                        }}
                    />
                )}

                {/* Bins */}
                <div className="plinko-bins">
                    {arrangedAlternatives.map((alt, i) => (
                        <div
                            key={i}
                            className={`plinko-bin ${landedBin === i ? 'active' : ''}`}
                            style={{ width: `${100 / binCount}%` }}
                        >
                            <span className="bin-token">{alt.token.trim()}</span>
                            <span className="bin-prob">{(alt.probability * 100).toFixed(0)}%</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Result */}
            {result && (
                <motion.div
                    className="plinko-result"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <span className="result-label">Picked:</span>
                    <strong className="result-token">{result}</strong>
                </motion.div>
            )}
        </div>
    );
};
