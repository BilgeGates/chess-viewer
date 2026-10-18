import {
  getDisplayCoordinates,
  getSquareBounds,
  isLightSquare,
  parseFEN,
  type SquarePattern
} from '@chessviewer-org/chess-viewer';

import {
  drawBoardPiece,
  fillBoardSquare,
  isHatchedSquare,
  readSquarePattern
} from './boardPattern';
import { drawCoordinates } from './coordinateCalculations';
import { ensurePieceResolution, getPieceKey } from './pieceUtils';
import {
  calculateRenderSurfaceSize,
  shouldForceCoordinateBorder
} from './imageOptimizer';

export interface RenderConfig {
  boardSize: number;
  showCoords: boolean;
  lightSquare: string;
  darkSquare: string;
  flipped: boolean;
  fen: string;
  pieceImages: Record<string, HTMLImageElement>;
  format?: 'png' | 'jpeg' | 'jpg';
  exportQuality?: number;
  showCoordinateBorder?: boolean;
  showThinFrame?: boolean;
  squarePattern?: SquarePattern;
}

export async function createUltraQualityCanvas(
  config: RenderConfig
): Promise<HTMLCanvasElement> {
  const {
    boardSize: bSize,
    showCoords,
    lightSquare,
    darkSquare,
    flipped,
    fen,
    pieceImages,
    format = 'png',
    showCoordinateBorder = true,
    exportQuality = 1,
    showThinFrame = false,
    squarePattern = readSquarePattern()
  } = config;

  if (
    !bSize ||
    bSize < 1 ||
    !lightSquare ||
    !darkSquare ||
    !fen ||
    !pieceImages ||
    !Object.keys(pieceImages).length
  ) {
    throw new Error('Invalid render config');
  }

  const board = parseFEN(fen);

  await Promise.all(
    Object.values(pieceImages).map(
      (img) =>
        new Promise<void>((res) => {
          if (!img || img.complete) return res();
          const t = setTimeout(done, 10000);
          function done() {
            clearTimeout(t);
            img.onload = img.onerror = null;
            res();
          }
          img.onload = img.onerror = done;
        })
    )
  );

  const {
    boardPixels: bPx,
    borderSize: border,
    outline,
    shouldShowFrame: hasFrame,
    frameThickness: frame,
    canvasWidth: cW,
    canvasHeight: cH
  } = calculateRenderSurfaceSize(
    bSize,
    showCoords,
    exportQuality,
    showThinFrame
  );

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, cW);
  canvas.height = Math.max(1, cH);

  try {
    const ctx = canvas.getContext('2d', {
      alpha: true,
      desynchronized: false,
      willReadFrequently: false
    });
    if (!ctx) throw new Error('No canvas context');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const sq = bPx / 8;
    const offset = hasFrame ? frame : 0;
    const bX = border + offset + outline;
    const bY = offset + outline;
    const yieldToMain = () => new Promise((res) => setTimeout(res, 0));

    const targetPiecePx = Math.ceil(sq);
    const resolvedPieces: Record<string, HTMLImageElement> = {};
    await Promise.all(
      Object.entries(pieceImages).map(async ([key, img]) => {
        if (!img) return;
        try {
          resolvedPieces[key] = await ensurePieceResolution(img, targetPiecePx);
        } catch {
          resolvedPieces[key] = img;
        }
      })
    );

    ctx.clearRect(0, 0, cW, cH);
    await yieldToMain();

    if (hasFrame) {
      ctx.fillStyle = '#333';
      ctx.fillRect(0, 0, cW, frame);
      ctx.fillRect(0, cH - frame, cW, frame);
      ctx.fillRect(0, 0, frame, cH);
      ctx.fillRect(cW - frame, 0, frame, cH);
    }

    if (
      showCoords &&
      (shouldForceCoordinateBorder(exportQuality) || showCoordinateBorder) &&
      format.startsWith('jp')
    ) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(offset, offset, border, bPx + outline * 2);
      ctx.fillRect(
        offset,
        offset + bPx + outline * 2,
        border + bPx + outline * 2,
        border
      );
    }

    ctx.fillStyle = '#000';
    ctx.fillRect(
      bX - outline,
      bY - outline,
      bPx + outline * 2,
      bPx + outline * 2
    );
    await yieldToMain();

    const fill = {
      light: lightSquare,
      dark: darkSquare,
      pattern: squarePattern
    };
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const [vR, vC] = getDisplayCoordinates(row, col, flipped);
        const { x, y, width, height } = getSquareBounds(vR, vC, sq, bX, bY);
        fillBoardSquare(
          ctx,
          x,
          y,
          width,
          height,
          isLightSquare(row, col),
          fill
        );
      }
    }
    await yieldToMain();

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const pKey = getPieceKey(board[row]?.[col] ?? '');
        if (!pKey) continue;
        const img = resolvedPieces[pKey] ?? pieceImages[pKey];
        if (!img?.complete || img.naturalWidth <= 0) continue;
        const [vR, vC] = getDisplayCoordinates(row, col, flipped);
        const square = getSquareBounds(vR, vC, sq, bX, bY);
        const sz = Math.min(square.width, square.height);
        drawBoardPiece(
          ctx,
          img,
          square.x + (square.width - sz) / 2,
          square.y + (square.height - sz) / 2,
          sz,
          isHatchedSquare(isLightSquare(row, col), fill)
            ? { color: lightSquare, square }
            : null
        );
      }
      await yieldToMain();
    }

    if (showCoords)
      drawCoordinates(ctx, {
        squareSize: sq,
        boardX: bX,
        boardY: bY,
        boardSize: bPx,
        rankBandX: offset,
        fileBandY: bY + bPx + outline,
        bandSize: border,
        flipped
      });
    await yieldToMain();
    return canvas;
  } catch (err) {
    canvas.width = canvas.height = 0;
    throw err;
  }
}
