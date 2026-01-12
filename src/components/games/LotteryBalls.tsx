"use client";

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTokenColor, OTHER_COLOR, isValidToken } from '@/lib/colors';

interface Alternative {
    token: string;
    token_id: number;
    probability: number;
    log_probability: number;
    is_other: boolean;
}

interface LotteryBallsProps {
    alternatives: Alternative[];
    onResult: (token: string) => void;
    disabled?: boolean;
}

interface Ball {
    id: number;
    token: string;
    probability: number;
    color: string;
    isOther: boolean;
    x: number;
    y: number;
    vx: number;
    vy: number;
}

const MIN_PROBABILITY_THRESHOLD = 0.03;
const BALL_RADIUS = 25;
const CONTAINER_WIDTH = 350;
const CONTAINER_HEIGHT = 280;

export const LotteryBalls: React.FC<LotteryBallsProps> = ({ alternatives, onResult, disabled }) => {
    const [isMixing, setIsMixing] = useState(false);
    const [balls, setBalls] = useState<Ball[]>([]);
    const [selectedBall, setSelectedBall] = useState<Ball | null>(null);
    const [showResult, setShowResult] = useState(false);
    const animationRef = useRef<number | null>(null);

    // Process alternatives with merging
    const { tokens, otherTokens } = useMemo(() => {
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
            if (alt.probability >= MIN_PROBABILITY_THRESHOLD && main.length < 10) {
                main.push(alt);
            } else {
                other.push(alt);
            }
        }

        return { tokens: main, otherTokens: other };
    }, [alternatives]);

    // Initialize balls
    useEffect(() => {
        const newBalls: Ball[] = tokens.map((t, i) => ({
            id: i,
            token: t.token,
            probability: t.probability,
            color: getTokenColor(i),
            isOther: false,
            x: BALL_RADIUS + Math.random() * (CONTAINER_WIDTH - BALL_RADIUS * 2),
            y: BALL_RADIUS + Math.random() * (CONTAINER_HEIGHT - BALL_RADIUS * 2),
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
        }));

        if (otherTokens.length > 0) {
            const otherProb = otherTokens.reduce((sum, t) => sum + t.probability, 0);
            newBalls.push({
                id: tokens.length,
                token: 'Other',
                probability: otherProb,
                color: OTHER_COLOR,
                isOther: true,
                x: BALL_RADIUS + Math.random() * (CONTAINER_WIDTH - BALL_RADIUS * 2),
                y: BALL_RADIUS + Math.random() * (CONTAINER_HEIGHT - BALL_RADIUS * 2),
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
            });
        }

        setBalls(newBalls);
        setSelectedBall(null);
    }, [tokens, otherTokens]);

    // Animation loop for bouncing balls
    const animate = useCallback(() => {
        setBalls(prevBalls => {
            return prevBalls.map(ball => {
                let { x, y, vx, vy } = ball;

                // Add some randomness
                vx += (Math.random() - 0.5) * 0.5;
                vy += (Math.random() - 0.5) * 0.5;

                // Limit velocity
                const maxV = 6;
                vx = Math.max(-maxV, Math.min(maxV, vx));
                vy = Math.max(-maxV, Math.min(maxV, vy));

                // Move
                x += vx;
                y += vy;

                // Bounce off walls
                if (x < BALL_RADIUS) { x = BALL_RADIUS; vx = Math.abs(vx); }
                if (x > CONTAINER_WIDTH - BALL_RADIUS) { x = CONTAINER_WIDTH - BALL_RADIUS; vx = -Math.abs(vx); }
                if (y < BALL_RADIUS) { y = BALL_RADIUS; vy = Math.abs(vy); }
                if (y > CONTAINER_HEIGHT - BALL_RADIUS) { y = CONTAINER_HEIGHT - BALL_RADIUS; vy = -Math.abs(vy); }

                return { ...ball, x, y, vx, vy };
            });
        });

        animationRef.current = requestAnimationFrame(animate);
    }, []);

    // Weighted random selection
    const selectWeighted = useCallback(() => {
        const allItems = balls;
        const total = allItems.reduce((sum, b) => sum + b.probability, 0);
        let rand = Math.random() * total;

        for (const ball of allItems) {
            rand -= ball.probability;
            if (rand <= 0) {
                if (ball.isOther && otherTokens.length > 0) {
                    return {
                        ball,
                        token: otherTokens[Math.floor(Math.random() * otherTokens.length)].token
                    };
                }
                return { ball, token: ball.token };
            }
        }
        return { ball: allItems[0], token: allItems[0]?.token || '' };
    }, [balls, otherTokens]);

    const mix = useCallback(() => {
        if (isMixing || disabled || balls.length === 0) return;

        setIsMixing(true);
        setSelectedBall(null);
        setShowResult(false);

        // Start animation
        animationRef.current = requestAnimationFrame(animate);

        // After mixing, select a ball
        setTimeout(() => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }

            const { ball, token } = selectWeighted();
            setSelectedBall(ball);
            setShowResult(true);
            setIsMixing(false);

            setTimeout(() => {
                onResult(token);
                setShowResult(false);
            }, 1200);
        }, 3000);

    }, [isMixing, disabled, balls, animate, selectWeighted, onResult]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    return (
        <div className="lottery-container" style={{ padding: '1rem', textAlign: 'center' }}>
            {/* Lottery Machine */}
            <div
                style={{
                    background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95))',
                    border: '3px solid rgba(74, 222, 128, 0.5)',
                    borderRadius: '1rem 1rem 50% 50%',
                    padding: '1rem',
                    boxShadow: '0 0 30px rgba(74, 222, 128, 0.2), inset 0 0 20px rgba(0,0,0,0.3)',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Title */}
                <div style={{
                    color: 'rgba(74, 222, 128, 0.95)',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    marginBottom: '0.5rem',
                    textShadow: '0 0 10px rgba(74, 222, 128, 0.5)'
                }}>
                    🎱 LOTTERY DRAW
                </div>

                {/* Ball Container */}
                <div
                    style={{
                        width: `${CONTAINER_WIDTH}px`,
                        height: `${CONTAINER_HEIGHT}px`,
                        background: 'radial-gradient(ellipse at center, rgba(15, 23, 42, 0.8), rgba(0, 0, 0, 0.9))',
                        borderRadius: '50%',
                        margin: '0 auto',
                        position: 'relative',
                        border: '4px solid rgba(74, 222, 128, 0.3)',
                        overflow: 'hidden',
                    }}
                >
                    {/* Glass reflection */}
                    <div style={{
                        position: 'absolute',
                        top: '10%',
                        left: '20%',
                        width: '30%',
                        height: '15%',
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.2), transparent)',
                        borderRadius: '50%',
                        pointerEvents: 'none',
                    }} />

                    {/* Balls */}
                    {balls.map((ball) => (
                        <motion.div
                            key={ball.id}
                            animate={{
                                x: ball.x - BALL_RADIUS,
                                y: ball.y - BALL_RADIUS,
                                scale: selectedBall?.id === ball.id ? 1.3 : 1,
                            }}
                            transition={{
                                type: isMixing ? 'tween' : 'spring',
                                duration: isMixing ? 0.05 : 0.3,
                            }}
                            style={{
                                position: 'absolute',
                                width: `${BALL_RADIUS * 2}px`,
                                height: `${BALL_RADIUS * 2}px`,
                                borderRadius: '50%',
                                background: `radial-gradient(circle at 30% 30%, ${ball.color.replace('0.85', '1')}, ${ball.color.replace('0.85', '0.6')})`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: 700,
                                fontSize: '0.65rem',
                                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                                boxShadow: selectedBall?.id === ball.id
                                    ? `0 0 30px ${ball.color}, 0 0 60px ${ball.color}`
                                    : '0 4px 10px rgba(0,0,0,0.4)',
                                border: selectedBall?.id === ball.id
                                    ? '3px solid white'
                                    : '2px solid rgba(255,255,255,0.3)',
                                zIndex: selectedBall?.id === ball.id ? 10 : 1,
                            }}
                        >
                            {ball.isOther ? '🎲' : ball.token.trim().slice(0, 4)}
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Draw Button */}
            <motion.button
                onClick={mix}
                disabled={isMixing || disabled || balls.length === 0}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                    background: isMixing
                        ? 'rgba(100, 116, 139, 0.5)'
                        : 'linear-gradient(135deg, rgba(74, 222, 128, 0.9), rgba(52, 211, 153, 0.9))',
                    border: 'none',
                    borderRadius: '0.75rem',
                    padding: '0.75rem 2rem',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '1rem',
                    cursor: isMixing || disabled ? 'not-allowed' : 'pointer',
                    boxShadow: isMixing ? 'none' : '0 4px 20px rgba(74, 222, 128, 0.4)',
                    marginTop: '1rem',
                }}
            >
                {isMixing ? '🎱 MIXING...' : '🎱 DRAW BALL'}
            </motion.button>

            {/* Result overlay */}
            <AnimatePresence>
                {showResult && selectedBall && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            background: `linear-gradient(135deg, ${selectedBall.color.replace('0.85', '0.95')}, ${selectedBall.color.replace('0.85', '0.8')})`,
                            padding: '1rem 2rem',
                            borderRadius: '1rem',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '1.5rem',
                            boxShadow: `0 10px 40px ${selectedBall.color}`,
                            zIndex: 50,
                        }}
                    >
                        🎱 {selectedBall.isOther ? 'Other' : selectedBall.token.trim()}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
