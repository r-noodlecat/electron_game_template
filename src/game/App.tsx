import { useRef, useEffect, useCallback } from 'react';

interface Box {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
}

function App(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const box: Box = {
      x: canvas.clientWidth / 2,
      y: canvas.clientHeight / 2,
      vx: 180,
      vy: 140,
      size: 40,
      color: '#4fc3f7',
    };

    const MAX_DT = 0.1;
    let lastTime = 0;
    let frameId = 0;

    function resize(): void {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas!.clientWidth;
      const h = canvas!.clientHeight;
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function update(dt: number): void {
      box.x += box.vx * dt;
      box.y += box.vy * dt;

      const w = canvas!.clientWidth;
      const h = canvas!.clientHeight;

      if (box.x < 0) { box.x = 0; box.vx = Math.abs(box.vx); }
      else if (box.x + box.size > w) { box.x = w - box.size; box.vx = -Math.abs(box.vx); }

      if (box.y < 0) { box.y = 0; box.vy = Math.abs(box.vy); }
      else if (box.y + box.size > h) { box.y = h - box.size; box.vy = -Math.abs(box.vy); }
    }

    function render(): void {
      const w = canvas!.clientWidth;
      const h = canvas!.clientHeight;

      ctx!.fillStyle = '#0d0d0d';
      ctx!.fillRect(0, 0, w, h);

      ctx!.fillStyle = box.color;
      ctx!.fillRect(box.x, box.y, box.size, box.size);

      ctx!.fillStyle = '#444';
      ctx!.font = '13px monospace';
      ctx!.fillText('Replace this demo with your game in src/game/App.tsx', 12, h - 12);
    }

    function tick(timestamp: number): void {
      const dt = Math.min((timestamp - lastTime) / 1000, MAX_DT);
      lastTime = timestamp;
      resize();
      update(dt);
      render();
      frameId = requestAnimationFrame(tick);
    }

    resize();
    frameId = requestAnimationFrame(tick);

    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  useEffect(() => {
    const cleanup = gameLoop();
    return cleanup;
  }, [gameLoop]);

  return <canvas ref={canvasRef} id="game-canvas" />;
}

export default App;
