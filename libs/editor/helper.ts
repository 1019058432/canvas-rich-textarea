enum NodeType {
  TEXT,
  IMG,
}

function addNodeToRow(
  row: RowType,
  value: string,
  width: number,
  height: number
) {
  const node = {
    value: value,
    type: NodeType.TEXT,
    width: width,
    height: height,
  };
  row.nodes.push(node);
}

function createNewRow(rows: RowType[]) {
  const newRow: RowType = {
    nodes: [],
    width: 0,
    height: 0,
    col: 0,
  };
  rows.push(newRow);
  return newRow;
}

/**
 * 节点合并并排版
 * 1、合并相邻字符串节点
 * 2、排版
 * @param nodes 节点列表
 * @param width 渲染宽度
 * @param height 渲染高度
 * @param ctx canvas绘画上下文
 * @param fontStyle canvas绘制文字样式
 * @returns 返回排版好的行数组
 */
export function nodeComposition(
  nodes: any[],
  width: number,
  height: number,
  ctx: CanvasRenderingContext2D,
  fontStyle: string
) {
  // 合并文本
  const mergeNodes: any[] = [];
  for (let i = 0, j = nodes.length; i < j; i++) {
    const node = nodes[i];
    const { type, value } = node as TextNodeType | ImgNodeType;
    if (type === NodeType.TEXT) {
      let prevNode = mergeNodes[mergeNodes.length - 1];
      if (prevNode && prevNode.type === NodeType.TEXT) {
        prevNode.value += value;
      } else {
        mergeNodes.push(node);
      }
    } else {
      mergeNodes.push(node);
    }
  }

  // 排版
  const maxWidth = width;

  const rows: RowType[] = [];
  for (let i = 0, k = mergeNodes.length; i < k; i++) {
    const node = mergeNodes[i];
    const { type } = node as TextNodeType;
    if (type === NodeType.TEXT) {
      computeLine(rows, node, maxWidth, ctx, fontStyle);
    } else {
      computeImage(rows, node, maxWidth);
    }
  }
  return rows;
}
/**
 * 根据现有排版行，对字符串进行排版并追加进排版行后
 * @param rows 原有已排版好的行
 * @param str 要被排版的字符串
 * @param maxWidth 渲染宽度
 * @param ctx canvas上下文
 * @param fontStyle canvas 文本样式
 * @returns 最新的排版行
 */
export function computeLine(
  rows: RowType[],
  node: TextNodeType,
  maxWidth: number,
  ctx: CanvasRenderingContext2D,
  fontStyle: string
) {
  const { value: str } = node;

  // 设置字体样式
  if (fontStyle) {
    ctx.font = fontStyle;
  }
  // 计算
  let currentRow = rows[rows.length - 1];
  if (!currentRow) {
    currentRow = {
      nodes: [],
      width: 0,
      height: 0,
      col: 0,
    };
    rows.push(currentRow);
  }
  const maxIndex = str.length;
  let index = 0;
  while (index < maxIndex) {
    let hasW = maxWidth - currentRow.width;
    let s = str.slice(index); // 实际剩余
    const textMetrics = ctx.measureText(s);
    const textWidth = textMetrics.width;
    if (textWidth <= hasW) {
      const textHeight = textMetrics.fontBoundingBoxAscent;
      addNodeToRow(
        currentRow,
        s,
        textWidth,
        // textMetrics.actualBoundingBoxAscent
        textHeight
      );
      currentRow.width += textWidth;
      currentRow.col += s.length;
      if (textHeight > currentRow.height) {
        currentRow.height = textHeight;
      }
      if (textWidth === hasW) {
        createNewRow(rows);
      }
      index = maxIndex;
    } else {
      // 求出当前截取的字符串平均值进行二分查找，再对具体位置前后一位字符进行可容判定
      const charAvgWidth = textWidth / s.length;
      // 从接近值开始查找，大于剩余空间则往后，小于则往前
      let shouEndIndex = Math.floor(hasW / charAvgWidth);
      let prevV = 0;
      let stop = false;
      while (true) {
        let s1 = s.slice(0, shouEndIndex);
        const s1Metrics = ctx.measureText(s1);
        const s1textWidth = s1Metrics.width;
        if (!stop && s1textWidth > hasW) {
          if (shouEndIndex === prevV) {
            stop = true;
            continue;
          }
          prevV = shouEndIndex;
          shouEndIndex -= 1;
        } else if (!stop && hasW - s1textWidth >= charAvgWidth) {
          if (index + shouEndIndex >= maxIndex) {
            stop = true;
            continue;
          }
          shouEndIndex += 1;
        } else {
          const s1textHeight = s1Metrics.fontBoundingBoxAscent;
          addNodeToRow(
            currentRow,
            s1,
            s1textWidth,
            // s1Metrics.actualBoundingBoxAscent
            s1textHeight
          );
          currentRow.width += s1textWidth;
          currentRow.col += s1.length;
          if (s1textHeight > currentRow.height) {
            currentRow.height = s1textHeight;
          }
          if (maxWidth - currentRow.width <= charAvgWidth) {
            currentRow = createNewRow(rows);
          }

          index = index + shouEndIndex;
          break;
        }
      }
    }
  }

  return rows;
}
/**
 * 根据现有排版行，对字符串进行排版并追加进排版行后
 * @param rows 原有已排版好的行
 * @param node 要被排版的图像节点
 * @param maxWidth 渲染宽度
 * @returns 最新的排版行
 */
