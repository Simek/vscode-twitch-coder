import {
  type DecorationOptions,
  type Event,
  EventEmitter,
  Position,
  Range,
  type TextDocument,
  type TextDocumentContentChangeEvent,
} from 'vscode';

import { Highlight } from './Highlight';

export type HighlightCollection = {
  fileName: string;
  highlights: Highlight[];
};

export type PersistedHighlight = {
  userName: string;
  startLine: number;
  endLine: number;
  comments?: string;
};

export type PersistedHighlightCollection = {
  fileName: string;
  highlights: PersistedHighlight[];
};

export type HighlightChangedEvent = {};

export class HighlightManager {
  private readonly _onHighlightsChanged: EventEmitter<HighlightChangedEvent> = new EventEmitter();
  private highlightCollection: HighlightCollection[] = [];

  public get onHighlightChanged(): Event<HighlightChangedEvent> {
    return this._onHighlightsChanged.event;
  }

  public GetHighlightCollection(): HighlightCollection[] {
    return this.highlightCollection;
  }

  public Serialize(): PersistedHighlightCollection[] {
    return this.highlightCollection.map((hc) => {
      return {
        fileName: hc.fileName,
        highlights: hc.highlights.map((h) => ({
          userName: h.userName,
          startLine: h.startLine,
          endLine: h.endLine,
          comments: h.comments,
        })),
      };
    });
  }

  public Load(serialized?: PersistedHighlightCollection[] | null): void {
    if (!serialized || !Array.isArray(serialized)) {
      this.highlightCollection = [];
      return;
    }

    this.highlightCollection = serialized
      .filter((hc) => typeof hc?.fileName === 'string' && Array.isArray(hc.highlights))
      .map((hc) => {
        const fileName = hc.fileName;
        const highlights = hc.highlights
          .filter(
            (h) => typeof h?.userName === 'string' && Number.isFinite(h?.startLine) && Number.isFinite(h?.endLine)
          )
          .map((h) => {
            const startLine = Math.max(1, Math.trunc(h.startLine));
            const endLine = Math.max(1, Math.trunc(h.endLine));
            const vStartLine = endLine < startLine ? endLine : startLine;
            const vEndLine = endLine < startLine ? startLine : endLine;

            const range = new Range(new Position(vStartLine - 1, 0), new Position(vEndLine - 1, 9999));
            return new Highlight(h.userName, range, h.comments);
          });

        return { fileName, highlights };
      });
  }

  public GetHighlightDetails(): string[] {
    if (this.highlightCollection.length > 0) {
      return this.highlightCollection
        .map((hc) => hc.highlights.map((h) => `${hc.fileName}: ${h.startLine}`))
        .reduce((s) => s)
        .sort((hA, hB) => hB.localeCompare(hA));
    }
    return [];
  }

  public GetDecorations(fileName: string): DecorationOptions[] {
    const idx = this.highlightCollection.findIndex(
      (hc) => hc.fileName === fileName || fileName.toLowerCase().endsWith(hc.fileName.toLowerCase())
    );
    if (idx !== -1) {
      return this.highlightCollection[idx].highlights.map<DecorationOptions>((h) => {
        return {
          hoverMessage: `From ${h.userName.startsWith('self:') ? 'me' : (h.userName.split(':').at(-1) ?? 'Twitch user')}${h.comments ? `: ${h.comments}` : ''}`,
          range: h.range,
        };
      });
    }
    return [];
  }

  public Add(document: TextDocument, userName: string, startLine: number, endLine?: number, comments?: string): void {
    endLine ??= startLine;

    const range = new Range(
      new Position(--startLine, 0),
      new Position(--endLine, document.lineAt(endLine).text.length)
    );

    const highlight = new Highlight(userName, range, comments);

    const idx = this.highlightCollection.findIndex((h) =>
      document.fileName.toLowerCase().endsWith(h.fileName.toLowerCase())
    );
    if (idx !== -1) {
      if (!this.HighlightExists(idx, userName, startLine, endLine)) {
        this.highlightCollection[idx].highlights.push(highlight);
      }
    } else {
      this.highlightCollection.push({
        fileName: document.fileName,
        highlights: [highlight],
      });
    }

    this._onHighlightsChanged.fire({});
  }

  public AddQueued(fileName: string, userName: string, startLine: number, endLine?: number, comments?: string): void {
    endLine ??= startLine;

    const range = new Range(new Position(--startLine, 0), new Position(--endLine, 9999));

    const highlight = new Highlight(userName, range, comments);

    const idx = this.highlightCollection.findIndex((h) => h.fileName.toLowerCase().endsWith(fileName.toLowerCase()));
    if (idx !== -1) {
      if (!this.HighlightExists(idx, userName, startLine, endLine)) {
        this.highlightCollection[idx].highlights.push(highlight);
      }
    } else {
      this.highlightCollection.push({
        fileName,
        highlights: [highlight],
      });
    }

    this._onHighlightsChanged.fire({});
  }

