import { basename } from 'node:path';
import { type Event, EventEmitter, type TreeDataProvider, type TreeItem, TreeItemCollapsibleState } from 'vscode';

import { type HighlightCollection } from '../HighlightManager';
import { HighlightTreeItem } from './HighlightTreeItem';
import { naturalCompare } from '../../utils';

export class HighlightTreeDataProvider implements TreeDataProvider<HighlightTreeItem> {
  private readonly _onDidChangeTreeData: EventEmitter<HighlightTreeItem | undefined>;

  constructor(private getHighlightCollections = (): HighlightCollection[] => []) {
    this._onDidChangeTreeData = new EventEmitter();
  }

  public get onDidChangeTreeData(): Event<HighlightTreeItem | undefined> {
    return this._onDidChangeTreeData.event;
  }

  public refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  public getTreeItem(element: HighlightTreeItem): TreeItem {
    return element;
  }

  public getChildren(element?: HighlightTreeItem): Thenable<HighlightTreeItem[]> {
    if (element) {
      return Promise.resolve(
        element.HighlightTreeItems.sort((highlightA, highlightB) => naturalCompare(highlightA.label, highlightB.label))
      );
    }
    let highlightTreeItems: HighlightTreeItem[] = [];
    const currentHighlightCollections = this.getHighlightCollections().filter((hc) => hc.highlights.length > 0);
    currentHighlightCollections.forEach(({ highlights, fileName }) => {
      const label = basename(fileName);
      highlightTreeItems.push(new HighlightTreeItem(label, fileName, highlights, TreeItemCollapsibleState.Expanded));
    });
    highlightTreeItems = highlightTreeItems.sort((highlightTreeItemA, highlightTreeItemB) =>
      highlightTreeItemB.label.localeCompare(highlightTreeItemA.label)
    );
    return Promise.resolve(
      highlightTreeItems.sort((highlightTreeItemA, highlightTreeItemB) =>
        naturalCompare(highlightTreeItemA.label, highlightTreeItemB.label)
      )
    );
  }
}
