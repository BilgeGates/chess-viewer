import { createContext, useCallback, useContext, useRef } from 'react';
import type { ChessDragData } from '@constants';
import { dragThreshold } from '@utils';

export const DROP_ID_ATTR = 'data-drop-id';
export const DRAG_OVER_ATTR = 'data-drag-over';

const TOUCH_GHOST_SCALE = 1.4;

export interface DragSession {
  dragData: ChessDragData;
  ghost: HTMLDivElement;
  halfSize: number;
  pointerId: number;
}

export interface DragApi {
  startDrag(session: DragSession): void;
  isDragging(): boolean;
  registerDropTarget(
    id: string,
    el: HTMLElement,
    data: Record<string, unknown>
  ): void;
  unregisterDropTarget(id: string): void;
}

export const DragApiCtx = createContext<DragApi>({
  startDrag: () => {},
  isDragging: () => false,
  registerDropTarget: () => {},
  unregisterDropTarget: () => {}
});

export const DragActiveCtx = createContext<ChessDragData | null>(null);

export function useDragActive() {
  return useContext(DragActiveCtx);
}

function createGhost(src: string, size: number, x: number, y: number) {
  const half = size / 2;
  const ghost = document.createElement('div');
  ghost.setAttribute('aria-hidden', 'true');
  ghost.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    `width:${size}px`,
    `height:${size}px`,
    'pointer-events:none',
    'z-index:9999',
    'will-change:transform',
    'contain:strict',
    `transform:translate3d(${x - half}px,${y - half}px,0)`
  ].join(';');

  const img = document.createElement('img');
  img.src = src;
  img.draggable = false;
  img.style.cssText = [
    'width:100%',
    'height:100%',
    'object-fit:contain',
    'filter:drop-shadow(0 4px 8px rgba(0,0,0,0.35))',
    'pointer-events:none',
    'user-select:none',
    '-webkit-user-select:none'
  ].join(';');
  ghost.appendChild(img);
  return { ghost, half };
}

interface UseDraggableOptions {
  data: ChessDragData;
  imageSrc: string | null;
  disabled?: boolean;
}

export function useDraggable({
  data,
  imageSrc,
  disabled
}: UseDraggableOptions) {
  const active = useDragActive();
  const { startDrag, isDragging: dragInProgress } = useContext(DragApiCtx);
  const dataRef = useRef(data);
  dataRef.current = data;

  const isDragging =
    !!active &&
    active.piece === data.piece &&
    active.fromRow === data.fromRow &&
    active.fromCol === data.fromCol &&
    active.isFromPalette === data.isFromPalette;

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (disabled || !imageSrc || !e.isPrimary || dragInProgress()) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      const el = e.currentTarget as HTMLElement;
      const { clientX: startX, clientY: startY, pointerId } = e;
      const threshold = dragThreshold(e.pointerType);

      el.setPointerCapture(pointerId);

      const cleanup = () => {
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', cleanup);
        el.removeEventListener('pointercancel', cleanup);
        if (el.hasPointerCapture(pointerId))
          el.releasePointerCapture(pointerId);
      };

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < threshold)
          return;
        ev.preventDefault();
        cleanup();
        const { width, height } = el.getBoundingClientRect();
        const scale = ev.pointerType === 'mouse' ? 1 : TOUCH_GHOST_SCALE;
        const { ghost, half } = createGhost(
          imageSrc,
          Math.max(width, height) * scale,
          ev.clientX,
          ev.clientY
        );
        startDrag({
          dragData: dataRef.current,
          ghost,
          halfSize: half,
          pointerId
        });
      };

      el.addEventListener('pointermove', onMove, { passive: false });
      el.addEventListener('pointerup', cleanup);
      el.addEventListener('pointercancel', cleanup);
    },
    [disabled, imageSrc, startDrag, dragInProgress]
  );

  return { isDragging, onPointerDown };
}

interface UseDroppableOptions {
  id: string;
  data: Record<string, unknown>;
}

export function useDroppable({ id, data }: UseDroppableOptions) {
  const { registerDropTarget, unregisterDropTarget } = useContext(DragApiCtx);
  const stateRef = useRef({ data, registerDropTarget, unregisterDropTarget });
  stateRef.current = { data, registerDropTarget, unregisterDropTarget };

  return useCallback(
    (el: HTMLElement | null) => {
      if (el) {
        stateRef.current.registerDropTarget(id, el, stateRef.current.data);
      } else {
        stateRef.current.unregisterDropTarget(id);
      }
    },
    [id]
  );
}
