import { Editor } from "./index";
import { computeXY, pointInEnd } from "./helper";

enum NodeType {
  TEXT,
  IMG,
}

export class InputManager {
  cursorEl: HTMLDivElement;
  cursorTimer: number | undefined;
  inputEl: HTMLInputElement;
  visible: boolean = false;
  x: number = -1;
  y: number = -1;
  rowIndex: number = 0;
  colIndex: number = 0;
  compositionContext = {
    // todo
    isComposing: false,
    startRowIndex: 0, // 记录组合前的位置，用于合成完成后将合成期间的输入进行删除
    startColIndex: 0, // 记录组合前的位置，用于合成完成后将合成期间的输入进行删除
  };
  editor: Editor;
  activeEl: TextNodeType | ImgNodeType | undefined;
  constructor(editor: Editor) {
    this.editor = editor;

    let contain = document.getElementById("canvasEditor");
    if (!contain) {
      contain = document.body;
    }
    const cursorEl = this.createCursor();
    const inputEl = this.createInput();
    contain.appendChild(cursorEl);
    contain.appendChild(inputEl);
    this.inputEl = inputEl;
    this.cursorEl = cursorEl;
    this.onInput = this.onInput.bind(this);
    this.actionHandle = this.actionHandle.bind(this);
    this.compositionStarFn = this.compositionStarFn.bind(this);
    this.compositionEndFn = this.compositionEndFn.bind(this);
    this.inputEl.addEventListener("keydown", this.actionHandle);
    this.inputEl.addEventListener("input", this.onInput);
    this.inputEl.addEventListener("compositionstart", this.compositionStarFn);
    this.inputEl.addEventListener("compositionend", this.compositionEndFn);
  }
  createCursor() {
    const cursorEl = document.createElement("div");
    cursorEl.style.position = "absolute";
    cursorEl.style.visibility = "hidden";
    cursorEl.style.width = "1px";
    cursorEl.style.height = "16px";
    cursorEl.style.backgroundColor = "#000";
    cursorEl.style.pointerEvents = "none";
    return cursorEl;
  }
  createInput() {
    const inputEl = document.createElement("input");
    inputEl.style.position = "absolute";
    inputEl.style.zIndex = "-1";
    inputEl.style.opacity = "0.1";
    inputEl.style.color = "transparent";
    inputEl.style.border = "none";
    inputEl.style.outline = "none";
    return inputEl;
  }
  upPosition(x: number, y: number, row: number, col: number) {
    const { x: prevX, y: prevY, inputEl, cursorEl } = this;
    if (x !== prevX || y !== prevY) {
      this.x = x;
      this.y = y;
      this.rowIndex = row;
      this.colIndex = col;
      cursorEl.style.left = `${this.x}px`;
      cursorEl.style.top = `${this.y}px`;
    }
    inputEl.focus();
    clearInterval(this.cursorTimer);
    this.visible = false;
    this.trigger();
    this.cursorTimer = setInterval(() => {
      this.trigger();
    }, 1000);
  }
  trigger() {
    const { cursorEl } = this;
    if (!this.visible) {
      this.visible = true;
      cursorEl.style.visibility = "visible";
    } else {
      this.visible = false;
      cursorEl.style.visibility = "hidden";
    }
  }
  focus() {
    this.trigger();
    this.upPosition(0, 0, 0, 0);
  }
  blur() {
    this.trigger();
  }
  actionHandle(event: any) {
    switch (event.key) {
      case "Backspace":
        this.editor.deleteNode({ row: this.rowIndex, col: this.colIndex });
        return false;
      case "Enter":
        // todo
        return false;
      case "ArrowLeft":
        // debugger;
        let resL = computeXY(
          this.editor.rows,
          this.rowIndex,
          this.colIndex - 1,
          this.editor.scrollY,
          this.editor.ctx
        );
        if (resL) {
          const { x, y, row, col } = resL;
          this.upPosition(x, y, row, col);
        }
        return false;
      case "ArrowUp":
        let resU = computeXY(
          this.editor.rows,
          this.rowIndex - 1,
          this.colIndex,
          this.editor.scrollY,
          this.editor.ctx
        );
        if (resU) {
          const { x, y, row, col } = resU;
          this.upPosition(x, y, row, col);
        }
        return false;
      case "ArrowRight":
        let resR = computeXY(
          this.editor.rows,
          this.rowIndex,
          this.colIndex + 1,
          this.editor.scrollY,
          this.editor.ctx
        );
        if (resR) {
          const { x, y, row, col } = resR;
          this.upPosition(x, y, row, col);
        }
        return false;
      case "ArrowDown":
        let resD = computeXY(
          this.editor.rows,
          this.rowIndex + 1,
          this.colIndex,
          this.editor.scrollY,
          this.editor.ctx
        );
        if (resD) {
          const { x, y, row, col } = resD;
          this.upPosition(x, y, row, col);
        }
        return false;
      default:
        break;
    }
    return true;
  }
  /**
   * 将输入应用到editor中
   * todo 合成完成后，删除合成输入完成前的渲染内容
   * @param event 事件
   * @returns null
   */
  onInput(event: any) {
    if (!this.actionHandle(event)) {
      return;
    }
    const isComposing = this.compositionContext.isComposing;
    if (isComposing) {
      return false;
    }
    // 插入文本
    const inputTextWord = event.data || "";
    const { rowInEnd, colInEnd } = pointInEnd(
      this.editor.rows,
      this.rowIndex,
      this.colIndex
    );
    const textNode = {
      type: NodeType.TEXT,
      value: inputTextWord,
      width: 0,
      height: 0,
    };
    if (rowInEnd && colInEnd) {
      this.editor.appendNode(textNode);
    } else {
      this.editor.insertNode(textNode, this.rowIndex, this.colIndex);
    }
    this.inputEl.value = "";
    return false;
  }
  // 键位监听句柄
  compositionStarFn(event: any) {
    this.compositionContext.isComposing = true;
    this.compositionContext.startRowIndex = this.rowIndex;
    this.compositionContext.startColIndex = this.colIndex;
  }
  compositionEndFn(event: any) {
    this.compositionContext.isComposing = false;
    this.onInput(event); // input执行比组合结束执行先
  }
}
