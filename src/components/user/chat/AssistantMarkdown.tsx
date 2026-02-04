import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function AssistantMarkdown({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: (props) => (
            <table className="w-full border-collapse my-2" {...props} />
          ),
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
