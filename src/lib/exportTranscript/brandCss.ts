// Locked Inspires Genius brand CSS — verbatim port of §7 in the
// `format_transcript_to_pdf.md` spec, adapted for in-browser DOM rendering
// (the `@page` block is supplied by jsPDF page sizing, page numbers are
// stamped per page by the renderer, and the cover background is painted
// by a full-bleed wrapper rather than a `@page cover` selector).
//
// Visual rules (colors, typography, spacing, component decoration) are
// the source of truth and must not drift. Future generators that need
// these tokens (Word, HTML, email) should import the same `BRAND_TOKENS`
// constant instead of redeclaring them.

export const BRAND_TOKENS = {
  navy: "#1B2A4A",
  orange: "#E8792B",
  ink: "#222831",
  muted: "#5a6473",
  line: "#d7dce4",
  soft: "#f4f6f9",
  softer: "#fbfcfd",
  mary: "#2e7d6b",
  alice: "#b4532a",
  fontStack: '"Liberation Sans","Arial",sans-serif',
  tagline: "Talent is everywhere. Opportunity isn’t.",
} as const;

// The locked CSS, ready to drop into a `<style>` block.
export const BRAND_CSS = `
:root{
  --navy:#1B2A4A;--orange:#E8792B;--ink:#222831;--muted:#5a6473;
  --line:#d7dce4;--soft:#f4f6f9;--softer:#fbfcfd;--mary:#2e7d6b;--alice:#b4532a;
}
*{box-sizing:border-box;}
html,body{margin:0;padding:0;}
body{font-family:"Liberation Sans","Arial",sans-serif;color:var(--ink);font-size:10.5pt;line-height:1.5;}
h1,h2,h3,h4{font-family:"Liberation Sans","Arial",sans-serif;color:var(--navy);margin:0;}
.cover{background:var(--navy);color:#fff;padding:60mm 16mm 20mm 16mm;margin:0;width:210mm;height:297mm;}
.cover .brand{font-size:11pt;letter-spacing:3px;text-transform:uppercase;color:var(--orange);font-weight:bold;margin-bottom:6mm;}
.cover .variant{display:inline-block;border:1px solid var(--orange);color:var(--orange);font-size:8.5pt;font-weight:bold;text-transform:uppercase;letter-spacing:1.5px;padding:1.5mm 3.5mm;border-radius:2px;margin-bottom:8mm;}
.cover h1{color:#fff;font-size:30pt;line-height:1.12;margin-bottom:5mm;}
.cover .sub{font-size:13pt;color:#c9d2e0;font-weight:normal;margin-bottom:14mm;}
.cover .meta{border-top:2px solid var(--orange);padding-top:6mm;display:table;width:100%;}
.cover .meta div{display:table-cell;padding-right:10mm;font-size:9.5pt;color:#aeb9cc;}
.cover .meta div b{display:block;color:#fff;font-size:11pt;margin-top:1mm;}
.tagline{font-style:italic;color:#aeb9cc;font-size:10pt;margin-top:12mm;}
.part-label{color:var(--orange);font-weight:bold;text-transform:uppercase;letter-spacing:2px;font-size:8.5pt;margin-bottom:1mm;}
h2.part{font-size:18pt;border-bottom:2px solid var(--navy);padding-bottom:2.5mm;margin-bottom:5mm;}
h3{font-size:12.5pt;margin:6mm 0 2.5mm 0;color:var(--navy);}
h4{font-size:10.5pt;margin:4mm 0 1.5mm 0;color:var(--navy);}
p{margin:0 0 2.5mm 0;}
.lead{color:var(--muted);font-size:10.5pt;margin-bottom:5mm;}
table{border-collapse:collapse;width:100%;margin:2mm 0 4mm 0;font-size:9.5pt;}
th{background:var(--navy);color:#fff;text-align:left;padding:2.2mm 3mm;font-weight:bold;font-size:9pt;}
td{padding:2mm 3mm;border-bottom:1px solid var(--line);vertical-align:top;}
tr:nth-child(even) td{background:var(--softer);}
td.num,th.num{text-align:center;}
.tbl-tight td{padding:1.6mm 3mm;}
.context{background:var(--soft);border-left:4px solid var(--orange);padding:4mm 5mm;margin:2mm 0 5mm 0;}
.context table{margin:0;}
.context td{border:none;padding:1.2mm 3mm 1.2mm 0;background:none;}
.context td.k{color:var(--muted);width:42mm;font-size:9pt;}
.context td.v{font-weight:bold;color:var(--navy);}
.signature{background:var(--softer);border:1px solid var(--line);border-left:4px solid var(--navy);padding:3mm 4mm;margin:1mm 0 4mm 0;font-style:italic;color:var(--ink);}
.signature b{font-style:normal;}
.narrative{background:#eef1f6;border-radius:3px;padding:3.5mm 4.5mm;margin:2mm 0 5mm 0;color:var(--navy);font-style:italic;}
.turn{margin:0 0 4mm 0;page-break-inside:avoid;border:1px solid var(--line);border-radius:3px;overflow:hidden;}
.turn .who{font-weight:bold;font-size:8.5pt;text-transform:uppercase;letter-spacing:1px;padding:2mm 4mm;}
.turn .who .ts{float:right;font-weight:normal;text-transform:none;letter-spacing:0;color:#9aa3b2;font-size:7.5pt;}
.turn .msg{padding:3mm 4mm;}
.turn .msg > p:last-child,.turn .msg > table:last-child{margin-bottom:0;}
.turn.user{border-left:4px solid var(--orange);}
.turn.user .who{color:var(--orange);background:var(--soft);}
.turn.agent{border-left:4px solid var(--navy);}
.turn.agent .who{color:#fff;background:var(--navy);}
.qa{margin:0 0 7mm 0;page-break-inside:avoid;}
.q{background:var(--navy);color:#fff;padding:3mm 4mm;border-radius:3px 3px 0 0;}
.q .qnum{color:var(--orange);font-weight:bold;font-size:8.5pt;letter-spacing:1px;text-transform:uppercase;display:block;margin-bottom:1mm;}
.q .qtext{font-size:10.5pt;line-height:1.45;}
.answer{border:1px solid var(--line);border-top:none;padding:3.5mm 4mm;}
.answer .who{font-weight:bold;font-size:8.5pt;text-transform:uppercase;letter-spacing:1px;margin-bottom:1.5mm;}
.answer.mary .who{color:var(--mary);}
.answer.alice .who{color:var(--alice);}
.answer .resp{color:var(--ink);}
.assess{border:1px solid var(--line);border-top:none;border-radius:0 0 3px 3px;background:var(--soft);padding:3.5mm 4mm;}
.assess .who{font-weight:bold;font-size:8.5pt;text-transform:uppercase;letter-spacing:1px;color:var(--orange);margin-bottom:1.5mm;}
.grid2{display:table;width:100%;border-spacing:4mm 0;margin:2mm 0 4mm 0;}
.col{display:table-cell;width:50%;vertical-align:top;}
.card{border:1px solid var(--line);border-radius:3px;overflow:hidden;height:100%;}
.card .hd{padding:2.2mm 3.5mm;font-weight:bold;color:#fff;font-size:10pt;}
.card.mary .hd{background:var(--mary);}
.card.alice .hd{background:var(--alice);}
.card .bd{padding:3mm 3.5mm;}
.card .item{margin-bottom:3mm;}
.card .item:last-child{margin-bottom:0;}
.card .item .t{font-weight:bold;color:var(--navy);display:block;margin-bottom:0.5mm;}
.card .item .d{font-size:9pt;color:var(--muted);}
.badge{display:inline-block;font-size:8pt;font-weight:bold;padding:0.6mm 2.2mm;border-radius:2px;color:#fff;vertical-align:middle;}
.badge.hire{background:var(--mary);}
.badge.hold{background:var(--alice);}
.scorecard td.num{font-weight:bold;}
.scorecard tr.total td{background:var(--navy);color:#fff;font-weight:bold;}
.scorecard tr.total td:nth-child(even){background:var(--navy);}
.footer-note{font-size:8.5pt;color:var(--muted);margin-top:1mm;}
.pagebreak{page-break-before:always;}
ul{margin:0 0 3mm 0;padding-left:5mm;}
li{margin-bottom:1mm;}
.disclaimer{background:var(--soft);border-left:4px solid var(--navy);padding:3mm 4mm;font-size:9pt;color:var(--muted);margin:5mm 0 0 0;}
.body-page{padding:14mm 13mm 15mm 13mm;width:210mm;min-height:297mm;}
`;
