import { InputManager } from "./inputManager";
import { EventCenter } from "./eventCenter";
import {
  computeImage,
  computeLine,
  getDistanceToElementEdges,
  nodeComposition,
  computeRowCol,
  deepClone,
} from "./helper";

/**
 * canvas文本编辑器
 */
export class Editor {
  el: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  currentFont: string | undefined = "serif";
  currentFontSize: number = 16;
  fonts: string[] = [];
  boxWidth: number = 0;
  boxHeight: number = 0;
  viewHeight: number = 0;
  viewWidth: number = 0;
  scrollY: number = 0;
  totalY: number = 0;
  nodes: any[] = [];
  rows: RowType[] = [];

  inputManager: InputManager;
  eventCenter: EventCenter;
  constructor(el: HTMLCanvasElement, nodes: any[] = []) {
    this.el = el;
    this.nodes = nodes;
    const ctx = el.getContext("2d");
    if (!ctx) {
      throw new Error("获取canvas上下文失败");
    }
    this.ctx = ctx;

    const { width, height } = this.el.style;
    const scale = window.devicePixelRatio || 1;
    // 画布宽高
    this.boxWidth = Number(width.replace("px", ""));
    this.boxHeight = Number(height.replace("px", ""));
    // 重新设置 canvas 自身宽高。
    this.el.width = Math.round(this.boxWidth * scale);
    this.el.height = Math.round(this.boxHeight * scale);
    // 缩放绘图上下文以匹配CSS像素
    ctx.scale(scale, scale);
    this.scrollCanvas = this.scrollCanvas.bind(this);
    this.clickHandle = this.clickHandle.bind(this);
    this.inputManager = new InputManager(this);
    this.eventCenter = new EventCenter();
    this.init();

    this.inputManager.focus();
  }
  init() {
    this.beforRender();
    this.render();
    this.eventCenter.bindCanvasEl(this.el);
    this.eventCenter.onEvent("scroll", this.scrollCanvas);
    this.eventCenter.onEvent("click", this.clickHandle);
  }
  loadFont(font: string, url: string) {
    // 创建一个新的@font-face规则
    const fontFace = new FontFace(font, `url(${url})`);
    // 加载字体
    fontFace.load().then((loadedFont) => {
      // 将字体应用到Canvas上
      document.fonts.add(loadedFont);

      this.fonts.push(font);
    });
  }
  applyFont(name: string) {
    this.currentFont = name;
  }
  applyFontSize(size: number) {
    this.currentFontSize = size;
  }
  clickHandle(event: any) {
    const rect = getDistanceToElementEdges(this.el, event);
    const res = computeRowCol(
      this.rows,
      rect.left,
      rect.top,
      this.scrollY,
      this.ctx
    );
    if (res) {
      const { x, y, row, col } = res;
      this.inputManager.upPosition(x, y, row, col);
    }
  }
  longTouchHandle(event: any) {
    // 长按选中
    // 1、替换（含批量删除）sliceNodes
    // 2、复制
  }
  scrollCanvas(x: number, y: number, over?: boolean) {
    if (over) {
      // 抬起鼠标、松开按压、超出范围时over为true
      return;
    }
    let t = this.scrollY + y;
    let cursorChangeY = y;
    if (t > this.totalY - this.boxHeight) {
      t = this.totalY - this.boxHeight;
      cursorChangeY = 0;
    }
    if (t < 0) {
      t = 0;
      cursorChangeY = 0;
    }
    if (this.scrollY === t) {
      // 没有变化时不做处理
      return;
    }
    this.scrollY = t;
    this.inputManager.upPosition(
      this.inputManager.x,
      this.inputManager.y - cursorChangeY,
      this.inputManager.colIndex,
      this.inputManager.rowIndex
    );
    this.render();
  }
  /**
   * 追加内容直接接着上次排版结果进行排版，再渲染
   * todo 光标位置异常
   * @param node
   */
  appendNode(node: TextNodeType | ImgNodeType) {
    const {
      rows,
      boxWidth,
      ctx,
      currentFontSize,
      currentFont,
      totalY,
      boxHeight,
    } = this;

    const defaultRowHeight = 11; // 默认(空行)行高
    const fonstStyle = `${currentFontSize} ${currentFont}`;
    const { type } = node as TextNodeType;
    if (!node.width) {
      if (type === NodeType.TEXT) {
        const nodeTextMetrics = ctx.measureText(node.value as string);
        node.width = nodeTextMetrics.width;
      }
    }
    const beforRowNum = rows.length;
    // 排版
    if (type === NodeType.TEXT) {
      computeLine(rows, node as TextNodeType, boxWidth, ctx, fonstStyle);
    } else {
      computeImage(rows, node as ImgNodeType, boxWidth);
    }
    const afterRowNum = rows.length;
    // 重新计算总高度
    let changeHeight = 0;
    let newTotalY = totalY;
    if (this.totalY === 0 || afterRowNum !== beforRowNum) {
      for (let i = beforRowNum; i < afterRowNum; i++) {
        const { height, nodes } = rows[i];
        newTotalY += height;
        if (i < afterRowNum - 1) {
          continue;
        }
      }
      changeHeight = newTotalY - (this.totalY || defaultRowHeight); // 当totalY为0(即光标处于坐标【0,0】)时，应以默认高度进行计算
      this.totalY = newTotalY;
    }

    let newCursorY = this.inputManager.y + changeHeight;
    let newRowIndex = afterRowNum - 1;

    const lastRow = rows[newRowIndex] || { nodes: [] };
    const lastRowNodes = lastRow.nodes;
    let newCursorX = 0;
    let newColIndex = 0;
    for (let ci = 0; ci < lastRowNodes.length; ci++) {
      const { value, type, width } = lastRowNodes[ci];
      newCursorX += width;
      // 计算列
      if (type === NodeType.IMG) {
        newColIndex += 1;
      } else {
        newColIndex += (value as string).length;
      }
    }
    // 计算滚动距离并修正光标值(配合光标移动确认是否产生换行以及是否新行首)
    if (beforRowNum !== afterRowNum) {
      let newScrollY = this.totalY - boxHeight;
      if (newScrollY < 0) {
        newScrollY = 0; // 重置为安全值，即无滚动
      }
      this.scrollY = newScrollY;
    }
    if (newRowIndex < 1 && newColIndex <= 0) {
      newCursorX = 0;
      newCursorY = 0;
    }
    if (newColIndex < 0) {
      newCursorY = 0;
    }

    this.inputManager.upPosition(
      newCursorX,
      newCursorY,
      newRowIndex,
      newColIndex
    );

    // 渲染
    this.render();
  }
  deleteNode(pos: { row: number; col: number }) {
    const col = pos.col - 1;
    let startPos;
    // 仅删除单个字符或图像时仅col减一，需考虑换行情况
    if (col < 0) {
      const realRow = pos.row - 1;
      const prevRow = this.rows[realRow];
      startPos = { row: realRow, col: prevRow?.col - 1 || 0 };
    } else {
      startPos = { row: pos.row, col: col };
    }
    this.sliceNode(startPos, pos, []);
  }
  /**
   * @todo 修正由于点击图片附件时移除图片后的光标异常(点击时产生的参照物不稳定【图片本身或文本】标记为【tag=cursor_click】，从而返回了不一样的Y值，考虑在点击事件处理时统一或在此处修复)。
   * @todo 修正changeRowHeight 多算的部分！！！ 应当重新梳理光标计算逻辑
   * @description 从排版好的行列中取出不受影响的行列，并对受影响行及后面的行重新进行排版
   * @param start 删除起点行列号
   * @param end 删除终点行列号
   * @param nodeList 要插入的节点列表
   */
  sliceNode(
    start: { row: number; col: number },
    end: { row: number; col: number },
    nodeList: (TextNodeType | ImgNodeType)[] = []
  ) {
    // 插入内容对插入后位置的行重新进行排版，再渲染
    const {
      rows,
      boxWidth,
      ctx,
      currentFontSize,
      currentFont,
      totalY,
      boxHeight,
    } = this;

    nodeList.map((node) => {
      if (node && !node.width) {
        if (node.type === NodeType.TEXT) {
          const nodeTextMetrics = ctx.measureText(node.value as string);
          node.width = nodeTextMetrics.width;
        }
      }
    });

    const defaultRowHeight = 11; // 默认(空行)行高
    const fonstStyle = `${currentFontSize} ${currentFont}`;
    const newBaseRows: RowType[] = [];
    // 待排版的node，从编辑位置后获取
    const newNodes: (TextNodeType | ImgNodeType)[] = [];
    const beforRowNum = rows.length; // 上次渲染的总行数
    let cloneRow: (TextNodeType | ImgNodeType)[] = []; // 从变化行到值插入或删除完毕后的光标位置元素。用于确认插入节点后行列号增量，以更新光标位置
    let nextNode: TextNodeType | ImgNodeType | null = null; // 改变元素的位置后一个元素，用于确定光标高度
    for (let i = 0, rl = rows.length; i < rl; i++) {
      const row = rows[i];
      if (i < start.row) {
        // 获取未受影响的行
        newBaseRows.push(row);
      } else if (i > end.row) {
        // 将后续行的节点加入待排版队列
        const { nodes } = row;
        newNodes.push(...nodes);
      } else {
        // 从此行开始发生变动
        // 找出变化列前的元素和变化后的元素，并将插入元素在变化后元素入列前加入待排版队列

        if (i > start.row && i < end.row) {
          // 多行删除时跳过中间行处理，即仅处理第一行和最后一行
          continue;
        }

        // col 是当前光标位置即元素本身位置
        const { nodes, width, height } = row;
        let currentIndex = 0; // 行下标，与col意义相同
        let isOk = false; // 用于判断是否在变化结束行成功插入新元素
        for (let j = 0, nl = nodes.length; j < nl; j++) {
          const { value, width, height, type } = nodes[j];
          if (currentIndex === start.col) {
            // 刚好在任意元素的结尾或开头插入
            isOk = true;
            newNodes.push(...nodeList);
            cloneRow = deepClone(newNodes); // 获取截止数组
          }
          if (type === NodeType.TEXT) {
            const strLen = (value as string).length;
            const currentColRange = currentIndex + strLen; // 步进区间
            if (
              (i === start.row && currentColRange <= start.col) ||
              (i === end.row && currentIndex + 1 > end.col)
            ) {
              // 若文本长度小于实际编辑位置，则找下一个元素node，即不在编辑区间内的节点可以直接加入待排版队列
              newNodes.push(nodes[j]);
            } else {
              if (i === start.row) {
                const sliceIndex = start.col - currentIndex;
                const bfNode = {
                  value: (value as string).slice(0, sliceIndex),
                  type,
                  width: 0,
                  height: 0,
                };
                newNodes.push(bfNode);
              }
              if (i === end.row) {
                const sliceIndex = end.col - currentIndex;
                // 否则表明新节点在此节点中插入
                isOk = true;
                newNodes.push(...nodeList);
                const afNode = {
                  value: (value as string).slice(sliceIndex),
                  type,
                  width: 0,
                  height: 0,
                };
                cloneRow = deepClone(newNodes); // 获取截止数组（计算插入元素后光标定位行列，故不包含后续节点）
                nextNode = afNode;
                newNodes.push(afNode);
              }
            }
            currentIndex += strLen;
          } else {
            // 节点是图片
            currentIndex++;
            if (currentIndex < start.col || currentIndex > end.col) {
              // 若图像下标小于实际编辑位置，则找下一个元素node
              newNodes.push(nodes[j]);
            } else if (currentIndex === start.col) {
              // 否则表明在此图片后进行编辑
              newNodes.push(nodes[j]);
            }
          }
        }
        if (!isOk && start.row === i) {
          // 刚好在变化行的结尾插入
          newNodes.push(...nodeList);
          cloneRow = deepClone(newNodes); // 获取截止数组
          nextNode = rows[i + 1]?.nodes[0] || null;
        }
      }
    }

    // 对变动行及后面的节点重新进行合并、排版
    const changeRows = nodeComposition(
      newNodes,
      boxWidth,
      boxHeight,
      ctx,
      fonstStyle
    );
    // 合并变更后的行
    newBaseRows.push(...changeRows);
    const afterRowNum = newBaseRows.length;

    // 替换新的rows
    this.rows = newBaseRows;

    // 对产生变化的部分进行排版
    const computeRows = nodeComposition(
      cloneRow,
      boxWidth,
      boxHeight,
      ctx,
      fonstStyle
    );

    // 重新计算总高度
    let y = 0;
    let cursorY = 0; // 光标的总渲染Y值，即包含滚动部分。
    let newRowIndex = start.row; // 考虑删除换行的情况，即对比插入元素前后的光标行号变化
    let changeRowHeight = 0; // 变化内容高度，用于光标更新

    for (let i = 0, j = newBaseRows.length; i < j; i++) {
      const { height, width } = newBaseRows[i];
      y += height;
      if (width === 0 && height === 0) {
        // 空行
        y += defaultRowHeight;
      }
      if (i < newRowIndex + computeRows.length) {
        cursorY = y;
      }
    }
    changeRowHeight = this.totalY - y; // 获取变化内容高度，用于光标更新 大于零表示删除，小于零表示增加 (todo 需要去除计算光标后方的行高，即多算了一部分)
    this.totalY = y;

    // debugger;
    // 计算插值后光标位置
    let newCursorX = 0;
    let newCursorY = cursorY - defaultRowHeight - this.scrollY; // cursorY这时是包含的一行的行高的，因为光标Y值起始为0.
    let newColIndex = 0;
    let realCursorHeight = 0; // 光标所在行的高度,用于校正页面存在滚动时的光标实际高度
    let endRowHeight = 0; // todo 考虑本行有数据及从下方换行上来(即插入元素后的光标所在行是否存在撑开高度的元素)的情况（插入或删除元素后，光标所在行的行高即最大高度，用于校准光标位置）

    const completeCursorRow = changeRows[computeRows.length - 1] || {
      width: 0,
      height: 0,
      col: 0,
    }; // 从除相同部分外全部节点排版好的行队列中读取光标当前行
    endRowHeight = completeCursorRow.height; // 更新部分的最后一行的高度
    const endRowCol = completeCursorRow.col; // 更新部分的最后一行的总列数

    for (let ri = 0, rl = computeRows.length; ri < rl; ri++) {
      const { nodes, height } = computeRows[ri]; // 此时的height是从变化行开始，截至到插入元素完成排版的行的高
      if (ri !== 0) {
        // 因为初始值包含了第一行的值，故仅计算后面的行
        newRowIndex += 1;
      }

      // 获取光标应当所在列，仅需计算最后一行
      if (ri < rl - 1) {
        continue;
      }

      for (let ni = 0, nl = nodes.length; ni < nl; ni++) {
        const { value, width, type } = nodes[ni];
        newCursorX += width;
        // 计算列
        if (type === NodeType.IMG) {
          newColIndex += 1;
        } else {
          newColIndex += (value as string).length;
        }
      }
      realCursorHeight = nodes[nodes.length - 1]?.height || 0;
    }

    // debugger;
    // 计算滚动距离并修正光标值(配合光标移动确认是否产生换行以及是否新行首)
    // 删除/添加内容时，若删除/添加完成后的光标仍在删除前滚动值的视野内(即新的光标高度减去滚动值后未低于或高于可视范围)，则不应该更新滚动值
    if (end.row !== newRowIndex) {
      let newScrollY = cursorY - boxHeight;
      if (newScrollY < 0) {
        newScrollY = 0; // 重置为安全值，即无滚动
      }
      if (newScrollY > 0 && newCursorY + defaultRowHeight >= boxHeight) {
        // 【todo 多行插入时不适用】滚动的高度来修正冲突（即上下换行）
        if (this.inputManager.y > newCursorY) {
          // 删除节点换行
          newCursorY += realCursorHeight;
        } else {
          // 插入节点换行
          // 新的光标Y值大于等于可视高度，且产生滚动变化则表明需要减去一行
          // 减去的高度为光标当前位置元素的高度
          newCursorY -= realCursorHeight;
        }
      }

      if (this.scrollY > 0 && changeRowHeight > 0) {
        // 存在滚动，删除rows中的最后一行(末端删除向上换行，即内容向下填充)时 加上当前行的高度修正内容下滚冲突
        newCursorY += realCursorHeight;
      }
      if (this.scrollY > 0 && this.scrollY < realCursorHeight) {
        // 需要考虑产生滚动但滚动不足一行高度时的情况
        newCursorY -= realCursorHeight - this.scrollY;
      }
      const tempHeight = cursorY - this.scrollY;
      if (tempHeight < 0 || tempHeight > boxHeight) {
        this.scrollY = newScrollY;
      } else {
        // 但对于光标后方无内容且存在滚动时，应当设置滚动值令内容向下/上填充
        let tempScrollY;
        tempScrollY = this.scrollY - realCursorHeight;
        this.scrollY = tempScrollY > 0 ? tempScrollY : 0;
      }
    }
    if (newRowIndex < 1 && newColIndex <= 0) {
      newCursorX = 0;
      newCursorY = 0;
    }
    if (newColIndex < 0) {
      newCursorY = 0;
    }
    // 更新光标位置（在更新滚动值后更新光标是解决在最大可视高度时产生换行--光标下移&&滚动值上移导致的冲突）
    this.inputManager.upPosition(
      newCursorX,
      newCursorY,
      newRowIndex,
      newColIndex
    );

    // 渲染
    this.render();
  }
  /**
   * 根据行列号插入新节点
   * @todo 判断是否需要更新滚动高度，即插入的内容后，光标是否仍在当前显示区域内
   * @param node 节点
   * @param rowNum 插入行号
   * @param colNum 插入列号
   */
  insertNode(node: TextNodeType | ImgNodeType, row: number, col: number) {
    const pos = { row, col };
    this.sliceNode(pos, pos, [node]);
  }
  beforRender() {
    // 重新对整个文档排版
    const {
      ctx,
      currentFont,
      currentFontSize,
      nodes,
      boxWidth,
      boxHeight,
      inputManager,
    } = this;
    const fonstStyle = `${currentFontSize} ${currentFont}`;

    this.rows = nodeComposition(nodes, boxWidth, boxHeight, ctx, fonstStyle);
    let y = 0;
    const { rows } = this;
    for (let i = 0, j = rows.length; i < j; i++) {
      const { height } = rows[i];
      y += height;
    }
    this.totalY = y;
  }
  /**
   * 渲染
   * todo 建立渲染控制机制，在更新时可被打断重绘（以及排版打断）
   */
  render() {
    const { ctx, rows, boxHeight, boxWidth, scrollY } = this;
    this.ctx.clearRect(0, 0, boxWidth, boxHeight);
    let y = 0;
    for (let ri = 0, rl = rows.length; ri < rl; ri++) {
      const { nodes, width, height } = rows[ri];
      let x = 0;
      let prevY = y;
      y += height;
      if (prevY > boxHeight + scrollY) {
        // 到文本顶部的高度超过视口停止后续渲染
        break;
      } else if (y < scrollY) {
        // 到文本底部的高度小于视口则跳过渲染
        continue;
      }
      for (let i = 0, nl = nodes.length; i < nl; i++) {
        const { value, width, height, type } = nodes[i];
        if (type === NodeType.TEXT) {
          // 在Canvas上绘制文本
          this.ctx.fillText(value as string, x, y - scrollY);
        } else {
          this.ctx.drawImage(
            value as HTMLImageElement,
            x,
            y - height - scrollY,
            width,
            height
          );
        }
        x += width;
      }
    }
  }
}

export default function getEditorImpl(el: HTMLCanvasElement, nodes: any[]) {
  try {
    return new Editor(el, nodes);
  } catch (error) {
    console.error(error);
  }
}

enum NodeType {
  TEXT,
  IMG,
}
