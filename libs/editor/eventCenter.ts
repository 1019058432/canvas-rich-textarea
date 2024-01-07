export class EventCenter {
  isScrolling = false;
  isSelecting = false; // 标记选中文本及元素状态 改变选中范围的拖动应与isScrolling冲突
  startY = 0;
  startX = 0;
  currentY = 0;
  currentX = 0;

  listener = new Map<string, ((...args: any) => void)[]>();
  constructor() {
    this.handleStart = this.handleStart.bind(this);
    this.handleEnd = this.handleEnd.bind(this);
    this.handleMove = this.handleMove.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }

  onEvent(type: string, fn: (...args: any) => void) {
    let eventFns = this.listener.get(type);
    if (!eventFns) {
      eventFns = [];
    }
    eventFns.push(fn);
    this.listener.set(type, eventFns);
  }
  callFn(type: string, ...args: any) {
    const fns = this.listener.get(type);
    fns?.map((fn) => {
      fn(...args);
    });
  }

  handleStart(event: any) {
    this.isScrolling = true;
    this.startY = event.touches ? event.touches[0].clientY : event.clientY;
    this.startX = event.touches ? event.touches[0].clientX : event.clientX;
    this.currentY = this.startY;
    this.currentX = this.startX;
  }

  handleMove(event: any) {
    if (!this.isScrolling) return;
    const prevY = this.currentY;
    const prevX = this.currentX;
    this.currentY = event.touches ? event.touches[0].clientY : event.clientY;
    this.currentX = event.touches ? event.touches[0].clientX : event.clientX;
    event.preventDefault();
    const changeY = prevY - this.currentY;
    const changeX = prevX - this.currentX;
    this.callFn("scroll", changeX, changeY);
  }

  handleEnd() {
    if (!this.isScrolling) return;
    this.isScrolling = false;
    const deltaY = this.currentY - this.startY;
    const deltaX = this.currentX - this.startX;
    this.callFn("scroll", deltaX, deltaY, true);
  }

  handleClick(event: any) {
    this.callFn("click", event);
  }

  longTouchHandle() {
    // 长按事件
  }

  bindCanvasEl(el: HTMLCanvasElement) {
    el.addEventListener("mousedown", this.handleStart);
    el.addEventListener("mousemove", this.handleMove);
    el.addEventListener("mouseup", this.handleEnd);
    el.addEventListener("mouseout", this.handleEnd);

    // touchstart --> touchmove -> touchend -->click
    el.addEventListener("touchstart", this.handleStart);
    el.addEventListener("touchmove", this.handleMove);
    el.addEventListener("touchend", this.handleEnd);
    el.addEventListener("click", this.handleClick);
  }
}
