import { memo, useCallback, useMemo, useState } from 'react';

import { ChevronDown, Copy, ListPlus, Plus, Trash2 } from '@/assets/icons';

import { useFENHistory } from '@hooks';
import { LATEX_MAX_POSITIONS, STARTING_FEN } from '@utils';
import {
  type LatexProject,
  type StudioPosition,
  fenProblem,
  previewDataUri
} from '../utils/latexProject';
import type { LatexProjectActions } from '../hooks/useLatexProject';
import { Section, TextField } from './controls';

const THUMB_SIZE = 112;
const HISTORY_LIMIT = 50;
const FILTER_THRESHOLD = 6;

const ICON_BUTTON =
  'inline-flex size-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-30';

const ACTION_BUTTON =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border/60 bg-surface px-3 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50';

interface RowProps {
  position: StudioPosition;
  index: number;
  total: number;
  selected: boolean;
  actions: LatexProjectActions;
  onOpen: () => void;
}

const PositionRow = memo(function PositionRow({
  position,
  index,
  total,
  selected,
  actions,
  onOpen
}: RowProps) {
  const thumb = useMemo(
    () =>
      previewDataUri(position, {
        size: THUMB_SIZE,
        showCoords: false,
        showAnnotations: false
      }),
    [position]
  );
  const problem = thumb === null ? fenProblem(position.fen) : null;
  const title =
    [position.stipulation, position.caption].filter(Boolean).join(' · ') ||
    'Untitled';
  const subtitle = position.author || position.source;

  return (
    <li
      className={`flex items-center gap-3 rounded-lg border p-2 transition-colors ${
        selected
          ? 'border-accent bg-accent/5'
          : 'border-border bg-surface hover:bg-surface-elevated'
      }`}
    >
      <button
        type="button"
        onClick={() => {
          actions.select(position.id);
          onOpen();
        }}
        aria-current={selected ? 'true' : undefined}
        aria-label={`Edit position ${index + 1}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-bg">
          {thumb ? (
            <img
              src={thumb}
              alt=""
              width={48}
              height={48}
              loading="lazy"
              decoding="async"
              className="size-full object-contain"
            />
          ) : (
            <span className="text-xs font-bold text-error" aria-hidden="true">
              !
            </span>
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-bold text-text-primary">
            {index + 1}. {title}
          </span>
          <span
            className={`block truncate text-[11px] ${
              problem ? 'text-error' : 'text-text-muted'
            }`}
          >
            {problem ?? (subtitle || position.fen)}
          </span>
        </span>
      </button>

      <div className="flex shrink-0 items-center">
        <button
          type="button"
          className={ICON_BUTTON}
          disabled={index === 0}
          aria-label={`Move position ${index + 1} up`}
          onClick={() => actions.move(position.id, -1)}
        >
          <ChevronDown className="size-4 rotate-180" aria-hidden="true" />
        </button>
        <button
          type="button"
          className={ICON_BUTTON}
          disabled={index === total - 1}
          aria-label={`Move position ${index + 1} down`}
          onClick={() => actions.move(position.id, 1)}
        >
          <ChevronDown className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          className={ICON_BUTTON}
          disabled={total >= LATEX_MAX_POSITIONS}
          aria-label={`Duplicate position ${index + 1}`}
          onClick={() => actions.duplicate(position.id)}
        >
          <Copy className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`${ICON_BUTTON} hover:text-error`}
          aria-label={`Delete position ${index + 1}`}
          onClick={() => actions.remove(position.id)}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>
    </li>
  );
});

interface PositionsPanelProps {
  project: LatexProject;
  isFull: boolean;
  actions: LatexProjectActions;
  onOpen: () => void;
  onNotify: (message: string, type?: 'success' | 'error') => void;
}

export const PositionsPanel = memo(function PositionsPanel({
  project,
  isFull,
  actions,
  onOpen,
  onNotify
}: PositionsPanelProps) {
  const [bulk, setBulk] = useState('');
  const [query, setQuery] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const { rawHistory } = useFENHistory('');

  const historyFens = useMemo(
    () =>
      rawHistory
        .slice(0, HISTORY_LIMIT)
        .map((entry) => entry.fen)
        .filter((fen, index, all) => all.indexOf(fen) === index),
    [rawHistory]
  );

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const indexed = project.positions.map((position, index) => ({
      position,
      index
    }));
    if (!needle) return indexed;
    return indexed.filter(({ position }) =>
      [
        position.fen,
        position.caption,
        position.author,
        position.source,
        position.stipulation
      ].some((field) => field.toLowerCase().includes(needle))
    );
  }, [project.positions, query]);

  const addPosition = useCallback(() => {
    if (isFull) return;
    actions.addFen(STARTING_FEN);
    onOpen();
  }, [actions, isFull, onOpen]);

  const addBulk = () => {
    const added = actions.addFromText(bulk);
    if (added) {
      onNotify(`Added ${added} position${added === 1 ? '' : 's'}`, 'success');
      setBulk('');
    } else {
      onNotify('No valid FEN found. Put one FEN per line.', 'error');
    }
  };

  const addHistory = () => {
    const added = actions.addFens(historyFens);
    onNotify(
      added
        ? `Imported ${added} position${added === 1 ? '' : 's'} from history`
        : 'History is empty',
      added ? 'success' : 'error'
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <Section
        title={`Positions (${project.positions.length}/${LATEX_MAX_POSITIONS})`}
        description="Every position becomes one diagram. Click one to edit it; the order sets the numbering."
      >
        {project.positions.length >= FILTER_THRESHOLD && (
          <TextField
            label="Filter"
            value={query}
            onChange={setQuery}
            placeholder="Author, stipulation, FEN…"
            maxLength={100}
          />
        )}
        {shown.length === 0 ? (
          <p role="status" className="py-3 text-center text-xs text-text-muted">
            No position matches “{query}”.
          </p>
        ) : (
          <ul className="flex flex-col gap-2" aria-label="Positions">
            {shown.map(({ position, index }) => (
              <PositionRow
                key={position.id}
                position={position}
                index={index}
                total={project.positions.length}
                selected={position.id === project.selectedId}
                actions={actions}
                onOpen={onOpen}
              />
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={ACTION_BUTTON}
            disabled={isFull}
            onClick={addPosition}
          >
            <Plus className="size-4" aria-hidden="true" />
            Add position
          </button>
          <button
            type="button"
            className={ACTION_BUTTON}
            disabled={isFull || !historyFens.length}
            onClick={addHistory}
          >
            <ListPlus className="size-4" aria-hidden="true" />
            Import from history
          </button>
        </div>
      </Section>

      <Section
        title="Paste many at once"
        description="One position per line: FEN | author | source | stipulation. Only the FEN is required."
      >
        <TextField
          label="Positions"
          value={bulk}
          onChange={setBulk}
          multiline
          rows={5}
          mono
          maxLength={100000}
          placeholder={
            '8/8/8/3k4/8/4K3/3Q4/8 w - - 0 1 | Loyd, Sam | Chess Monthly 1903 | #2'
          }
        />
        <button
          type="button"
          className={ACTION_BUTTON}
          disabled={isFull || !bulk.trim()}
          onClick={addBulk}
        >
          <ListPlus className="size-4" aria-hidden="true" />
          Add to project
        </button>
      </Section>

      <button
        type="button"
        className={`${ACTION_BUTTON} text-error hover:text-error`}
        onClick={() => {
          if (!confirmReset) {
            setConfirmReset(true);
            return;
          }
          setConfirmReset(false);
          actions.reset();
          onNotify('Started a new project. Undo brings it back.', 'success');
        }}
        onBlur={() => setConfirmReset(false)}
      >
        <Trash2 className="size-4" aria-hidden="true" />
        {confirmReset
          ? 'Click again to erase everything'
          : 'Start a new project'}
      </button>
    </div>
  );
});
