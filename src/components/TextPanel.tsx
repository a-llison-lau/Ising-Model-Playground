import { MathJax, MathJaxContext } from "better-react-mathjax";
import { useEffect, useState } from "react";
import { ContentNode } from "../types/types";
import { parseMarkdown } from "../utils/parseMarkdown";
import styles from "./TextPanel.module.css";

const config = {
  loader: { load: ["[tex]/html"] },
  tex: {
    packages: { "[+]": ["html"] },
    inlineMath: [
      ["$", "$"],
      ["\\(", "\\)"],
    ],
    displayMath: [
      ["$$", "$$"],
      ["\\[", "\\]"],
    ],
  },
};

const RenderContent = ({ node }: { node: ContentNode }) => {
  switch (node.type) {
    case "h1":
      return (
        <div className="mb-0">
          <div
            className={`sticky -top-4 p-3 z-10 -mx-4 ${styles["header-blur"]}`}
          >
            <h1 className="text-xl font-bold text-left opacity-100">
              {node.content}
            </h1>
          </div>
          <div className="mt-4 text-left">
            {node.children.map((child, index) => (
              <RenderContent key={index} node={child} />
            ))}
          </div>
        </div>
      );
    case "h2":
      return (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mt-4 mb-2">{node.content}</h2>
          {node.children.map((child, index) => (
            <RenderContent key={index} node={child} />
          ))}
        </div>
      );
    case "h3":
      return (
        <div className="mt-3">
          <h3 className="text-md font-medium mt-3 mb-2">{node.content}</h3>
          {node.children.map((child, index) => (
            <RenderContent key={index} node={child} />
          ))}
        </div>
      );
    case "h4":
      return (
        <div className="mt-2">
          <h4 className="text-sm font-medium mt-2 mb-2">{node.content}</h4>
          {node.children.map((child, index) => (
            <RenderContent key={index} node={child} />
          ))}
        </div>
      );
    case "table":
      if (!node.headers || !node.rows) {
        return null; // Skip rendering if table data is missing
      }
      return (
        <div className="my-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead>
              <tr>
                {node.headers.map((header, index) => (
                  <th
                    key={index}
                    className="px-4 py-3 text-left text-sm font-semibold bg-zinc-100"
                  >
                    <MathJax>{header}</MathJax>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {node.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-zinc-100/50">
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-4 py-2 text-sm whitespace-nowrap"
                    >
                      <MathJax>{cell}</MathJax>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "text":
      return (
        <div className="overflow-x-auto">
          <MathJax hideUntilTypeset={"first"}>
            {node.content?.split("\n").map(
              (paragraph, index) =>
                paragraph.trim() && (
                  <p key={index} className="mb-4">
                    {paragraph}
                  </p>
                )
            )}
          </MathJax>
        </div>
      );
    default:
      return null;
  }
};

function TextPanel() {
  const [content, setContent] = useState<ContentNode[]>([]);

  useEffect(() => {
    fetch("/content.md")
      .then((response) => response.text())
      .then((text) => {
        const parsedContent = parseMarkdown(text);
        setContent(parsedContent);
      })
      .catch((error) => console.error("Error loading markdown:", error));
  }, []);

  return (
    <div className="relative">
      <div
        className="relative text-black p-4 h-full overflow-x-hidden overflow-y-auto bg-white md:w-2/7"
        style={{
          height: "100vh",
          zIndex: 15,
        }}
      >
        <MathJaxContext version={3} config={config}>
          {content.map((node, index) => (
            <RenderContent key={index} node={node} />
          ))}
        </MathJaxContext>
      </div>
    </div>
  );
}

export default TextPanel;