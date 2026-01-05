import * as path from 'node:path';
import * as vscode from 'vscode';

import { type HighlighterAPI } from './api';
import { AppContexts, Commands, Configuration, LogLevel, Settings } from './enums';
import {
  HighlightManager,
  HighlightTreeDataProvider,
  type HighlightTreeItem,
  type PersistedHighlightCollection,
} from './highlight';
import { type log, Logger } from './logger';
import { parseMessage } from './utils';

export class App implements vscode.Disposable {
  private static readonly PERSIST_KEY = 'twitchCoder.persistedHighlights.v1';

  private readonly _highlightManager: HighlightManager;
  private readonly _highlightTreeDataProvider: HighlightTreeDataProvider;
  private readonly _fileDecorationEmitter: vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>;
  private readonly log: log;
  private highlightDecorationType: vscode.TextEditorDecorationType;
  private currentDocument?: vscode.TextDocument;
  private config?: vscode.WorkspaceConfiguration;
  private context?: vscode.ExtensionContext;
  private persistTimer?: NodeJS.Timeout;

  constructor(outputChannel?: vscode.OutputChannel) {
    this.log = new Logger(outputChannel).log;
    this.config = vscode.workspace.getConfiguration(Configuration.sectionIdentifier);
    this.highlightDecorationType = this.createTextEditorDecorationType();
    this._highlightManager = new HighlightManager();
    this._highlightTreeDataProvider = new HighlightTreeDataProvider(
      this._highlightManager.GetHighlightCollection.bind(this._highlightManager)
    );
    this._fileDecorationEmitter = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();
  }

  public initialize(context: vscode.ExtensionContext) {
    this.log('Initializing line highlighter...');
    this.context = context;

    context.subscriptions.push(
      this,
      this._highlightManager.onHighlightChanged(this.onHighlightChangedHandler, this),

      vscode.window.onDidChangeVisibleTextEditors(this.onDidChangeVisibleTextEditorsHandler, this),
      vscode.window.onDidChangeActiveTextEditor(this.onDidChangeActiveTextEditorHandler, this),

      vscode.workspace.onDidChangeTextDocument(this.onDidChangeTextDocumentHandler, this),
      vscode.workspace.onDidChangeConfiguration(this.onDidChangeConfigurationHandler, this),

      vscode.window.registerFileDecorationProvider(this.fileDecorationProvider),

      vscode.window.registerTreeDataProvider('twitchCoderTreeView-explorer', this._highlightTreeDataProvider),
      vscode.window.registerTreeDataProvider('twitchCoderTreeView-debug', this._highlightTreeDataProvider),
      vscode.window.registerTreeDataProvider('twitchCoderTreeView', this._highlightTreeDataProvider),

      vscode.commands.registerCommand(Commands.refreshTreeView, this.refreshTreeviewHandler, this),
      vscode.commands.registerCommand(Commands.unhighlightAllTreeView, this.unhighlightAllHandler, this),

      vscode.commands.registerCommand(Commands.highlight, this.highlightHandler, this),
      vscode.commands.registerCommand(Commands.unhighlight, this.unhighlightHandler, this),
      vscode.commands.registerCommand(Commands.unhighlightSpecific, this.unhighlightSpecificHandler, this),
      vscode.commands.registerCommand(Commands.unhighlightAll, this.unhighlightAllHandler, this),
      vscode.commands.registerCommand(Commands.gotoHighlight, this.gotoHighlightHandler, this),

      vscode.commands.registerCommand(Commands.requestHighlight, this.requestHighlightHandler, this),
      vscode.commands.registerCommand(Commands.requestUnhighlight, this.requestUnhighlightHandler, this),
      vscode.commands.registerCommand(Commands.requestUnhighlightAll, this.requestUnhighlightAllHandler, this),

      vscode.commands.registerCommand(Commands.contextMenuUnhighlight, this.contextMenuUnhighlightHandler, this)
    );

    this.restoreHighlightsFromState();
    this.log('Initialized line highlighter.');
  }

