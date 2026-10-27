"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function ReportView({ content }: { content: string }) {
  return (
    <div className="prose prose-sm prose-zinc max-w-none prose-headings:font-semibold prose-headings:text-zinc-900 prose-a:text-emerald-700">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ src, alt }) => (
            <img
              src={typeof src === "string" ? src : ""}
              alt={alt ?? "figure"}
              referrerPolicy="no-referrer"
              loading="lazy"
              className="mx-auto max-h-96 max-w-full rounded-md border border-zinc-200 bg-white object-contain"
            />
          ),
          table: ({ children }) => (
            <div className="my-3 max-h-96 overflow-auto rounded-md border border-zinc-200">
              <table className="w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border-b border-zinc-200 bg-zinc-50 px-2 py-1.5 text-left font-semibold">{children}</th>,
          td: ({ children }) => <td className="border-b border-zinc-100 px-2 py-1.5 align-top">{children}</td>,
          blockquote: ({ children }) => (
            <blockquote className="my-2 rounded-r-md border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-900">{children}</blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
