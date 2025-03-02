import { ContentNode } from "../types/types";

export function parseMarkdown(markdown: string): ContentNode[] {
  const lines = markdown.split("\n");
  const root: ContentNode[] = [];
  let currentH1: ContentNode | null = null;
  let currentH2: ContentNode | null = null;
  let currentH3: ContentNode | null = null;
  let currentH4: ContentNode | null = null;

  // Table parsing state
  let isInTable = false;
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];

  // Buffer to accumulate text lines before adding them to a section
  let textBuffer: string[] = [];

  function flushTextBuffer() {
    if (textBuffer.length > 0) {
      const text = textBuffer.join("\n").trim();
      if (text) {
        // Add text to the most specific current heading
        const currentNode = currentH4 || currentH3 || currentH2 || currentH1;
        if (currentNode) {
          currentNode.children.push({
            type: "text",
            content: text,
            children: [],
          });
        }
      }
      textBuffer = [];
    }
  }

  function addTableToCurrentNode() {
    if (tableHeaders.length > 0 && tableRows.length > 0) {
      const currentNode = currentH4 || currentH3 || currentH2 || currentH1;
      if (currentNode) {
        currentNode.children.push({
          type: "table",
          headers: tableHeaders,
          rows: tableRows,
          children: [],
        });
      }
      // Reset table state
      tableHeaders = [];
      tableRows = [];
      isInTable = false;
    }
  }

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // Table parsing
    if (trimmedLine.startsWith("|") && trimmedLine.endsWith("|")) {
      // Flush any accumulated text before starting table
      if (!isInTable) {
        flushTextBuffer();
      }

      const cells = trimmedLine
        .split("|")
        .slice(1, -1)
        .map(cell => cell.trim());

      if (!isInTable) {
        // This is the header row
        isInTable = true;
        tableHeaders = cells;
        return; // Skip the rest of this iteration
      }

      // Check if this is the separator row (contains only -, :, and |)
      if (cells.every(cell => /^[-:]+$/.test(cell))) {
        return; // Skip the separator row
      }

      // This is a data row
      tableRows.push(cells);

      // Check if this is the last row (no more table rows follow)
      const nextLine = lines[index + 1]?.trim() || "";
      if (!nextLine.startsWith("|")) {
        addTableToCurrentNode();
      }
      return;
    } else if (isInTable) {
      // We've exited the table
      addTableToCurrentNode();
    }

    // Regular markdown parsing
    if (trimmedLine.startsWith("# ")) {
      flushTextBuffer();
      currentH1 = {
        type: "h1",
        content: trimmedLine.slice(2).trim(),
        children: [],
      };
      root.push(currentH1);
      currentH2 = null;
      currentH3 = null;
      currentH4 = null;
    } else if (trimmedLine.startsWith("## ")) {
      flushTextBuffer();
      if (currentH1) {
        currentH2 = {
          type: "h2",
          content: trimmedLine.slice(3).trim(),
          children: [],
        };
        currentH1.children.push(currentH2);
        currentH3 = null;
        currentH4 = null;
      }
    } else if (trimmedLine.startsWith("### ")) {
      flushTextBuffer();
      if (currentH2) {
        currentH3 = {
          type: "h3",
          content: trimmedLine.slice(4).trim(),
          children: [],
        };
        currentH2.children.push(currentH3);
        currentH4 = null;
      }
    } else if (trimmedLine.startsWith("#### ")) {
      flushTextBuffer();
      if (currentH3) {
        currentH4 = {
          type: "h4",
          content: trimmedLine.slice(5).trim(),
          children: [],
        };
        currentH3.children.push(currentH4);
      }
    } else if (trimmedLine && !isInTable) {
      // Accumulate text content
      textBuffer.push(line);
    }
  });

  // Flush any remaining text or table at the end
  if (isInTable) {
    addTableToCurrentNode();
  }
  flushTextBuffer();

  return root;
}