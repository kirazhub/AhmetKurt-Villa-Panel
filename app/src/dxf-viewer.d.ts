// dxf-viewer paketi kendi TypeScript tiplerini sağlamıyor; minimal bildirim.
declare module 'dxf-viewer' {
  // Sadece kullandığımız API. Detay için: https://github.com/vagran/dxf-viewer
  export class DxfViewer {
    constructor(domContainer: HTMLElement, options?: Record<string, unknown>);
    Load(params: {
      url: string;
      fonts?: unknown[] | null;
      progressCbk?: ((phase: string, recv: number, total: number) => void) | null;
      workerFactory?: (() => Worker) | null;
    }): Promise<void>;
    FitView?(): void;
    Destroy?(): void;
    SetSize?(w: number, h: number): void;
  }
}
