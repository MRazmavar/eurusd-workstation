/**
 * Mobile Replay Controller Bar.
 * Sleek, compact floating or docked bar for controlling Bar Replay on mobile screens.
 */
import React from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Scissors,
  X,
} from 'lucide-react';
import { replayEngine, ReplaySpeed } from '../services/ReplayEngine';

interface MobileReplayBarProps {
  replayPlaying: boolean;
  replaySpeed: ReplaySpeed;
  replayCurrentIndex: number;
  replayTotalCandles: number;
  onExitReplay: () => void;
  onStartSelectCut?: () => void;
  isSelectingCut?: boolean;
}

export const MobileReplayBar: React.FC<MobileReplayBarProps> = ({
  replayPlaying,
  replaySpeed,
  replayCurrentIndex,
  replayTotalCandles,
  onExitReplay,
  onStartSelectCut,
  isSelectingCut = false,
}) => {
  return (
    <div
      data-testid="mobile-replay-bar"
      className="h-10 bg-[#1e222d] border-b border-[#2a2e39] px-2 flex items-center justify-between text-xs z-25 select-none"
    >
      <div className="flex items-center space-x-1.5">
        <span className="w-2 h-2 rounded-full bg-[#2962ff] animate-ping" />
        <span className="font-bold text-[#2962ff] text-[11px]">REPLAY</span>
        <span className="text-[10px] text-gray-400 font-mono">
          {replayCurrentIndex + 1}/{replayTotalCandles}
        </span>
      </div>

      <div className="flex items-center space-x-1.5">
        {/* Cut / Jump to Bar */}
        <button
          onClick={onStartSelectCut}
          className={`p-1.5 rounded transition-colors ${
            isSelectingCut
              ? 'bg-[#f23645] text-white animate-pulse'
              : 'bg-[#131722] text-gray-300 hover:text-white border border-[#2a2e39]'
          }`}
          title="Jump to Bar: Tap chart to cut future bars"
        >
          <Scissors size={13} className={isSelectingCut ? 'text-white' : 'text-[#f23645]'} />
        </button>

        {/* Step Back */}
        <button
          onClick={() => replayEngine.stepBackward(1)}
          className="p-1.5 rounded bg-[#131722] text-gray-300 hover:text-white border border-[#2a2e39]"
          title="Step Back 1 Bar"
        >
          <SkipBack size={13} />
        </button>

        {/* Play / Pause */}
        <button
          onClick={() => replayEngine.togglePlayPause()}
          className="p-1.5 rounded bg-[#2962ff] text-white shadow"
          title={replayPlaying ? 'Pause' : 'Play'}
        >
          {replayPlaying ? <Pause size={13} /> : <Play size={13} className="fill-white" />}
        </button>

        {/* Step Forward */}
        <button
          onClick={() => replayEngine.stepForward(1)}
          className="p-1.5 rounded bg-[#131722] text-gray-300 hover:text-white border border-[#2a2e39]"
          title="Step Forward 1 Bar"
        >
          <SkipForward size={13} />
        </button>

        {/* Speed Selector */}
        <select
          value={replaySpeed}
          onChange={(e) => replayEngine.setSpeed(Number(e.target.value) as ReplaySpeed)}
          className="bg-[#131722] text-white text-[10px] font-mono rounded px-1 py-1 border border-[#2a2e39] focus:outline-none"
        >
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={2}>2x</option>
          <option value={3}>3x</option>
          <option value={5}>5x</option>
        </select>

        {/* Exit Replay */}
        <button
          onClick={onExitReplay}
          className="p-1.5 rounded text-gray-400 hover:text-[#f23645]"
          title="Exit Bar Replay"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
