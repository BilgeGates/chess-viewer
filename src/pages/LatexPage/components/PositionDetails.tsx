import { memo, useCallback, useMemo, useState } from 'react';

import { ChevronLeft, ChevronRight } from '@/assets/icons';

import { FENInputField } from '@/components/features';
import { Switch } from '@ui';
import { LATEX_PACKAGE_META, pieceCounts } from '@utils';
import {
  type StudioPosition,
  type StudioSettings,
  positionWarnings,
  previewDataUri,
  usableFen
} from '../utils/latexProject';
import type { LatexProjectActions } from '../hooks/useLatexProject';
import { useSiteTheme } from '../hooks/useSiteTheme';
import { readFenFromClipboard } from '../utils/clipboardFen';
import { ColorField, Section, TextField } from './controls';

const PREVIEW_SIZE = 360;

const NAV_BUTTON =
  'inline-flex size-9 items-center justify-center rounded-lg border border-border/60 text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40';

const ACTION_BUTTON =
  'inline-flex min-h-10 items-center justify-center rounded-lg border border-border/60 bg-surface px-3 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50';

interface PositionDetailsProps {
  position: StudioPosition;
  index: number;
  total: number;
  previousId: string | null;
  nextId: string | null;
  settings: StudioSettings;
  actions: LatexProjectActions;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

function listWarning(label: string, invalid: string[]): string | null {
  return invalid.length ? `Ignored ${label}: ${invalid.join(', ')}` : null;
}

export const PositionDetails = memo(function PositionDetails({
  position,
  index,
  total,
  previousId,
  nextId,
  settings,
  actions,
  onNotify
}: PositionDetailsProps) {
  const meta = LATEX_PACKAGE_META[settings.latexPackage];
  const isDiagram = settings.latexPackage === 'diagram';
  const marksEnabled = meta.supportsMarks;
  const theme = useSiteTheme();
  const [applied, setApplied] = useState(false);

  const preview = useMemo(
    () =>
      previewDataUri(
        meta.supportsFlip ? position : { ...position, flipped: false },
        {
          size: PREVIEW_SIZE,
          showCoords: !isDiagram && settings.showCoords,
          showAnnotations: marksEnabled,
          coordColor: theme === 'dark' ? 'white' : 'black'
        }
      ),
    [position, meta, isDiagram, settings.showCoords, marksEnabled, theme]
  );
  const fen = usableFen(position.fen);
  const counts = fen ? pieceCounts(fen) : null;
  const warnings = useMemo(() => positionWarnings(position), [position]);

  const { id } = position;
  const patch = useCallback(
    (change: Partial<StudioPosition>) => actions.updatePosition(id, change),
    [actions, id]
  );
  const handleFen = useCallback(
    (next: string) => patch({ fen: next }),
    [patch]
  );
  const handlePaste = useCallback(async () => {
    const result = await readFenFromClipboard();
    if (result.ok) patch({ fen: result.fen });
    else onNotify(result.reason, 'error');
  }, [patch, onNotify]);

  const applyShared = () => {
    actions.applyToAll({
      author: position.author,
      source: position.source,
      award: position.award,
      stipulation: position.stipulation,
      remark: position.remark
    });
    setApplied(true);
    onNotify(`Details copied to all ${total} positions`);
  };

  return (
    <div className="flex flex-col gap-4">
      <Section
        title={`No. ${index + 1}`}
        description={`${index + 1} of ${total}`}
        actions={
          <>
            <button
              type="button"
              className={NAV_BUTTON}
              disabled={!previousId}
              aria-label="Previous position"
              onClick={() => previousId && actions.select(previousId)}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={NAV_BUTTON}
              disabled={!nextId}
              aria-label="Next position"
              onClick={() => nextId && actions.select(nextId)}
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </>
        }
      >
        <div className="mx-auto grid aspect-square w-full max-w-[18rem] place-items-center">
          {preview ? (
            <img
              src={preview}
              alt={`Preview of position ${index + 1}`}
              width={PREVIEW_SIZE}
              height={PREVIEW_SIZE}
              className="size-full object-contain"
            />
          ) : (
            <p className="px-4 text-center text-xs text-error">
              Fix the FEN to see the board
            </p>
          )}
        </div>
        {counts && (
          <p className="text-center text-[11px] text-text-muted">
            White {counts.white} · Black {counts.black}
          </p>
        )}

        <FENInputField
          key={id}
          fen={position.fen}
          onChange={handleFen}
          onPaste={() => void handlePaste()}
          allowBatch={false}
        />

        {meta.supportsFlip && (
          <Switch
            label="Black at the bottom"
            description="Turn the board around for this diagram."
            checked={position.flipped}
            onChange={(flipped) => patch({ flipped })}
          />
        )}
      </Section>

      <Section
        title="Problem"
        description="Printed with the diagram. Leave a field empty to omit it."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
          <TextField
            label="Stipulation"
            value={position.stipulation}
            onChange={(stipulation) => patch({ stipulation })}
            placeholder="#2, h#3, +, ="
          />
          <TextField
            label="Author"
            value={position.author}
            onChange={(author) => patch({ author })}
            placeholder="Loyd, Sam"
            hint={
              isDiagram
                ? 'Surname, First name; use ; between authors.'
                : undefined
            }
          />
          <TextField
            label="Source"
            value={position.source}
            onChange={(source) => patch({ source })}
            placeholder="Chess Monthly, 1903"
          />
          <TextField
            label="Award"
            value={position.award}
            onChange={(award) => patch({ award })}
            placeholder="1st Prize"
          />
        </div>
        <button
          type="button"
          className={ACTION_BUTTON}
          disabled={total < 2}
          onClick={applyShared}
          onBlur={() => setApplied(false)}
        >
          {applied ? 'Copied to every position' : 'Use these details for all'}
        </button>
      </Section>

      <Section title="Notes">
        {!isDiagram && (
          <TextField
            label="Caption"
            value={position.caption}
            onChange={(caption) => patch({ caption })}
            placeholder="Initial position"
          />
        )}
        <TextField
          label="Remark"
          value={position.remark}
          onChange={(remark) => patch({ remark })}
          placeholder="Dedicated to …"
        />
        <TextField
          label="Solution"
          value={position.solution}
          onChange={(solution) => patch({ solution })}
          multiline
          rows={3}
          maxLength={2000}
          placeholder="1.Qh5! Nf6 2.Qxf7#"
          hint={
            settings.solutions
              ? 'Printed in the Solutions section at the end.'
              : 'Turn on the Solutions section in Document to print it.'
          }
        />
      </Section>

      {marksEnabled ? (
        <Section
          title="Highlights and arrows"
          description="Squares like e4 d5, arrows like e2-e4 g1-f3."
        >
          <div className="grid grid-cols-[minmax(0,1fr)_4.5rem] items-start gap-3">
            <TextField
              label="Highlighted squares"
              value={position.squares}
              onChange={(squares) => patch({ squares })}
              placeholder="e4 d5"
              error={listWarning('squares', warnings.squares)}
            />
            <ColorField
              label="Colour"
              value={position.squareColor}
              onChange={(squareColor) => patch({ squareColor })}
            />
            <TextField
              label="Circled squares"
              value={position.rings}
              onChange={(rings) => patch({ rings })}
              placeholder="f7"
              error={listWarning('squares', warnings.rings)}
            />
            <ColorField
              label="Colour"
              value={position.ringColor}
              onChange={(ringColor) => patch({ ringColor })}
            />
            <TextField
              label="Arrows"
              value={position.arrows}
              onChange={(arrows) => patch({ arrows })}
              placeholder="e2-e4 g1-f3"
              error={listWarning('arrows', warnings.arrows)}
            />
            <ColorField
              label="Colour"
              value={position.arrowColor}
              onChange={(arrowColor) => patch({ arrowColor })}
            />
          </div>
        </Section>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-4 py-3 text-[11px] leading-relaxed text-text-muted">
          Highlights and arrows are available with the chessboard package.
          {isDiagram
            ? ' The diagram package always prints White at the bottom.'
            : ''}
        </p>
      )}
    </div>
  );
});
