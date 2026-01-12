import { WordBuilder } from '@/components/WordBuilder';

export default function Home() {
  return (
    <>
      {/* Ambient Background */}
      <div className="ambient-bg">
        <div className="ambient-glow-1" />
        <div className="ambient-glow-2" />
        <div className="ambient-glow-3" />
      </div>

      {/* Main App */}
      <WordBuilder />
    </>
  );
}