export function computeImage(
  rows: RowType[],
  node: ImgNodeType,
  maxWidth: number
) {
  let currentRow = rows[rows.length - 1];
  if (!currentRow) {
    currentRow = {
      nodes: [],
      width: 0,
      height: 0,
      col: 0,
    };
    rows.push(currentRow);
  }
  let hasW = maxWidth - currentRow.width;
  const { width, height } = node;
  if (hasW >= width) {
    currentRow.nodes.push(node);
    currentRow.width += width;
    currentRow.col += 1;
    if (height > currentRow.height) {
      currentRow.height = height;
    }
  } else {
    currentRow = {
      nodes: [node],
      width: width,
      height: height,
      col: 1,
    };
    rows.push(currentRow);
  }
}

/**
 * 获取滚动变化距离
 * 回调参数x,y为相对上次回调变化值，over为true即表示滚动结束，且x,y为总变化值
 * @param el 监听元素
 * @param callback 滚动持续回调
 */
export function handleMouseScrollOrSwipe(
  el: HTMLElement,
  callback: (x: number, y: number, over?: boolean) => void
) {
  let isScrolling = false;
  let startY = 0;
  let startX = 0;
  let currentY = 0;
  let currentX = 0;

  function handleStart(event: any) {
    isScrolling = true;
    startY = event.touches ? event.touches[0].clientY : event.clientY;
    startX = event.touches ? event.touches[0].clientX : event.clientX;
    currentY = startY;
    currentX = startX;
  }

  function handleMove(event: any) {
    if (!isScrolling) return;
    const prevY = currentY;
    const prevX = currentX;
    currentY = event.touches ? event.touches[0].clientY : event.clientY;
    currentX = event.touches ? event.touches[0].clientX : event.clientX;
    event.preventDefault();
    const changeY = prevY - currentY;
    const changeX = prevX - currentX;
    callback(changeX, changeY);
  }

  function handleEnd() {
    if (!isScrolling) return;
    isScrolling = false;
    const deltaY = currentY - startY;
    const deltaX = currentX - startX;
    callback(deltaX, deltaY, true);
  }

  function animateScroll() {
    if (!isScrolling) return;
    requestAnimationFrame(animateScroll);
    const y = currentY - startY;
    const x = currentX - startX;
    callback(x, y);
  }

  // Add event listeners for different browsers and devices
  el.addEventListener("mousedown", handleStart);
  el.addEventListener("mousemove", handleMove);
  el.addEventListener("mouseup", handleEnd);
  el.addEventListener("touchstart", handleStart);
  el.addEventListener("touchmove", handleMove);
  el.addEventListener("touchend", handleEnd);
  el.addEventListener("mouseout", handleEnd);

  // Start animation loop
  animateScroll();
}

/**
 * 获取点击事件到参照物的边缘距离
 * @param element 参照物元素
 * @param event 点击事件
 * @returns object {left: number, top: number, right: number, bottom: number}
 */
export function getDistanceToElementEdges(
  element: HTMLElement,
  event: MouseEvent
): { top: number; left: number; right: number; bottom: number } {
  const rect = element.getBoundingClientRect();
  const { clientX, clientY } = event;
  const top = clientY - rect.top;
  const left = clientX - rect.left;
  const right = rect.right - clientX;
  const bottom = rect.bottom - clientY;
  return { top, left, right, bottom };
}
/**
 * 根据点击位置计算实际行列及校准光标定位距离
 * @todo 对于图片高度超出文本高度时，点击进行光标定位时与文本不一致
 * @param rows 被渲染的目标行数组
 * @param x 画布被点击的x轴距离
 * @param y 画布被点击的y轴距离
 * @param initY 画布中滚动的距离
 * @param ctx canvas上下文
 * @returns 返回被校准后的光标定位px值及行列号
 */
