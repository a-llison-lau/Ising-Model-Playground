export interface ContentNode {
    // Tree node, each ContentNode is either a heading type or a text type. Contains a string, and has a list of childrens which are also ContentNodes.
    type: "h1" | "h2" | "h3" | "h4" | "table" | "text";
    content?: string;
    children: ContentNode[];
    headers?: string[];
    rows?: string[][];
  }