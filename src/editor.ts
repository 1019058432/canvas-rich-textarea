import teamImg from "@/assets/team.png";

import getEditorImpl from "../libs/editor";

let editor;
export function setupEditor(canvas: HTMLCanvasElement) {
  enum NodeType {
    TEXT,
    IMG,
  }
  const img = new Image(20, 20);
  const nodes: any[] = [
    {
      type: NodeType.TEXT,
      value: "Hello, World!",
    },
    {
      type: NodeType.TEXT,
      value: "Hello, World!",
    },
    {
      type: NodeType.TEXT,
      value: "Hello, World!",
    },
    {
      type: NodeType.TEXT,
      value: "Hello, World!",
    },
    {
      type: NodeType.IMG,
      value: img,
      width: 20,
      height: 20,
    },
    {
      type: NodeType.TEXT,
      value: `雨天的屋瓦，浮漾湿湿的流光，灰而温柔，迎光则微明，背光则幽黯，
      对于视觉，是一种低沉的安慰。至于雨敲在鳞鳞千瓣的瓦上，由远而近，轻轻重重轻轻，
      夹着一股股的细流沿瓦槽与屋檐潺潺泻下，各种敲击音与滑音密织成网，
      谁的千指百指在按摩耳轮。“下雨了，”温柔的灰美人来了，
      她冰冰的纤手在屋顶拂弄着无数的黑键啊灰键，把晌午一下子奏成了黄昏。`,
    },
  ];
  img.onload = () => {
    editor = getEditorImpl(canvas, nodes);
    setTimeout(() => {
      // editor?.appendNode({
      //   value: '测试追加文本',
      //   type: NodeType.TEXT
      // })
      // editor?.insertNode({
      //   value: '测试追加文本',
      //   type: NodeType.TEXT
      // },2,5)
    }, 3000);
  };
  img.src = teamImg;
}
