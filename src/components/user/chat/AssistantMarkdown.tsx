import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Children, isValidElement } from "react";

export default function AssistantMarkdown({ text, className }: { text: string; className?: string }) {
  const containsTableHeader = (node: unknown): boolean => {
    if (!node) return false;
    if (Array.isArray(node)) return node.some(containsTableHeader);
    if (!isValidElement(node)) return false;
    const t = node.type;
    if (t === "thead" || t === "th") return true;
    return containsTableHeader((node.props as { children?: unknown } | undefined)?.children);
  };
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: (props) => {
            const hasHeader = containsTableHeader(props.children);
            return (
              <table className="w-full border-collapse my-2" {...props}>
                {hasHeader ? null : (
                  <thead>
                    <tr>
                      <th className="sr-only">Table</th>
                    </tr>
                  </thead>
                )}
                {Children.toArray(props.children)}
              </table>
            );
          },
          thead: (props) => <thead className="" {...props} />,
          tbody: (props) => <tbody className="" {...props} />,
          tr: (props) => <tr className="" {...props} />,
          th: (props) => (
            <th className="border border-gray-300 bg-gray-100 px-2 py-1 text-left" {...props} />
          ),
          td: (props) => (
            <td className="border border-gray-300 px-2 py-1 align-top" {...props} />
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
