import { WordBuilder } from '@/components/WordBuilder';

export default function Home() {
  return (
    <main className="app-container">
      {/* Ambient Background */}
      <div className="ambient-bg">
        <div className="ambient-glow-1" />
        <div className="ambient-glow-2" />
        <div className="ambient-glow-3" />
      </div>

      {/* Header */}
      <header className="header">
        <h1 className="header-title">PROBABILITY PULSE</h1>
        <div className="header-meta">
          <span>GEMINI-2.0-FLASH</span>
          <span>LOGPROBS: ENABLED</span>
          <span>GAMES: ON</span>
        </div>
      </header>

      {/* Main Content */}
      <div className="main-content">
        <WordBuilder />
      </div>

      {/* Footer */}
      <footer className="footer">
        Build sentences word-by-word using probability-rigged games.
      </footer>
    </main>
  );
}
