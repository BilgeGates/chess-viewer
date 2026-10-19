import type { LatexPackage } from '@utils';
import type { StudioSettings } from './latexProject';

const CTAN_PACKAGE: Record<LatexPackage, string> = {
  skak: 'skak',
  chessboard: 'chessboard',
  diagram: 'chess-problem-diagrams'
};

export interface LatexRequirements {
  packages: string[];
  install: string;
  compile: (fileName: string) => string;
}

export function latexRequirements(settings: StudioSettings): LatexRequirements {
  const packages = [CTAN_PACKAGE[settings.latexPackage]];
  if (settings.mode === 'document') packages.push('geometry');
  if (settings.mode === 'standalone') packages.push('standalone');

  return {
    packages,
    install: `tlmgr install ${packages.join(' ')}`,
    compile: (fileName) => `pdflatex ${fileName}.tex`
  };
}
