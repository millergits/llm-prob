"use client";

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTokenColor, OTHER_COLOR, isValidToken } from '@/lib/colors';

interface Alternative {
    token: string;
    token_id: number;
    probability: number;
    log_probability: number;
    is_other: boolean;
}

interface WedgeData {
    token: string;
    token_id: number;
    probability: number;
    startAngle: number;
    endAngle: number;
    angle: number;
    color: string;
    isOther: boolean;
    otherTokens?: Alternative[];
}

interface SpinWheelProps {
    alternatives: Alternative[];
    onResult: (token: string) => void;
    disabled?: boolean;
}

const MIN_PROBABILITY_THRESHOLD = 0.03;

export const SpinWheel: React.FC<SpinWheelProps> = ({ alternatives, onResult, disabled }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [result, setResult] = useState<string | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [isPickingOther, setIsPickingOther] = useState(false);
    const [otherPickedToken, setOtherPickedToken] = useState<string | null>(null);
    const [currentWord, setCurrentWord] = useState<string | null>(null);
    const spinAnimRef = useRef<number | null>(null);

    const wheelSize = 500;
    const centerX = wheelSize / 2;
    const centerY = wheelSize / 2;
    const radius = wheelSize / 2 - 25;
    const outerLabelRadius = radius + 100;


    // Create wedges with "Other" category
    const wedges: WedgeData[] = useMemo(() => {
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

        const mainTokens: Alternative[] = [];
        const otherTokens: Alternative[] = [];

        for (const alt of sorted) {
            if (alt.probability >= MIN_PROBABILITY_THRESHOLD) {
                mainTokens.push(alt);
            } else {
                otherTokens.push(alt);
            }
        }

        const otherProbSum = otherTokens.reduce((sum, t) => sum + t.probability, 0);
        const totalProb = mainTokens.reduce((sum, t) => sum + t.probability, 0) + otherProbSum;

        if (totalProb === 0) return [];

        const result: WedgeData[] = [];
        let currentAngle = -90;

        for (let i = 0; i < mainTokens.length; i++) {
            const alt = mainTokens[i];
            const angle = (alt.probability / totalProb) * 360;
            const startAngle = currentAngle;
            currentAngle += angle;

            result.push({
                token: alt.token,
                token_id: alt.token_id,
                probability: alt.probability,
                startAngle,
                endAngle: currentAngle,
                angle,
                color: getTokenColor(i),
                isOther: false,
            });
        }

        if (otherTokens.length > 0 && otherProbSum > 0) {
            const angle = (otherProbSum / totalProb) * 360;
            result.push({
                token: 'Other',
                token_id: -1,
                probability: otherProbSum,
                startAngle: currentAngle,
                endAngle: currentAngle + angle,
                angle,
                color: OTHER_COLOR,
                isOther: true,
                otherTokens,
            });
        }

        return result;
    }, [alternatives]);

    const createWedgePath = (startAngle: number, endAngle: number): string => {
        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;
        const x1 = centerX + radius * Math.cos(startRad);
        const y1 = centerY + radius * Math.sin(startRad);
        const x2 = centerX + radius * Math.cos(endRad);
        const y2 = centerY + radius * Math.sin(endRad);
        const largeArc = endAngle - startAngle > 180 ? 1 : 0;
        return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    };

    const getEdgePosition = (startAngle: number, endAngle: number) => {
        const midAngle = ((startAngle + endAngle) / 2) * (Math.PI / 180);
        return {
            edgeX: centerX + radius * Math.cos(midAngle),
            edgeY: centerY + radius * Math.sin(midAngle),
            outerX: centerX + outerLabelRadius * Math.cos(midAngle),
            outerY: centerY + outerLabelRadius * Math.sin(midAngle),
        };
    };

    // Calculate which wedge is at the pointer position given a rotation
    const getWedgeAtPointer = useCallback((rot: number) => {
        const normalizedRot = ((rot % 360) + 360) % 360;
        const pointerAngle = ((-90 - normalizedRot) % 360 + 360) % 360 - 360;

        for (const wedge of wedges) {
            if (pointerAngle >= wedge.startAngle && pointerAngle < wedge.endAngle) {
                return wedge;
            }
            if (pointerAngle + 360 >= wedge.startAngle && pointerAngle + 360 < wedge.endAngle) {
                return wedge;
            }
        }
        return wedges[0];
    }, [wedges]);

    const spin = useCallback(() => {
        if (isSpinning || disabled || wedges.length === 0) return;

        setIsSpinning(true);
        setResult(null);
        setSelectedIndex(null);
        setIsPickingOther(false);
        setOtherPickedToken(null);
        setCurrentWord(null);

        // Select winner based on weighted probability
        const total = wedges.reduce((sum, w) => sum + w.probability, 0);
        let random = Math.random() * total;
        let winnerIndex = 0;

        for (let i = 0; i < wedges.length; i++) {
            random -= wedges[i].probability;
            if (random <= 0) {
                winnerIndex = i;
                break;
            }
        }

        const winner = wedges[winnerIndex];
        const winnerMidAngle = (winner.startAngle + winner.endAngle) / 2;
        const targetAngle = -90 - winnerMidAngle;
        const spins = 5 + Math.random() * 3;
        const startRotation = rotation;
        const finalRotation = startRotation + (spins * 360) + targetAngle - (startRotation % 360);
        const totalDelta = finalRotation - startRotation;

        setRotation(finalRotation);

        // Animate current word indicator
        const spinDuration = 4000;
        const startTime = Date.now();

        const updateCurrentWord = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / spinDuration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const currentRot = startRotation + totalDelta * eased;

            const wedge = getWedgeAtPointer(currentRot);
            if (wedge) {
                setCurrentWord(wedge.isOther ? '🎲 Other' : wedge.token.trim());
            }

            if (progress < 1) {
                spinAnimRef.current = requestAnimationFrame(updateCurrentWord);
            }
        };
        spinAnimRef.current = requestAnimationFrame(updateCurrentWord);

        setTimeout(() => {
            if (spinAnimRef.current) cancelAnimationFrame(spinAnimRef.current);
            setIsSpinning(false);
            setCurrentWord(null);
            setSelectedIndex(winnerIndex);

            if (winner.isOther && winner.otherTokens && winner.otherTokens.length > 0) {
                setIsPickingOther(true);
                let cycleCount = 0;
                const maxCycles = 12;

                const cycle = () => {
                    if (cycleCount < maxCycles) {
                        const randomToken = winner.otherTokens![Math.floor(Math.random() * winner.otherTokens!.length)];
                        setOtherPickedToken(randomToken.token);
                        cycleCount++;
                        setTimeout(cycle, 100 + cycleCount * 15);
                    } else {
                        const finalToken = winner.otherTokens![Math.floor(Math.random() * winner.otherTokens!.length)];
                        setOtherPickedToken(finalToken.token);
                        setResult(finalToken.token);
                        setIsPickingOther(false);
                        onResult(finalToken.token);
                    }
                };
                cycle();
            } else {
                setResult(winner.token);
                onResult(winner.token);
            }
        }, spinDuration);
    }, [isSpinning, disabled, wedges, rotation, onResult, getWedgeAtPointer]);

    const containerSize = wheelSize + 220;
    const wheelOffset = (containerSize - wheelSize) / 2;

    return (
        <div className="spin-wheel-container">
            <div
                className="wheel-wrapper"
                onClick={spin}
                style={{ width: containerSize, height: containerSize, position: 'relative' }}
            >
                {/* Current word indicator - shows during spin */}
                <AnimatePresence>
                    {isSpinning && currentWord && (
                        <motion.div
                            className="current-word-indicator"
                            key={currentWord}
                            initial={{ opacity: 0.5 }}
                            animate={{ opacity: 1 }}
                            style={{
                                position: 'absolute',
                                top: wheelOffset - 45,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                zIndex: 25,
                                background: 'rgba(15, 23, 42, 0.95)',
                                border: '2px solid rgba(34, 211, 238, 0.6)',
                                borderRadius: '0.5rem',
                                padding: '0.4rem 1rem',
                                fontSize: '1rem',
                                fontWeight: 700,
                                color: 'rgba(34, 211, 238, 0.95)',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 0 20px rgba(34, 211, 238, 0.3)',
                            }}
                        >
                            {currentWord}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Pointer */}
                <div
                    className="wheel-pointer"
                    style={{
                        position: 'absolute',
                        top: wheelOffset - 8,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 20
                    }}
                >
                    ▼
                </div>

                {/* External word labels - simple fade during spin */}
                <AnimatePresence>
                    {wedges.filter(w => w.angle > 12).map((wedge, i) => {
                        const pos = getEdgePosition(wedge.startAngle, wedge.endAngle);
                        const edgeX = pos.edgeX + wheelOffset;
                        const edgeY = pos.edgeY + wheelOffset;
                        const outerX = pos.outerX + wheelOffset;
                        const outerY = pos.outerY + wheelOffset;

                        return (
                            <motion.div
                                key={wedge.token_id}
                                className="word-label-group"
                                animate={{ opacity: isSpinning ? 0 : 1 }}
                                transition={{ duration: 0.3 }}
                                style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}
                            >
                                <svg width={containerSize} height={containerSize} style={{ position: 'absolute', left: 0, top: 0 }}>
                                    <line x1={edgeX} y1={edgeY} x2={outerX} y2={outerY} stroke={wedge.color} strokeWidth="2" strokeDasharray="4,2" opacity={0.6} />
                                    <circle cx={edgeX} cy={edgeY} r={4} fill={wedge.color} />
                                </svg>

                                <div
                                    className="outer-word-label"
                                    style={{
                                        position: 'absolute',
                                        left: outerX,
                                        top: outerY,
                                        transform: 'translate(-50%, -50%)',
                                        background: wedge.isOther ? 'rgba(100, 116, 139, 0.9)' : 'rgba(15, 23, 42, 0.9)',
                                        border: `2px solid ${wedge.color}`,
                                        borderRadius: '0.5rem',
                                        padding: '0.35rem 0.6rem',
                                        fontSize: '0.9rem',
                                        fontWeight: 600,
                                        color: 'white',
                                        whiteSpace: 'nowrap',
                                        boxShadow: `0 0 10px ${wedge.color.replace('0.85', '0.3')}`,
                                    }}
                                >
                                    {wedge.isOther ? '🎲 Other' : wedge.token.trim()}
                                    <span style={{ marginLeft: '0.4rem', fontSize: '0.75rem', opacity: 0.7 }}>
                                        {(wedge.probability * 100).toFixed(0)}%
                                    </span>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {/* Wheel */}
                <motion.svg
                    width={wheelSize}
                    height={wheelSize}
                    className="spin-wheel"
                    style={{ position: 'absolute', left: wheelOffset, top: wheelOffset }}
                    animate={{ rotate: rotation }}
                    transition={{ duration: 4, ease: [0.2, 0.8, 0.3, 1] }}
                >
                    {wedges.map((wedge, i) => (
                        <g key={i}>
                            <path
                                d={createWedgePath(wedge.startAngle, wedge.endAngle)}
                                fill={wedge.color}
                                stroke="rgba(0, 0, 0, 0.4)"
                                strokeWidth="2"
                                className={selectedIndex === i ? 'winning-wedge' : ''}
                            />
                            {wedge.isOther && wedge.angle > 20 && (
                                <text
                                    x={centerX + (radius * 0.6) * Math.cos(((wedge.startAngle + wedge.endAngle) / 2) * Math.PI / 180)}
                                    y={centerY + (radius * 0.6) * Math.sin(((wedge.startAngle + wedge.endAngle) / 2) * Math.PI / 180)}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fontSize="24"
                                >
                                    🎲
                                </text>
                            )}
                        </g>
                    ))}

                    <circle cx={centerX} cy={centerY} r={55} fill="rgba(15, 23, 42, 0.95)" stroke="rgba(34, 211, 238, 0.6)" strokeWidth="4" style={{ cursor: 'pointer' }} />
                    <text x={centerX} y={centerY - 8} textAnchor="middle" dominantBaseline="middle" fill="rgba(34, 211, 238, 0.95)" fontSize="11" fontWeight="600">
                        {isSpinning ? '' : 'CLICK TO'}
                    </text>
                    <text x={centerX} y={centerY + 10} textAnchor="middle" dominantBaseline="middle" fill="rgba(34, 211, 238, 0.95)" fontSize="16" fontWeight="700">
                        {isSpinning ? '🎰' : 'SPIN'}
                    </text>
                </motion.svg>
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
                            <motion.span className="picking-token" key={otherPickedToken} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                                {otherPickedToken}
                            </motion.span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Result */}
            {result && !isPickingOther && (
                <motion.div className="spin-result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <span className="result-label">Picked:</span>
                    <strong className="result-token">{result}</strong>
                </motion.div>
            )}
        </div>
    );
};
