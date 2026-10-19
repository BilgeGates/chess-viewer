import {
  type ChangeEvent,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState
} from 'react';

import { Code2, Download, Undo2, Upload } from '@/assets/icons';

import { getRouteSeo } from '@constants';
import { useCopyToClipboard, useNotifications } from '@hooks';
import { NotificationContainer, Seo } from '@ui';
import { saveBlob } from '@utils';
import { DocumentPanel } from './components/DocumentPanel';
import { OutputPanel, type OutputView } from './components/OutputPanel';
import { PositionDetails } from './components/PositionDetails';
import { PositionsPanel } from './components/PositionsPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { useLatexProject } from './hooks/useLatexProject';
import { segmentButton } from './utils/controlStyles';
import {
  PROJECT_FILE_MAX_BYTES,
  parseProjectFile,
  serializeProject
} from './utils/projectFile';

const DEFAULT_FILE_NAME = 'chess-diagrams';
const PROJECT_FILE_NAME = 'latex-studio-project';
const BYTES_PER_KB = 1024;

type StudioTab = 'positions' | 'details' | 'document' | 'code';

const TABS: ReadonlyArray<{ id: StudioTab; label: string; desktop: boolean }> =
  [
    { id: 'positions', label: 'Positions', desktop: true },
    { id: 'details', label: 'Details', desktop: true },
    { id: 'document', label: 'Document', desktop: true },
    { id: 'code', label: 'Code', desktop: false }
  ];

const TOOLBAR_BUTTON =
  'inline-flex min-h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-border/60 bg-surface px-3 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40';

interface StatProps {
  label: string;
  value: string;
}

function Stat({ label, value }: StatProps) {
  return (
    <div className="rounded-lg border border-border/70 bg-bg/40 px-3 py-2">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
        {label}
      </dt>
      <dd className="text-sm font-bold text-text-primary">{value}</dd>
    </div>
  );
}

