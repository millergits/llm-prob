// Shared color palette for consistent token coloring across all game components

export const TOKEN_COLORS = [
    'rgba(34, 211, 238, 0.85)',   // cyan
    'rgba(168, 85, 247, 0.85)',   // purple
    'rgba(74, 222, 128, 0.85)',   // green
    'rgba(251, 146, 60, 0.85)',   // orange
    'rgba(248, 113, 113, 0.85)', // red
    'rgba(96, 165, 250, 0.85)',  // blue
    'rgba(253, 224, 71, 0.85)',  // yellow
    'rgba(244, 114, 182, 0.85)', // pink
    'rgba(45, 212, 191, 0.85)',  // teal
    'rgba(139, 92, 246, 0.85)',  // violet
    'rgba(52, 211, 153, 0.85)',  // emerald
    'rgba(251, 191, 36, 0.85)',  // amber
];

export const OTHER_COLOR = 'rgba(100, 116, 139, 0.85)'; // Slate gray for "Other"

export function getTokenColor(index: number): string {
    return TOKEN_COLORS[index % TOKEN_COLORS.length];
}

// Returns a lighter version for backgrounds
export function getTokenColorLight(index: number): string {
    const color = TOKEN_COLORS[index % TOKEN_COLORS.length];
    return color.replace('0.85', '0.15');
}

// Returns a border-friendly version
export function getTokenColorBorder(index: number): string {
    const color = TOKEN_COLORS[index % TOKEN_COLORS.length];
    return color.replace('0.85', '0.6');
}

// Check if a token is valid for display (filters out control tokens, special chars, etc.)
export function isValidToken(token: string): boolean {
    if (!token) return false;

    const trimmed = token.trim();

    // Filter out empty/whitespace-only tokens
    if (!trimmed) return false;

    // Filter out control tokens like <ctrl100>, <0x0A>, <unk>, <pad>, <eos>, etc.
    if (/^<.*>$/.test(trimmed)) return false;

    // Filter out tokens that are just special characters or control chars
    if (/^[\x00-\x1F\x7F]+$/.test(trimmed)) return false;

    // Filter out tokens that look like byte representations
    if (/^\\x[0-9a-fA-F]+$/.test(trimmed)) return false;

    return true;
}
