import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import Calculator from './Calculator';

function MemoTextarea() {
  const [memo, setMemo] = useState('');

  return (
    <textarea
      value={memo}
      onChange={(event) => setMemo(event.target.value)}
      placeholder="다음 문제로 넘어가면 지워집니다"
      className="block h-full w-full resize-none border-0 bg-white px-3 py-2.5 text-sm outline-none"
    />
  );
}

export default function ToolDock({ resetKey }: { resetKey?: string | number }) {
  const [tab, setTab] = useState<'memo' | 'draw'>('memo');
  const [memoReset, setMemoReset] = useState(0);
  const [drawTool, setDrawTool] = useState<'pen' | 'eraser'>('pen');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || tab !== 'draw') return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    canvas.getContext('2d')?.scale(dpr, dpr);
  }, [tab, resetKey]);

  const position = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const start = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    last.current = position(event);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const move = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const context = event.currentTarget.getContext('2d');
    if (!context) return;
    const next = position(event);
    context.globalCompositeOperation = drawTool === 'eraser' ? 'destination-out' : 'source-over';
    context.strokeStyle = '#18181b';
    context.lineWidth = drawTool === 'eraser' ? 8 : 2;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(last.current.x, last.current.y);
    context.lineTo(next.x, next.y);
    context.stroke();
    last.current = next;
  };

  const end = () => {
    drawing.current = false;
    last.current = null;
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-zinc-200">
        <div className="flex h-10 items-center overflow-hidden whitespace-nowrap border-b border-zinc-100 px-2">
          <button
            type="button"
            onClick={() => setTab('memo')}
            className={`px-2 py-1.5 text-xs font-semibold ${
              tab === 'memo' ? 'text-red-600' : 'text-zinc-400'
            }`}
          >
            메모장
          </button>
          <button
            type="button"
            onClick={() => setTab('draw')}
            className={`px-2 py-1.5 text-xs font-semibold ${
              tab === 'draw' ? 'text-red-600' : 'text-zinc-400'
            }`}
          >
            그림판
          </button>
          {tab === 'draw' && (
            <div className="ml-1 flex shrink-0 items-center gap-1 border-l border-zinc-100 pl-2">
              <button
                type="button"
                onClick={() => setDrawTool('pen')}
                className={`rounded px-1.5 py-1 text-[11px] font-medium ${
                  drawTool === 'pen' ? 'bg-zinc-800 text-white' : 'text-zinc-400'
                }`}
              >
                펜
              </button>
              <button
                type="button"
                onClick={() => setDrawTool('eraser')}
                className={`rounded px-1.5 py-1 text-[11px] font-medium ${
                  drawTool === 'eraser' ? 'bg-zinc-800 text-white' : 'text-zinc-400'
                }`}
              >
                지우개
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              if (tab === 'memo') setMemoReset((value) => value + 1);
              else clearCanvas();
            }}
            className="ml-auto shrink-0 px-2 py-1.5 text-xs text-zinc-400 hover:text-zinc-600"
          >
            전체 지우기
          </button>
        </div>
        <div className="h-44 overflow-hidden rounded-b-lg">
          {tab === 'memo' ? (
            <MemoTextarea key={`${resetKey}:${memoReset}`} />
          ) : (
            <canvas
              ref={canvasRef}
              onPointerDown={start}
              onPointerMove={move}
              onPointerUp={end}
              onPointerLeave={end}
              className="block h-full w-full touch-none bg-white"
            />
          )}
        </div>
      </div>
      <Calculator key={resetKey} />
    </div>
  );
}