  public Remove(document: TextDocument, userName: string, lineNumber: number, deferRefresh?: boolean): void;
  public Remove(fileName: string, userName: string, lineNumber: number, deferRefresh?: boolean): void;
  public Remove(
    documentOrFileName: TextDocument | string,
    userName: string,
    lineNumber: number,
    deferRefresh: boolean = false
  ): void {
    if (!(typeof documentOrFileName === 'string')) {
      documentOrFileName = documentOrFileName.fileName;
    }

    const idx = this.highlightCollection.findIndex((h) => h.fileName === documentOrFileName);
    if (idx !== -1) {
      const hidx = this.highlightCollection[idx].highlights.findIndex(
        (h) => (h.userName === userName || userName === 'self') && h.startLine <= lineNumber && h.endLine >= lineNumber
      );
      if (hidx !== -1) {
        this.highlightCollection[idx].highlights.splice(hidx, 1);
      }
      if (!deferRefresh) {
        this._onHighlightsChanged.fire({});
      }
    }
  }

  public Refresh() {
    this._onHighlightsChanged.fire({});
  }

  public Clear(service?: string): void {
    if (service) {
      this.highlightCollection.forEach((hc) => {
        const highlightsToRemove = hc.highlights.filter((h) => h.userName.includes(`${service}:`));
        highlightsToRemove.forEach((h) => {
          this.Remove(hc.fileName, h.userName, h.startLine, true);
        });
      });
    } else {
      this.highlightCollection = [];
    }
    this._onHighlightsChanged.fire({});
  }

  public Rename(oldName: string, newName: string) {
    const idx = this.highlightCollection.findIndex((hc) => hc.fileName === oldName);
    if (idx !== -1) {
      this.highlightCollection[idx].fileName = newName;
    }
  }

  public UpdateHighlight(document: TextDocument, valueChanged: TextDocumentContentChangeEvent) {
    const idx = this.highlightCollection.findIndex((hc) => hc.fileName === document.fileName);
    let updated = false;
    if (idx !== -1) {
      // A carriage return was removed.
      if (valueChanged.text.length === 0 && valueChanged.range.end.line === valueChanged.range.start.line + 1) {
        let highlights = this.highlightCollection[idx].highlights.filter(
          (h) => h.range.start.line > valueChanged.range.end.line
        );
        highlights.forEach((highlight) => {
          highlight.Update(
            new Range(
              new Position(highlight.range.start.line - 1, highlight.range.start.character),
              new Position(highlight.range.end.line, highlight.range.end.character)
            )
          );
          updated = true;
        });
        highlights = this.highlightCollection[idx].highlights.filter(
          (h) => h.range.end.line >= valueChanged.range.end.line
        );
        highlights.forEach((highlight) => {
          highlight.Update(
            new Range(
              new Position(highlight.range.start.line, highlight.range.start.character),
              new Position(highlight.range.end.line - 1, highlight.range.end.character)
            )
          );
          updated = true;
        });
      } else if (valueChanged.text.match('\n')) {
        let highlights = this.highlightCollection[idx].highlights.filter(
          (h) => h.range.end.line >= valueChanged.range.start.line
        );
        highlights.forEach((highlight) => {
          highlight.Update(
            new Range(
              new Position(highlight.range.start.line, highlight.range.start.character),
              new Position(highlight.range.end.line + 1, highlight.range.end.character)
            )
          );
          updated = true;
        });
        highlights = this.highlightCollection[idx].highlights.filter(
          (h) => h.range.start.line > valueChanged.range.start.line
        );
        highlights.forEach((highlight) => {
          highlight.Update(
            new Range(
              new Position(highlight.range.start.line + 1, highlight.range.start.character),
              new Position(highlight.range.end.line, highlight.range.end.character)
            )
          );
          updated = true;
        });
      } else {
        const highlights = this.highlightCollection[idx].highlights.filter((h) => h.range.contains(valueChanged.range));
        highlights.forEach((h) => {
          if (valueChanged.text.length === 0) {
            // A character was deleted.
            h.Update(
              new Range(
                new Position(h.range.start.line, h.range.start.character),
                new Position(h.range.end.line, h.range.end.character - 1)
              )
            );
            updated = true;
          } else {
            h.Update(
              new Range(
                new Position(h.range.start.line, h.range.start.character),
                new Position(h.range.end.line, h.range.end.character + valueChanged.text.length)
              )
            );
            updated = true;
          }
        });
      }
    }
    if (updated) {
      this._onHighlightsChanged.fire({});
    }
  }

  public GetTotalHighlightsCount(): number {
    return this.highlightCollection.reduce((sum, hc) => sum + hc.highlights.length, 0);
  }

  private HighlightExists(idx: number, userName: string, startLine: number, endLine?: number): boolean {
    return this.highlightCollection[idx].highlights.some(
      (h) => (h.userName === userName || userName === 'self') && h.startLine <= startLine && h.endLine >= endLine!
    );
  }
}
