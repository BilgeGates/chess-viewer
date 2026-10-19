import { type CSSProperties, memo, useMemo, useState } from 'react';

import { LATEX_PACKAGE_META, pieceCounts } from '@utils';
import { useSiteTheme } from '../hooks/useSiteTheme';
import {
  type StudioPosition,
  type StudioSettings,
  previewDataUri,
  usableFen
} from '../utils/latexProject';

const PAGE_SIZE = 12;
const PREVIEW_SIZE = 260;

interface PreviewCardProps {
  position: StudioPosition;
  number: number;
  settings: StudioSettings;
  coordColor: 'black' | 'white';
}

const PreviewCard = memo(function PreviewCard({
  position,
  number,
  settings,
  coordColor
}: PreviewCardProps) {
  const meta = LATEX_PACKAGE_META[settings.latexPackage];
  const isDiagram = settings.latexPackage === 'diagram';
  const src = useMemo(
    () =>
      previewDataUri(
        meta.supportsFlip ? position : { ...position, flipped: false },
        {
          size: PREVIEW_SIZE,
          showCoords: !isDiagram && settings.showCoords,
          showAnnotations: meta.supportsMarks,
          coordColor
        }
      ),
    [position, meta, isDiagram, settings.showCoords, coordColor]
  );
  const fen = usableFen(position.fen);
  const counts = fen ? pieceCounts(fen) : null;
  const credits = [position.author, position.source, position.award]
    .filter(Boolean)
    .join(' — ');
  const showCount = counts && (isDiagram || settings.pieceCount);

  return (
    <figure className="flex min-w-0 flex-col items-center gap-2 text-center">
      <div className="grid aspect-square w-full max-w-[16rem] place-items-center">
        {src ? (
          <img
            src={src}
            alt={`Diagram ${number}`}
            width={PREVIEW_SIZE}
            height={PREVIEW_SIZE}
            loading="lazy"
            decoding="async"
            className="size-full object-contain"
          />
        ) : (
          <span className="px-3 text-xs font-semibold text-error">
            Invalid FEN — left out
          </span>
        )}
      </div>
      <figcaption className="space-y-0.5 text-xs text-text-secondary">
        {settings.numbering && (
          <p className="font-bold text-text-primary">No. {number}</p>
        )}
        {credits && <p className="leading-snug">{credits}</p>}
        {(position.stipulation || showCount) && (
          <p className="font-semibold text-text-primary">
            {position.stipulation}
            {position.stipulation && showCount ? '  ' : ''}
            {showCount && (
              <span className="font-normal text-text-muted">
                ({counts.white}+{counts.black})
              </span>
            )}
          </p>
        )}
      </figcaption>
    </figure>
  );
});

interface PreviewPanelProps {
  positions: StudioPosition[];
  settings: StudioSettings;
}

export const PreviewPanel = memo(function PreviewPanel({
  positions,
  settings
}: PreviewPanelProps) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const theme = useSiteTheme();
  const coordColor = theme === 'dark' ? 'white' : 'black';
  const shown = positions.slice(0, visible);
  const columns = Math.min(settings.columns, 4);

  return (
    <div className="flex flex-col gap-3">
      <div
        className="grid grid-cols-[repeat(var(--preview-columns),minmax(0,1fr))] gap-x-3 gap-y-6 rounded-xl border border-border bg-surface-elevated p-3 max-sm:grid-cols-[repeat(min(var(--preview-columns),2),minmax(0,1fr))] sm:gap-x-4 sm:p-4"
        style={{ '--preview-columns': columns } as CSSProperties}
      >
        {shown.map((position, index) => (
          <PreviewCard
            key={position.id}
            position={position}
            number={index + 1}
            settings={settings}
            coordColor={coordColor}
          />
        ))}
      </div>
      <p className="text-[11px] leading-relaxed text-text-muted">
        An approximation of the printed page. Coordinates follow the site theme
        here and print in black; fonts and spacing come from LaTeX.
      </p>
      {visible < positions.length && (
        <button
          type="button"
          onClick={() => setVisible((count) => count + PAGE_SIZE)}
          className="min-h-10 rounded-lg border border-border/60 bg-surface px-3 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Show more ({positions.length - visible} left)
        </button>
      )}
    </div>
  );
});
