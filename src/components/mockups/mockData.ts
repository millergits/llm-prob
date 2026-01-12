export interface TokenData {
    id: string;
    text: string;
    prob: number;
    alternatives: Array<{ text: string; prob: number }>;
}

export const MOCK_SEQUENCE: TokenData[] = [
    {
        id: "1",
        text: "The",
        prob: 0.99,
        alternatives: [
            { text: "The", prob: 0.99 },
            { text: "A", prob: 0.005 },
            { text: "In", prob: 0.002 }
        ]
    },
    {
        id: "2",
        text: "future",
        prob: 0.85,
        alternatives: [
            { text: "future", prob: 0.85 },
            { text: "concept", prob: 0.08 },
            { text: "world", prob: 0.05 },
            { text: "end", prob: 0.01 }
        ]
    },
    {
        id: "3",
        text: "of",
        prob: 0.95,
        alternatives: [
            { text: "of", prob: 0.95 },
            { text: "is", prob: 0.03 },
            { text: "was", prob: 0.01 }
        ]
    },
    {
        id: "4",
        text: "AI",
        prob: 0.70,
        alternatives: [
            { text: "AI", prob: 0.70 },
            { text: "humanity", prob: 0.15 },
            { text: "computing", prob: 0.10 },
            { text: "technology", prob: 0.04 }
        ]
    },
    {
        id: "5",
        text: "is",
        prob: 0.92,
        alternatives: [
            { text: "is", prob: 0.92 },
            { text: "will", prob: 0.05 },
            { text: "has", prob: 0.02 }
        ]
    },
    {
        id: "6",
        text: "unwritten",
        prob: 0.45,
        alternatives: [
            { text: "unwritten", prob: 0.45 },
            { text: "here", prob: 0.25 },
            { text: "uncertain", prob: 0.15 },
            { text: "bright", prob: 0.10 }
        ]
    },
    {
        id: "7",
        text: ".",
        prob: 0.99,
        alternatives: [
            { text: ".", prob: 0.99 },
            { text: "and", prob: 0.005 }
        ]
    }
];
