"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Alternative {
    token: string;
    token_id: number;
    probability: number;
    log_probability: number;
    is_other: boolean;
}

interface SpinningWheelProps {
    alternatives: Alternative[];
    onResult: (token: string) => void;
    disabled?: boolean;
}

export const SpinningWheel: React.FC<SpinningWheelProps> = ({ alternatives, onResult, disabled }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [result, setResult] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Colors for wheel segments
    const colors = [
        '#22d3ee', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316',
        '#eab308', '#22c55e', '#14b8a6', '#6366f1', '#a855f7'
    ];

    // Draw the wheel
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || alternatives.length === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 10;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let startAngle = 0;
        alternatives.forEach((alt, i) => {
            const sliceAngle = alt.probability * 2 * Math.PI;

            // Draw segment
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = alt.is_other ? '#666' : colors[i % colors.length];
            ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw label - horizontal text, no rotation
            const midAngle = startAngle + sliceAngle / 2;
            const labelRadius = radius * 0.6;
            const labelX = centerX + Math.cos(midAngle) * labelRadius;
            const labelY = centerY + Math.sin(midAngle) * labelRadius;

            ctx.save();
            ctx.translate(labelX, labelY);
            // Keep text horizontal - no rotation
            ctx.fillStyle = '#000';
            ctx.font = 'bold 12px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Add text shadow for readability
            ctx.shadowColor = 'rgba(255,255,255,0.8)';
            ctx.shadowBlur = 3;

            // Truncate long tokens
            const displayToken = alt.is_other ? '〈OTHER〉' : alt.token.trim().slice(0, 6);
            ctx.fillText(displayToken, 0, 0);
            ctx.restore();

            startAngle += sliceAngle;
        });

        // Draw center circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

    }, [alternatives]);

    const spin = () => {
        if (isSpinning || disabled || alternatives.length === 0) return;

        setIsSpinning(true);
        setResult(null);

        // Weighted random selection
        const total = alternatives.reduce((sum, a) => sum + a.probability, 0);
        let random = Math.random() * total;
        let selectedIndex = 0;

        for (let i = 0; i < alternatives.length; i++) {
            random -= alternatives[i].probability;
            if (random <= 0) {
                selectedIndex = i;
                break;
            }
        }

        // Calculate angle to land on selected segment
        let angleSum = 0;
        for (let i = 0; i < selectedIndex; i++) {
            angleSum += alternatives[i].probability * 360;
        }
        const segmentMidAngle = angleSum + (alternatives[selectedIndex].probability * 360) / 2;

        // Spin multiple rotations + land on segment
        // The pointer is at top (270 degrees), so we need to offset
        const targetAngle = 270 - segmentMidAngle;
        const spins = 5 + Math.floor(Math.random() * 3); // 5-7 full spins
        const finalRotation = rotation + (spins * 360) + targetAngle - (rotation % 360);

        setRotation(finalRotation);

        // Announce result after spin
        setTimeout(() => {
            setIsSpinning(false);
            setResult(alternatives[selectedIndex].token);
            onResult(alternatives[selectedIndex].token);
        }, 4000);
    };

    return (
        <div className="wheel-container">
            <div className="wheel-pointer">▼</div>
            <motion.div
                className="wheel-spinner"
                animate={{ rotate: rotation }}
                transition={{ duration: 4, ease: [0.2, 0.8, 0.2, 1] }}
            >
                <canvas
                    ref={canvasRef}
                    width={400}
                    height={400}
                    className="wheel-canvas"
                />
            </motion.div>
            <button
                className="spin-btn"
                onClick={spin}
                disabled={isSpinning || disabled}
            >
                {isSpinning ? 'Spinning...' : 'SPIN'}
            </button>
            {result && (
                <div className="wheel-result">
                    Selected: <strong>{result}</strong>
                </div>
            )}
        </div>
    );
};
