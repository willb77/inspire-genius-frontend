// Tiny, dependency-free Markdown → HTML converter for the subset that
// appears inside chat turns (paragraphs, headings, lists, fenced code,
// blockquotes, simple tables, bold/italic, inline code). The PDF
// renderer consumes plain HTML strings, so a React-based markdown
// renderer isn't usable here.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(s: string): string {
  let out = escapeHtml(s);
  out = out.replace(/`([^`]+)`/g, (_, m) => `<code>${m}</code>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, (_, m) => `<b>${m}</b>`);
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, (_full, lead, m) => `${lead}<i>${m}</i>`);
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => `<a href="${u}">${t}</a>`);
  return out;
}

function renderTable(lines: string[]): string {
  if (lines.length < 2) return lines.map(inline).join("<br>");
  const splitRow = (row: string): string[] =>
    row.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
  const header = splitRow(lines[0]);
  const rest = lines.slice(2).map(splitRow);
  const thead = `<thead><tr>${header.map((h) => `<th>${inline(h)}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${rest
    .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
    .join("")}</tbody>`;
  return `<table>${thead}${tbody}</table>`;
}

export function markdownToHtml(src: string): string {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      out.push(
        `<pre style="background:#f4f6f9;border:1px solid #d7dce4;border-radius:3px;padding:3mm 4mm;font-family:Menlo,Consolas,monospace;font-size:9pt;white-space:pre-wrap;">${escapeHtml(
          buf.join("\n"),
        )}</pre>`,
      );
      continue;
    }

    const h = line.match(/^(#{1,6})\s+(.+)$/);
    if (h) {
      const lvl = Math.min(h[1].length + 1, 6);
      out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`);
      i++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push(`<div class="narrative">${inline(buf.join(" ").trim())}</div>`);
      continue;
    }

    if (/\|/.test(line) && i + 1 < lines.length && /^\s*\|?\s*[-:]+/.test(lines[i + 1])) {
      const buf: string[] = [];
      while (i < lines.length && /\|/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      out.push(renderTable(buf));
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      out.push(`<ul>${buf.map((b) => `<li>${inline(b)}</li>`).join("")}</ul>`);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      out.push(`<ol>${buf.map((b) => `<li>${inline(b)}</li>`).join("")}</ol>`);
      continue;
    }

    if (!line.trim()) {
      i++;
      continue;
    }

    const paraBuf: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,6}|>|```|\s*[-*]\s|\s*\d+\.\s)/.test(lines[i])
    ) {
      paraBuf.push(lines[i]);
      i++;
    }
    out.push(`<p>${inline(paraBuf.join(" "))}</p>`);
  }
  return out.join("\n");
}
