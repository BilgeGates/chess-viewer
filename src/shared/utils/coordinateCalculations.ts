import { getCoordinateParams } from '@chessviewer-org/chess-viewer';

// Types
interface TextMetricsExt {
  ascent: number;
  descent: number;
  height: number;
}

// Helpers
function getTextMetrics(
  ctx: CanvasRenderingContext2D,
  sample: string,
  fontSize: number
): TextMetricsExt {
  const metrics = ctx.measureText(sample);
  let ascent = fontSize * 0.8;
  if (Number.isFinite(metrics.actualBoundingBoxAscent)) {
    ascent = metrics.actualBoundingBoxAscent;
  }
  let descent = fontSize * 0.2;
  if (Number.isFinite(metrics.actualBoundingBoxDescent)) {
    descent = metrics.actualBoundingBoxDescent;
  }
  return { ascent, descent, height: ascent + descent };
}

function getBaselineFromCenter(
  centerY: number,
  metrics: TextMetricsExt
): number {
  return Math.round(centerY + (metrics.ascent - metrics.descent) / 2);
}

// Types
export interface CoordinateLayout {
  squareSize: number;
  boardX: number;
  boardY: number;
  boardSize: number;
  rankBandX: number;
  fileBandY: number;
  bandSize: number;
  flipped: boolean;
}

// Service
export function drawCoordinates(
  ctx: CanvasRenderingContext2D,
  layout: CoordinateLayout
): void {
  const { squareSize, boardX, boardY, boardSize, rankBandX, fileBandY } =
    layout;
  const { fontSize, fontWeight } = getCoordinateParams(boardSize);

  ctx.save();
  ctx.font = `${fontWeight} ${fontSize}px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`;
  ctx.fillStyle = '#000000';
  ctx.textRendering = 'optimizeLegibility';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const rankMetrics = getTextMetrics(ctx, '8', fontSize);
  const fileMetrics = getTextMetrics(ctx, 'g', fontSize);
  const rankX = Math.round(rankBandX + layout.bandSize * 0.5);
  const fileCenterY = Math.round(fileBandY + layout.bandSize * 0.55);

  for (let i = 0; i < 8; i++) {
    const rank = layout.flipped ? i + 1 : 8 - i;
    const file = String.fromCharCode(97 + (layout.flipped ? 7 - i : i));
    const centerY = Math.round(boardY + (i + 0.5) * squareSize);
    const centerX = Math.round(boardX + (i + 0.5) * squareSize);
    ctx.fillText(
      rank.toString(),
      rankX,
      getBaselineFromCenter(centerY, rankMetrics)
    );
    ctx.fillText(
      file,
      centerX,
      getBaselineFromCenter(fileCenterY, fileMetrics)
    );
  }

  ctx.restore();
}