  public API: HighlighterAPI = {
    requestHighlight(
      service: string,
      userName: string,
      startLine: number,
      endLine?: number,
      comments?: string,
      fileName?: string
    ) {
      vscode.commands.executeCommand(
        Commands.requestHighlight,
        service,
        userName,
        startLine,
        endLine,
        comments,
        fileName
      );
    },
    requestUnhighlight(service: string, userName: string, lineNumber: number) {
      vscode.commands.executeCommand(Commands.requestUnhighlight, service, userName, lineNumber);
    },
    requestUnhighlightAll(service: string) {
      vscode.commands.executeCommand(Commands.requestUnhighlightAll, service);
    },
  };

  public dispose(): void {
    this.flushPersist();
  }

  private onDidChangeTextDocumentHandler(event: vscode.TextDocumentChangeEvent): void {
    if (event.document.languageId === 'Log') {
      return;
    }
    // Determine if the change occurred on a highlighted line, if it did then adjust the highlight.
    event.contentChanges.forEach((valueChanged) => {
      this._highlightManager.UpdateHighlight(event.document, valueChanged);
    });

    // Determine if we changed the fileName of the currently active open document.
    if (this.currentDocument && event.document.fileName !== this.currentDocument.fileName) {
      this._highlightManager.Rename(this.currentDocument.fileName, event.document.fileName);
      this.currentDocument = event.document;
    }
  }

  private onDidChangeConfigurationHandler(event: vscode.ConfigurationChangeEvent): void {
    if (!event.affectsConfiguration(Configuration.sectionIdentifier)) {
      return;
    }
    this.config = vscode.workspace.getConfiguration(Configuration.sectionIdentifier);
    this.highlightDecorationType = this.createTextEditorDecorationType();
    this.refresh();
    this._fileDecorationEmitter.fire(undefined); // refresh file decorations when settings change

    if (!this.persistEnabled) {
      this.clearPersistedState();
    } else {
      this.schedulePersist();
    }
  }

  private onDidChangeVisibleTextEditorsHandler(editors: readonly vscode.TextEditor[]): any {
    if (editors.length > 0) {
      editors.forEach((te) => {
        te.setDecorations(this.highlightDecorationType, this._highlightManager.GetDecorations(te.document.fileName));
      });
    }
  }

  /**
   * Sets the 'editorHasHighlights' to true or false.
   * The 'editorHasHighlights' context is used to determine if the
   * 'Remove Highlight' and 'Remove All Highlights' context menu items
   * are visible or not.
   */
  private setEditorHasHighlightsContext() {
    if (vscode.window.activeTextEditor) {
      if (this._highlightManager.GetDecorations(vscode.window.activeTextEditor.document.fileName).length > 0) {
        vscode.commands.executeCommand('setContext', AppContexts.editorHasHighlights, true);
      } else {
        vscode.commands.executeCommand('setContext', AppContexts.editorHasHighlights, false);
      }
    }
  }

  private onDidChangeActiveTextEditorHandler(editor?: vscode.TextEditor): void {
    if (editor) {
      this.currentDocument = editor.document;
    } else {
      this.currentDocument = undefined;
    }
    this.setEditorHasHighlightsContext();
  }

  private refreshTreeviewHandler(): void {
    this._highlightTreeDataProvider.refresh();
  }

  private createTextEditorDecorationType(): vscode.TextEditorDecorationType {
    const configuration = vscode.workspace.getConfiguration(Configuration.sectionIdentifier);

    if (this.highlightDecorationType) {
      this.highlightDecorationType.dispose();
    }

    return vscode.window.createTextEditorDecorationType({
      backgroundColor: configuration.get<string>(Settings.highlightColor) || 'rgba(169,112,255,0.8)',
      border: configuration.get<string>(Settings.highlightBorder) || '1px solid #d7bdff',
      color: configuration.get<string>(Settings.highlightFontColor) || '#fff',
    });
  }

  private refresh(): void {
    this.setEditorHasHighlightsContext();
    vscode.window.visibleTextEditors.forEach((te) => {
      te.setDecorations(this.highlightDecorationType, this._highlightManager.GetDecorations(te.document.fileName));
    });
    this._highlightTreeDataProvider.refresh();
  }

