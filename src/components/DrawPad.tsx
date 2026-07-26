import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

const INK = '#1a1d23'; // 단색 펜(색 선택 기능 제거)
const SIZES = [2, 4, 8];

export default function DrawPad() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState(SIZES[1]);
  const [eraser, setEraser] = useState(false);

  // 캔버스를 컨테이너 크기에 맞추고 고해상도(DPR) 대응.
  // ResizeObserver로 '탭 전환 후 보여질 때'(0 → 실제폭)까지 처리하고,
  // 폭이 0(숨김)일 땐 건드리지 않아 그림을 보존한다.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement!;
    const H = 150; // 세로 스크롤 없이 한눈에 보이도록 낮춤(계산기까지 함께 노출)
    let curW = 0;
    const resize = () => {
      const w = parent.clientWidth;
      if (w === 0 || w === curW) return; // 숨김 상태거나 변화 없음 → 보존
      const dpr = window.devicePixelRatio || 1;
      const prev = document.createElement('canvas');
      prev.width = canvas.width;
      prev.height = canvas.height;
      prev.getContext('2d')?.drawImage(canvas, 0, 0);
      canvas.width = w * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${H}px`;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (curW > 0 && prev.width) ctx.drawImage(prev, 0, 0, prev.width, prev.height, 0, 0, w, H);
      curW = w;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    resize();
    return () => ro.disconnect();
  }, []);

  const pos = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    last.current = pos(e);
    canvasRef.current!.setPointerCapture(e.pointerId);
  };
  const move = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const p = pos(e);
    ctx.globalCompositeOperation = eraser ? 'destination-out' : 'source-over';
    ctx.strokeStyle = INK;
    ctx.lineWidth = eraser ? size * 4 : size;
    ctx.beginPath();
    ctx.moveTo(last.current!.x, last.current!.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };
  const end = () => {
    drawing.current = false;
    last.current = null;
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  };

  return (
    <div className="draw">
      <div className="draw-toolbar">
        <div className="sizes">
          {SIZES.map((s) => (
            <button
              key={s}
              className={`size-btn${size === s ? ' active' : ''}`}
              onClick={() => setSize(s)}
              type="button"
            >
              <span style={{ width: s + 2, height: s + 2 }} />
            </button>
          ))}
        </div>
        <button
          className={`btn ghost sm${eraser ? ' active' : ''}`}
          onClick={() => setEraser((v) => !v)}
          type="button"
        >
          지우개
        </button>
        <button className="btn ghost sm" onClick={clear} type="button">
          초기화
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="draw-canvas"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
    </div>
  );
}
