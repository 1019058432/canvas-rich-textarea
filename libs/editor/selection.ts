/**
 * 文本选择对象
 */
class SelectionImpl {
  private start: number;
  private end: number;
  private selectedText: string;

  constructor() {
    this.start = 0;
    this.end = 0;
    this.selectedText = "";
  }

  setSelection(start: number, end: number): void {
    this.start = start;
    this.end = end;
    this.updateSelectedText();
  }

  getStart(): number {
    return this.start;
  }

  getEnd(): number {
    return this.end;
  }

  getSelectedText(): string {
    return this.selectedText;
  }
  getSelectedNodes(start: number, end: number) {
    const editor = {} as any;
    const rows: RowType[] = editor.rows;
    for (let i = 0, rl = rows.length; i < rl; i++) {
      const { nodes } = rows[i];
      // todo 获取相关node
    }
  }
  private updateSelectedText(): void {
    this.getSelectedNodes(this.start, this.end);
    this.selectedText = "";
  }
}
