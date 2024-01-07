type TextNodeType = {
  value: string;
  type: NodeType.TEXT;
  width: number;
  height: number;
};
type ImgNodeType = {
  type: NodeType.IMG;
  value: HTMLImageElement;
  width: number;
  height: number;
};

type RowType = {
  nodes: (TextNodeType | ImgNodeType)[];
  width: number;
  height: number;
  col: number;
};