const LatexPage = () => {
  const { project, selected, build, isFull, canUndo, actions } =
    useLatexProject();
  const { notifications, success, error, removeNotification } =
    useNotifications();
  const [copied, copy] = useCopyToClipboard();
  const [tab, setTab] = useState<StudioTab>('positions');
  const [view, setView] = useState<OutputView>('code');
  const [fileName, setFileName] = useState(DEFAULT_FILE_NAME);
  const importRef = useRef<HTMLInputElement>(null);
  const tabsId = useId();

  const openDetails = useCallback(() => setTab('details'), []);

  const notify = useCallback(
    (message: string, type: 'success' | 'error' = 'success') =>
      type === 'error' ? error(message) : success(message),
    [error, success]
  );

  const handleCopy = useCallback(() => {
    if (!build.code) return;
    copy(build.code);
    success('LaTeX copied to clipboard');
  }, [build.code, copy, success]);

  const handleDownload = useCallback(() => {
    if (!build.code) return;
    saveBlob(
      new Blob([build.code], { type: 'application/x-tex;charset=utf-8' }),
      fileName.trim() || DEFAULT_FILE_NAME,
      'tex'
    );
    success('LaTeX file downloaded');
  }, [build.code, fileName, success]);

  const handleExportProject = useCallback(() => {
    saveBlob(
      new Blob([serializeProject(project)], { type: 'application/json' }),
      PROJECT_FILE_NAME,
      'json'
    );
    success('Project saved to a file');
  }, [project, success]);

  const handleImportProject = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const input = event.target;
      const file = input.files?.[0];
      input.value = '';
      if (!file) return;
      if (file.size > PROJECT_FILE_MAX_BYTES) {
        error('That file is too large to be a LaTeX Studio project.');
        return;
      }
      let imported = null;
      try {
        imported = parseProjectFile(await file.text());
      } catch {
        imported = null;
      }
      if (!imported) {
        error('That file is not a LaTeX Studio project.');
        return;
      }
      actions.replaceProject(imported);
      setTab('positions');
      success(
        `Loaded ${imported.positions.length} position${
          imported.positions.length === 1 ? '' : 's'
        }`
      );
    },
    [actions, error, success]
  );

  const index = project.positions.findIndex((p) => p.id === selected.id);
  const previousId = project.positions[index - 1]?.id ?? null;
  const nextId = project.positions[index + 1]?.id ?? null;
  const showingCode = tab === 'code';
  const leftTab = showingCode ? 'positions' : tab;

  const stats = useMemo(
    () => ({
      positions: build.code
        ? project.positions.length - build.skipped.length
        : 0,
      lines: build.code ? build.code.split('\n').length : 0,
      kb: build.code
        ? Math.max(1, Math.round(new Blob([build.code]).size / BYTES_PER_KB))
        : 0
    }),
    [build, project.positions.length]
  );

  return (
    <div className="flex-1 bg-bg">
      <Seo {...getRouteSeo('/latex')} />
      <div className="page-container flex flex-col gap-5 py-6 sm:py-8">
        <header className="overflow-hidden rounded-2xl border border-border bg-linear-to-br from-accent/10 via-surface to-surface p-4 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent ring-1 ring-accent/30">
                <Code2 className="size-6" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
                  LaTeX Studio
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-text-secondary">
                  Turn FEN positions into publication-ready LaTeX for books,
                  articles and problem collections. Everything stays in your
                  browser.
                </p>
              </div>
            </div>

            <dl className="grid grid-cols-3 gap-2 sm:max-w-md lg:w-80 lg:shrink-0">
              <Stat label="Diagrams" value={String(stats.positions)} />
              <Stat label="Lines" value={String(stats.lines)} />
              <Stat label="Size" value={`${stats.kb} KB`} />
            </dl>
          </div>

          <div className="mt-5 flex gap-2 overflow-x-auto border-t border-border/60 pt-4">
            <button
              type="button"
              className={TOOLBAR_BUTTON}
              disabled={!canUndo}
              onClick={actions.undo}
            >
              <Undo2 className="size-4" aria-hidden="true" />
              Undo
            </button>
            <button
              type="button"
              className={TOOLBAR_BUTTON}
              onClick={handleExportProject}
            >
              <Download className="size-4" aria-hidden="true" />
              Save project
            </button>
            <button
              type="button"
              className={TOOLBAR_BUTTON}
              onClick={() => importRef.current?.click()}
            >
              <Upload className="size-4" aria-hidden="true" />
              Open project
            </button>
            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              aria-label="Open a LaTeX Studio project file"
              onChange={(event) => void handleImportProject(event)}
            />
          </div>
        </header>

        <div
          role="tablist"
          aria-label="Studio sections"
          className="flex divide-x divide-border/60 overflow-hidden rounded-lg border border-border/60 lg:max-w-[28rem]"
        >
          {TABS.map(({ id, label, desktop }) => (
            <button
              key={id}
              id={`${tabsId}-${id}`}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`${segmentButton(tab === id)} min-h-11 ${desktop ? '' : 'lg:hidden'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
          <div
            role="tabpanel"
            aria-labelledby={`${tabsId}-${leftTab}`}
            className={`min-w-0 flex-col gap-4 ${showingCode ? 'hidden lg:flex' : 'flex'}`}
          >
            {leftTab === 'positions' && (
              <PositionsPanel
                project={project}
                isFull={isFull}
                actions={actions}
                onOpen={openDetails}
                onNotify={notify}
              />
            )}
            {leftTab === 'details' && (
              <PositionDetails
                position={selected}
                index={index}
                total={project.positions.length}
                previousId={previousId}
                nextId={nextId}
                settings={project.settings}
                actions={actions}
                onNotify={notify}
              />
            )}
            {leftTab === 'document' && (
              <DocumentPanel
                settings={project.settings}
                onChange={actions.updateSettings}
              />
            )}
          </div>

          <div
            className={`min-w-0 lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto ${
              showingCode ? 'block' : 'hidden lg:block'
            }`}
          >
            <OutputPanel
              build={build}
              settings={project.settings}
              view={view}
              onViewChange={setView}
              fileName={fileName}
              onFileNameChange={setFileName}
              copied={copied}
              onCopy={handleCopy}
              onDownload={handleDownload}
              preview={
                <PreviewPanel
                  positions={project.positions}
                  settings={project.settings}
                />
              }
            />
          </div>
        </div>
      </div>
      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
      />
    </div>
  );
};

export default LatexPage;