export function computeRowCol(
  rows: RowType[],
  x: number,
  y: number,
  initY: number,
  ctx: CanvasRenderingContext2D
) {
  let currentY = 0;
  let currentX = 0;
  let ri = 0;
  let j = rows.length;
  let col = 0;
  let prevCurrentY = 0;

  for (; ri < j; ri++) {
    const {
      nodes,
      height: rowHeight,
      width: rowWidth,
      col: rowColNum,
    } = rows[ri];
    prevCurrentY = currentY;
    currentY += rowHeight;
    // 若点击canvas的位置加上滚动距离大于当前行的高度，则表明不在范围内，直接跳过
    if (y + initY > currentY) {
      // 记录当前行的距离值和列数并跳过
      currentX = rowWidth;
      col = rowColNum;
      continue;
    }
    currentX = 0; // 重置行的距离值
    col = 0; // 重置行的列值
    for (let ni = 0, nl = nodes.length; ni < nl; ni++) {
      const { value, width, height, type } = nodes[ni]; // todo【tag=cursor_click】这里的height涉及到光标向下对齐还是向上对齐,若保留排版时的最小高度，则可以向下对齐(即先加上最大行高，再减去最小行高，这里当前是直接减去节点高度，也就是始终与光标所在位置节点的顶部对齐)
      currentX += width;
      // 计算列
      if (type === NodeType.IMG) {
        col += 1;
      } else {
        col += (value as string).length;
      }
      // x不在范围内且不是最后一个节点则跳过本次循环
      if (x > currentX && ni + 1 !== nl) {
        continue;
      }
      // 返回的实际光标定位y值要减去滚动值，因为光标定位的起点(左上角)一直不变(即没有参与滚动)
      if (type === NodeType.IMG) {
        return {
          x: currentX,
          y: currentY - height - initY,
          row: ri,
          col,
        };
      } else {
        // 计算具体文字下标
        const s = value as string;
        const maxIndex = s.length;
        const charAvgWidth = width / maxIndex;
        const preVCurrentX = currentX - width;
        const hasW = x - preVCurrentX;
        // 从接近值开始查找，大于剩余空间则往后，小于则往前
        let shouEndIndex = Math.floor(hasW / charAvgWidth);
        let prevV = 0;
        let stop = false;
        while (true) {
          let s1 = s.slice(0, shouEndIndex);
          const s1Metrics = ctx.measureText(s1);
          const s1textWidth = s1Metrics.width;
          if (!stop && s1textWidth > hasW) {
            if (shouEndIndex === prevV) {
              stop = true;
              continue;
            }
            prevV = shouEndIndex;
            shouEndIndex -= 1;
          } else if (!stop && hasW - s1textWidth >= charAvgWidth) {
            if (shouEndIndex >= maxIndex) {
              stop = true;
              continue;
            }
            shouEndIndex += 1;
          } else {
            const s1textHeight = s1Metrics.fontBoundingBoxAscent;
            return {
              x: preVCurrentX + s1textWidth,
              y: currentY - s1textHeight - initY,
              row: ri,
              col: col - s.length + s1.length,
            };
          }
        }
      }
    }
    // 直接阻断，若不返回任何东西，则表明计算异常
    break;
  }
  // 最后返回内容最后的位置作为新位置
  return {
    x: currentX,
    y: prevCurrentY - initY,
    row: ri - 1, // 去除最后的ri++
    col,
  };
}
/**
 * 根据行列位置计算实际行列及校准光标定位距离
 * @param rows 被渲染的目标行数组
 * @param x 画布被点击的x轴距离
 * @param y 画布被点击的y轴距离
 * @param initY 画布中滚动的距离
 * @param ctx canvas上下文
 * @returns 返回被校准后的光标定位px值及行列号
 */
