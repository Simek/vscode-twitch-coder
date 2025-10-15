import { Command, TreeItem, TreeItemCollapsibleState } from 'vscode';

import { Highlight } from '../Highlight';
import { Commands } from '../../enums';

export class HighlightTreeItem extends TreeItem {
  constructor(
    public override readonly label: string,
    public readonly fileName: string,
    public readonly highlights: Highlight[] = [],
    public override readonly collapsibleState: TreeItemCollapsibleState,
    public override readonly command?: Command
  ) {
    super(label, collapsibleState);
  }

  // @ts-expect-error Override TreeItem description
  public override get description(): string {
    const highlightsCount = this.highlights.length;

    if (this.collapsibleState !== TreeItemCollapsibleState.None) {
      return `Highlights: ${highlightsCount}`;
    }

    if (!highlightsCount) {
      return '';
    }

    if (highlightsCount === 1) {
      const highlight = this.highlights[0];
      const highlightAuthor = highlight.userName.split(':').at(1) ?? 'unknown';

      if (highlight.comments) {
        return `${highlightAuthor} - ${highlight.comments}`;
      }

      return highlightAuthor;
    } else {
      return this.highlights.map((highlight) => highlight.userName.split(':').at(1) ?? 'unknown').join(', ');
    }
  }

  public get HighlightTreeItems(): HighlightTreeItem[] {
    const children: HighlightTreeItem[] = [];

    this.highlights.forEach((highlight) => {
      const label = `Line: ${highlight.endLine > highlight.startLine ? `${highlight.startLine} - ${highlight.endLine}` : `${highlight.startLine}`}`;
      const existingItem = children.find((item) => item.label === label);
      if (existingItem) {
        existingItem.highlights.push(highlight);
      } else {
        const command: Command = {
          command: Commands.gotoHighlight,
          title: '',
          arguments: [highlight.startLine, this.fileName],
        };
        children.push(new HighlightTreeItem(label, this.fileName, [highlight], TreeItemCollapsibleState.None, command));
      }
    });

    return children;
  }

  override contextValue = 'highlightTreeItem';
}
