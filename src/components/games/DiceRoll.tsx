"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTokenColor, OTHER_COLOR, isValidToken } from '@/lib/colors';

interface Alternative {
    token: string;
    token_id: number;
    probability: number;
    log_probability: number;
    is_other: boolean;
}

interface DiceRollProps {
    alternatives: Alternative[];
    onResult: (token: string) => void;
    disabled?: boolean;
}

const MIN_PROBABILITY_THRESHOLD = 0.03;

export const DiceRoll: React.FC<DiceRollProps> = ({ alternatives, onResult, disabled }) => {
    const [isRolling, setIsRolling] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [diceRotation, setDiceRotation] = useState({ x: 0, y: 0, z: 0 });
    const [showResult, setShowResult] = useState(false);
    const [currentFace, setCurrentFace] = useState<string | null>(null);

    // Process alternatives with merging
    const { faces, otherTokens } = useMemo(() => {
        const filtered = [...alternatives].filter(a => !a.is_other && isValidToken(a.token));

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

        const main: Alternative[] = [];
        const other: Alternative[] = [];

        for (const alt of sorted) {
            if (alt.probability >= MIN_PROBABILITY_THRESHOLD && main.length < 6) {
                main.push(alt);
            } else {
                other.push(alt);
            }
        }

        return { faces: main, otherTokens: other };
    }, [alternatives]);

    // Create dice faces (max 6)
    const diceFaces = useMemo(() => {
        const items = faces.slice(0, 6).map((f, i) => ({
            token: f.token,
            probability: f.probability,
            color: getTokenColor(i),
            isOther: false,
        }));

        // Fill remaining faces with Other if needed
        if (otherTokens.length > 0 && items.length < 6) {
            const otherProb = otherTokens.reduce((sum, t) => sum + t.probability, 0);
            items.push({
                token: 'Other',
                probability: otherProb,
                color: OTHER_COLOR,
                isOther: true,
            });
        }

        // Pad to 6 faces if needed
        while (items.length < 6 && items.length > 0) {
            items.push({ ...items[items.length - 1] });
        }

        return items;
    }, [faces, otherTokens]);

    // Weighted random selection
    const selectWeighted = useCallback(() => {
        const allItems = [...faces.slice(0, 6)];
        if (otherTokens.length > 0) {
            const otherProb = otherTokens.reduce((sum, t) => sum + t.probability, 0);
            allItems.push({
                token: 'Other',
                probability: otherProb,
                token_id: -1,
                log_probability: 0,
                is_other: true
            } as Alternative);
        }

        const total = allItems.reduce((sum, s) => sum + s.probability, 0);
        let rand = Math.random() * total;

        for (const item of allItems) {
            rand -= item.probability;
            if (rand <= 0) {
                if (item.token === 'Other' && otherTokens.length > 0) {
                    return otherTokens[Math.floor(Math.random() * otherTokens.length)].token;
                }
                return item.token;
            }
        }
        return allItems[0]?.token || '';
    }, [faces, otherTokens]);

    const roll = useCallback(() => {
        if (isRolling || disabled || diceFaces.length === 0) return;

        setIsRolling(true);
        setResult(null);
        setShowResult(false);
        setCurrentFace(null);

        // Select winning token
        const winningToken = selectWeighted();

        // Animate dice tumbling
        let rotations = 0;
        const maxRotations = 15;
        const interval = setInterval(() => {
            rotations++;

            // Random tumbling rotation
            setDiceRotation({
                x: Math.random() * 720 - 360,
                y: Math.random() * 720 - 360,
                z: Math.random() * 180 - 90,
            });

            // Show random face during roll
            const randomFace = diceFaces[Math.floor(Math.random() * diceFaces.length)];
            setCurrentFace(randomFace.token);

            if (rotations >= maxRotations) {
                clearInterval(interval);

                // Final landing
                const faceIndex = diceFaces.findIndex(f => f.token === winningToken || (f.isOther && !diceFaces.some(x => x.token === winningToken && !x.isOther)));
                const finalFace = faceIndex >= 0 ? faceIndex : 0;

                // Calculate final rotation based on face
                const finalRotations = [
                    { x: 0, y: 0, z: 0 },      // Face 1 (front)
                    { x: 0, y: 180, z: 0 },    // Face 2 (back)
                    { x: 0, y: 90, z: 0 },     // Face 3 (right)
                    { x: 0, y: -90, z: 0 },    // Face 4 (left)
                    { x: -90, y: 0, z: 0 },    // Face 5 (top)
                    { x: 90, y: 0, z: 0 },     // Face 6 (bottom)
                ];

                setDiceRotation(finalRotations[finalFace % 6]);
                setCurrentFace(winningToken);
                setResult(winningToken);
                setShowResult(true);
                setIsRolling(false);

                setTimeout(() => {
                    onResult(winningToken);
                    setShowResult(false);
                }, 1000);
            }
        }, 100);

    }, [isRolling, disabled, diceFaces, selectWeighted, onResult]);

    return (
        <div className="dice-roll-container" style={{ padding: '1rem', textAlign: 'center' }}>
            {/* Dice Area */}
            <div
                onClick={roll}
                style={{
                    perspective: '600px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '280px',
                    cursor: isRolling || disabled ? 'not-allowed' : 'pointer',
                }}
            >
                {/* 3D Dice */}
                <motion.div
                    animate={diceRotation}
                    transition={{
                        duration: isRolling ? 0.1 : 0.5,
                        ease: isRolling ? 'linear' : [0.2, 0.8, 0.3, 1]
                    }}
                    style={{
                        width: '120px',
                        height: '120px',
                        position: 'relative',
                        transformStyle: 'preserve-3d',
                    }}
                >
                    {/* Dice Faces */}
                    {diceFaces.map((face, i) => {
                        const transforms = [
                            'translateZ(60px)',                           // Front
                            'rotateY(180deg) translateZ(60px)',          // Back
                            'rotateY(90deg) translateZ(60px)',           // Right
                            'rotateY(-90deg) translateZ(60px)',          // Left
                            'rotateX(90deg) translateZ(60px)',           // Top
                            'rotateX(-90deg) translateZ(60px)',          // Bottom
                        ];

                        return (
                            <div
                                key={i}
                                style={{
                                    position: 'absolute',
                                    width: '120px',
                                    height: '120px',
                                    background: `linear-gradient(135deg, ${face.color.replace('0.85', '0.95')}, ${face.color.replace('0.85', '0.7')})`,
                                    border: '3px solid rgba(255,255,255,0.3)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transform: transforms[i],
                                    backfaceVisibility: 'hidden',
                                    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)',
                                }}
                            >
                                <span style={{
                                    color: 'white',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                    textAlign: 'center',
                                    padding: '0.25rem',
                                }}>
                                    {face.isOther ? '🎲' : face.token.trim().slice(0, 8)}
                                </span>
                                <span style={{
                                    color: 'rgba(255,255,255,0.7)',
                                    fontSize: '0.7rem',
                                    marginTop: '0.25rem',
                                }}>
                                    {(face.probability * 100).toFixed(0)}%
                                </span>
                            </div>
                        );
                    })}
                </motion.div>
            </div>

            {/* Roll Button */}
            <motion.button
                onClick={roll}
                disabled={isRolling || disabled || diceFaces.length === 0}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                    background: isRolling
                        ? 'rgba(100, 116, 139, 0.5)'
                        : 'linear-gradient(135deg, rgba(139, 92, 246, 0.9), rgba(168, 85, 247, 0.9))',
                    border: 'none',
                    borderRadius: '0.75rem',
                    padding: '0.75rem 2rem',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '1rem',
                    cursor: isRolling || disabled ? 'not-allowed' : 'pointer',
                    boxShadow: isRolling ? 'none' : '0 4px 20px rgba(139, 92, 246, 0.4)',
                    marginTop: '1rem',
                }}
            >
                {isRolling ? '🎲 ROLLING...' : '🎲 ROLL DICE'}
            </motion.button>

            {/* Current face indicator during roll */}
            <AnimatePresence>
                {isRolling && currentFace && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            marginTop: '1rem',
                            color: 'rgba(168, 85, 247, 0.8)',
                            fontSize: '1.2rem',
                            fontWeight: 600,
                        }}
                    >
                        {currentFace.trim()}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Result overlay */}
            <AnimatePresence>
                {showResult && result && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.95), rgba(168, 85, 247, 0.95))',
                            padding: '1rem 2rem',
                            borderRadius: '1rem',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '1.5rem',
                            boxShadow: '0 10px 40px rgba(139, 92, 246, 0.5)',
                            zIndex: 50,
                        }}
                    >
                        🎲 {result.trim()}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
