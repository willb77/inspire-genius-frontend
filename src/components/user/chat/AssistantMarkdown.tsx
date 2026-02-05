import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Children, isValidElement } from "react";
import type { ComponentPropsWithoutRef } from "react";

const containsTableHeader = (node: unknown): boolean => {
  if (!node) return false;
  if (Array.isArray(node)) return node.some(containsTableHeader);
  if (!isValidElement(node)) return false;
  const t = node.type;
  if (t === "thead" || t === "th") return true;
  return containsTableHeader((node.props as { children?: unknown } | undefined)?.children);
};

const MarkdownTable = (props: ComponentPropsWithoutRef<"table">) => {
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
};

const MarkdownThead = (props: ComponentPropsWithoutRef<"thead">) => (
  <thead className="" {...props} />
);

const MarkdownTbody = (props: ComponentPropsWithoutRef<"tbody">) => (
  <tbody className="" {...props} />
);

const MarkdownTr = (props: ComponentPropsWithoutRef<"tr">) => (
  <tr className="" {...props} />
);

const MarkdownTh = (props: ComponentPropsWithoutRef<"th">) => (
  <th className="border border-gray-300 bg-gray-100 px-2 py-1 text-left" {...props} />
);

const MarkdownTd = (props: ComponentPropsWithoutRef<"td">) => (
  <td className="border border-gray-300 px-2 py-1 align-top" {...props} />
);

const MARKDOWN_COMPONENTS = {
  table: MarkdownTable,
  thead: MarkdownThead,
  tbody: MarkdownTbody,
  tr: MarkdownTr,
  th: MarkdownTh,
  td: MarkdownTd,
} as const;

export default function AssistantMarkdown({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