  private onHighlightChangedHandler(): void {
    this.refresh();
    this._fileDecorationEmitter.fire(undefined);
    this.schedulePersist();
  }

  private get persistEnabled(): boolean {
    return (this.config?.get<boolean>(Settings.persistHighlights) ?? true) === true;
  }

  private restoreHighlightsFromState(): void {
    if (!this.context || !this.persistEnabled) {
      return;
    }

    const stored = this.context.workspaceState.get<PersistedHighlightCollection[]>(App.PERSIST_KEY);
    if (stored && Array.isArray(stored) && stored.length > 0) {
      this._highlightManager.Load(stored);
      this.refresh();
      this._fileDecorationEmitter.fire(undefined);
    }
  }

  private clearPersistedState(): void {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = undefined;
    }
    if (this.context) {
      void this.context.workspaceState.update(App.PERSIST_KEY, []);
    }
  }

  private schedulePersist(): void {
    if (!this.context || !this.persistEnabled) {
      return;
    }
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
    }
    this.persistTimer = setTimeout(() => this.flushPersist(), 400);
  }

  private flushPersist(): void {
    if (!this.context || !this.persistEnabled) {
      return;
    }
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = undefined;
    }
    const payload = this._highlightManager.Serialize();
    void this.context.workspaceState.update(App.PERSIST_KEY, payload);
  }

  private get isActiveTextEditor(): boolean {
    const editor = vscode.window.activeTextEditor;
    return editor !== undefined && editor.document.languageId !== 'log' && editor.document.getText().length > 0;
  }

  private async highlightHandler(): Promise<void> {
    try {
      const options: vscode.InputBoxOptions = {
        ignoreFocusOut: true,
        prompt: 'Enter a line number, line range, and optionally the file name of one of opened tabs.',
      };
      const value = await vscode.window.showInputBox(options);
      if (value) {
        const result = parseMessage(`!line ${value}`);
        if (result) {
          this.API.requestHighlight('self', 'me', result.startLine, result.endLine, result.comments, result.fileName);
        }
      }
    } catch (err) {
      this.log(LogLevel.Error, err);
    }
  }

  private async unhighlightHandler(treeItem?: HighlightTreeItem): Promise<void> {
    if (treeItem) {
      const fileName = treeItem.fileName;
      const highlightLines = treeItem.highlights.map((h) => h.startLine);
      highlightLines.forEach((line) => {
        this._highlightManager.Remove(fileName, 'self', line, true);
      });
      this._highlightManager.Refresh();
    } else {
      try {
        const options: vscode.QuickPickOptions = {
          ignoreFocusOut: true,
        };
        const value = await vscode.window.showQuickPick(this._highlightManager.GetHighlightDetails(), options);
        if (value) {
          const fileNameAndLineNumber = value.split(': ');
          const fileName = fileNameAndLineNumber[0];
          const lineNumber = fileNameAndLineNumber[1];
          this._highlightManager.Remove(fileName, 'self', +lineNumber);
        }
      } catch (err) {
        this.log(LogLevel.Error, err);
      }
    }
  }

  private async unhighlightSpecificHandler(): Promise<void> {
    if (this._highlightManager.GetHighlightCollection().length === 0) {
      vscode.window.showInformationMessage('There are no highlights to unhighlight');
      return;
    }

    let pickerOptions: string[] = [];
    const highlights = this._highlightManager.GetHighlightDetails();
    highlights.forEach((highlight) => {
      pickerOptions = [...pickerOptions, highlight];
    });

    try {
      const pickedOption = await vscode.window.showQuickPick(pickerOptions);
      if (!pickedOption) {
        this.log('A valid highlight was not selected.');
        return;
      }
      const [pickedFile, lineNumber] = pickedOption.split(': ');
      this._highlightManager.Remove(pickedFile, 'self', +lineNumber);
    } catch (err) {
      this.log(LogLevel.Error, err);
    }
  }

  private unhighlightAllHandler(): void {
    this._highlightManager.Clear();
  }

  private async gotoHighlightHandler(lineNumber: number, fileName: string): Promise<void> {
    const document = await vscode.workspace.openTextDocument(fileName);
    if (document) {
      vscode.window.showTextDocument(document).then((editor) => {
        lineNumber = lineNumber < 3 ? 2 : lineNumber;
        editor.revealRange(document.lineAt(lineNumber - 2).range);
      });
    }
  }

  private getAllOpenTabs() {
    const tabs: vscode.Tab[] = [];

    for (const group of vscode.window.tabGroups.all) {
      tabs.push(...group.tabs);
    }

    return tabs;
  }

  private getTabInputByFileName(fileName: string): vscode.TabInputText | undefined {
    const matchedTab = this.getAllOpenTabs().find((tab) => {
      if (tab.input instanceof vscode.TabInputText) {
        return tab.input.uri.fsPath.toLowerCase().endsWith(fileName.toLowerCase());
      }
      return false;
    });

    if (matchedTab) {
      return matchedTab.input as vscode.TabInputText;
    }
    return undefined;
  }

  private async requestHighlightHandler(
    service: string,
    userName: string,
    startLine: number,
    endLine?: number,
    comments?: string,
    fileName?: string
  ): Promise<void> {
    let editor: vscode.TextEditor | undefined = undefined;
    const isActiveSwitchEnabled = this.config?.get<boolean>(Settings.switchActiveTab);

    if (fileName) {
      const tabInput = this.getTabInputByFileName(fileName);
      if (isActiveSwitchEnabled) {
        if (tabInput) {
          await vscode.window.showTextDocument(tabInput.uri, { preserveFocus: false });
          editor = vscode.window.activeTextEditor;
        }
      } else {
        if (tabInput) {
          vscode.window.showInformationMessage(
            `Twitch Coder: New highlight from ${userName} in ${tabInput.uri.fsPath.split(path.sep).at(-1)}.`
          );
          this._highlightManager.AddQueued(
            tabInput.uri.fsPath,
            `${service}:${userName}`,
            startLine,
            endLine || startLine,
            comments
          );
        }
        return;
      }
    } else {
      editor = vscode.window.activeTextEditor;
    }

    if (!editor) {
      this.log(LogLevel.Warning, `Could not highlight the line requested by ${service}:${userName}`);
      this.log(
        LogLevel.Warning,
        'The current open, and active text editor is either empty or not a valid target to highlight a line.'
      );
      return;
    }

    this._highlightManager.Add(editor.document, `${service}:${userName}`, startLine, endLine || startLine, comments);
  }

  private requestUnhighlightHandler(service: string, userName: string, lineNumber: number): void {
    const editor = vscode.window.activeTextEditor;
    if (!this.isActiveTextEditor) {
      this.log(LogLevel.Warning, `Could not unhighlight the line requested by ${service}:${userName}`);
      this.log(
        LogLevel.Warning,
        'The current open, and active text editor is either empty or not a valid target to highlight a line.'
      );
      return;
    }
    this._highlightManager.Remove(editor!.document, `${service}:${userName}`, lineNumber);
  }

  private requestUnhighlightAllHandler(service: string): void {
    this._highlightManager.Clear(service);
  }

  private contextMenuUnhighlightHandler() {
    if (vscode.window.activeTextEditor) {
      const lineNumber = vscode.window.activeTextEditor.selection.active.line;
      this._highlightManager.Remove(vscode.window.activeTextEditor.document, 'self', lineNumber + 1);
    }
  }

  private get fileDecorationProvider(): vscode.FileDecorationProvider {
    return {
      onDidChangeFileDecorations: this._fileDecorationEmitter.event,
      provideFileDecoration: (uri: vscode.Uri): vscode.FileDecoration | undefined => {
        const decorations = this._highlightManager.GetDecorations(uri.fsPath);
        if (decorations.length > 0) {
          const rawBadge = this.config?.get<string>(Settings.fileDecorationBadge);
          const badge = rawBadge ? rawBadge.trim() : '';

          return new vscode.FileDecoration(badge, 'File has highlighted lines', new vscode.ThemeColor('charts.purple'));
        }
        return undefined;
      },
    };
  }
}