export function computeXY(
  rows: RowType[],
  rowIndex: number,
  colIndex: number,
  initY: number,
  ctx: CanvasRenderingContext2D
) {
  let currentY = 0; // 每行的Y轴数值(即绘制时的y轴起点)
  for (let ri = 0, j = rows.length; ri < j; ri++) {
    const { nodes, height: rowHeight, width: rowWidth } = rows[ri];
    currentY += rowHeight;
    // 若行号大于当前行，则表明不在范围内，直接跳过
    if (ri < rowIndex) {
      continue;
    }
    if (colIndex < 0) {
      // 若新下标小于零(-1)则表明行首左移,即向上换行
      const prevRow = rows[ri - 1] || { width: 0, height: 0, nodes: [] };
      const prevRowMaxCol = getRowCol(prevRow);
      return {
        x: prevRow.width,
        y: currentY - rowHeight - prevRow.height,
        row: ri - 1,
        col: prevRowMaxCol,
      };
    }
    let currentX = 0;
    let col = 0;
    for (let ni = 0, nl = nodes.length; ni < nl; ni++) {
      const { value, width, height, type } = nodes[ni];
      currentX += width;
      // 计算列
      if (type === NodeType.IMG) {
        col += 1;
      } else {
        col += (value as string).length;
      }
      // col不在范围内且不是最后一个节点则跳过本次循环
      if (colIndex > col) {
        if (ni + 1 !== nl) {
          continue;
        } else {
          const isLastRow = ri + 1 === j;
          // 如果是最后一行则光标应当停止在这里（即最后一行的最后一个元素）
          if (isLastRow) {
            return {
              x: currentX,
              y: currentY - rowHeight,
              row: ri,
              col: col,
            };
          }
          // 否则是本行最后一个节点且不在范围内，即向下换行，如果存在的话
          return {
            x: 0,
            y: currentY,
            row: ri + 1,
            col: 0,
          };
        }
      }
      // 返回的实际光标定位y值要减去滚动值，因为光标定位的起点(左上角)一直不变(即没有参与滚动)
      if (type === NodeType.IMG) {
        return {
          x: currentX,
          y: currentY - height - initY,
          row: ri,
          col,
        };
      } else {
        // 计算具体文字下标
        const s = value as string;
        let s1 = s.slice(0, colIndex - col);
        const preVCurrentX = currentX - width;
        const s1Metrics = ctx.measureText(s1);
        let realY = s1Metrics.fontBoundingBoxAscent;
        let realX;
        let realCol;
        if (s1.length === 0) {
          if (colIndex === 0) {
            // 移动至行首
            realX = 0;
            realCol = 0;
          } else {
            // 若刚好是整个字符串
            realX = width;
            realCol = col;
          }
        } else {
          realX = s1Metrics.width;
          realCol = col - s.length + s1.length;
        }
        return {
          x: preVCurrentX + realX,
          y: currentY - realY - initY,
          row: ri,
          col: realCol,
        };
      }
    }
    // 直接阻断，若不返回任何东西，则表明计算异常
    break;
  }
}
/**
 * 根据给定的行列号判断行和列是否处于最大值
 * @param rows 被渲染的目标行数组
 * @param rowIndex 被检测的行号
 * @param colIndex 被检测的列号
 * @returns object {rowInEnd: boolean, colInEnd: boolean} | undefind 行列是否处于结尾
 */
export function pointInEnd(
  rows: RowType[],
  rowIndex: number,
  colIndex: number
) {
  let rowInEnd = true;
  let colInEnd = true;
  if (rows.length !== rowIndex) {
    rowInEnd = false;
  }
  const currentRow = rows[rowIndex] || { nodes: [] };
  // 当前行最后一个节点且不在范围内，
  if (rowInEnd && currentRow.nodes.length <= colIndex) {
    return {
      rowInEnd,
      colInEnd,
    };
  }
  for (let ri = 0, j = rows.length; ri < j; ri++) {
    const { nodes, height: rowHeight, width: rowWidth } = rows[ri];
    let col = 0;
    if (ri < rowIndex) {
      continue;
    }
    for (let ni = 0, nl = nodes.length; ni < nl; ni++) {
      const { value, height, type } = nodes[ni];
      // 计算列
      if (type === NodeType.IMG) {
        col += 1;
      } else {
        col += (value as string).length;
      }
      // colIndex不在范围内则跳过本次循环
      if (col < colIndex) {
        continue;
      }
      colInEnd = false;
    }
  }
  return {
    rowInEnd,
    colInEnd,
  };
}

/**
 * 对变量进行深度克隆并返回
 * @param obj 克隆变量
 * @returns 克隆值
 */
export function deepClone<T>(obj: T): T {
  let clone: any;
  if (obj instanceof Map) {
    clone = new Map();
    obj.forEach((value, key) => {
      clone.set(key, deepClone(value));
    });
  } else if (obj instanceof Set) {
    clone = new Set();
    obj.forEach((value) => {
      clone.add(deepClone(value));
    });
  } else if (Array.isArray(obj)) {
    clone = [];
    obj.forEach((value) => {
      clone.push(deepClone(value));
    });
  } else if (typeof obj === "object" && obj !== null) {
    clone = {};
    Object.keys(obj).forEach((key) => {
      clone[key] = deepClone((obj as { [key: string]: any })[key]);
    });
  } else {
    clone = obj;
  }
  return clone;
}

/**
 *
 * @param row 行信息
 * @returns 本行的最大列
 */
function getRowCol(row: any) {
  const { nodes } = row;
  let col = 0;
  for (let ni = 0, nl = nodes.length; ni < nl; ni++) {
    const { value, type } = nodes[ni];
    // 计算列
    if (type === NodeType.IMG) {
      col += 1;
    } else {
      col += (value as string).length;
    }
  }
  return col;
}
