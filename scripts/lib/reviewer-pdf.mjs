import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const EU_REVIEWER_HTML_REL_PATH = "compliance/eu-ai-act-reviewer.html";
export const EU_REVIEWER_MARKDOWN_REL_PATH = "compliance/eu-ai-act-reviewer.md";
export const EU_REVIEWER_PDF_REL_PATH = "compliance/eu-ai-act-reviewer.pdf";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const PAGE_MARGIN_X = 50;
const PAGE_MARGIN_TOP = 64;
const PAGE_MARGIN_BOTTOM = 56;
const FOOTER_HEIGHT = 18;
const FOOTER_Y = 24;
const PAGE_NUMBER_X = 470;
const REVIEWER_PDF_TITLE = "EU AI Act reviewer pack";
const REVIEWER_PDF_SUBJECT = "Reviewer-first EU AI Act dossier surface";
const REVIEWER_PDF_AUTHOR = "Agent QA Toolkit";
const REVIEWER_PDF_KEYWORDS = "EU AI Act, Annex IV, reviewer pack, evidence, dossier";

const STYLE_MAP = {
  h1: { font: "F2", fontSize: 18, lineHeight: 24, maxChars: 56 },
  h2: { font: "F2", fontSize: 14, lineHeight: 20, maxChars: 72 },
  h3: { font: "F2", fontSize: 11, lineHeight: 16, maxChars: 92 },
  bullet: { font: "F1", fontSize: 10, lineHeight: 14, maxChars: 100 },
  body: { font: "F1", fontSize: 10, lineHeight: 14, maxChars: 100 },
  blank: { font: "F1", fontSize: 10, lineHeight: 10, maxChars: 0 },
};

function escapePdfText(value) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function pdfDate(value = new Date()) {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  const hours = String(value.getUTCHours()).padStart(2, "0");
  const minutes = String(value.getUTCMinutes()).padStart(2, "0");
  const seconds = String(value.getUTCSeconds()).padStart(2, "0");
  return `D:${year}${month}${day}${hours}${minutes}${seconds}Z`;
}

function normalizeMarkdownLine(line) {
  return line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 <$2>").replace(/\s+/g, " ").trim();
}

function wrapText(text, maxChars) {
  if (!text || text.length <= maxChars) return [text];
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }
    if (current) {
      lines.push(current);
      current = word;
      continue;
    }
    lines.push(word.slice(0, maxChars));
    current = word.slice(maxChars);
  }
  if (current) lines.push(current);
  return lines;
}

function markdownToLayoutLines(markdown) {
  const lines = [];
  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = normalizeMarkdownLine(rawLine);
    if (!line) {
      lines.push({ style: "blank", text: "" });
      continue;
    }
    if (line.startsWith("# ")) {
      const heading = line.slice(2).trim();
      for (const [index, wrapped] of wrapText(heading, STYLE_MAP.h1.maxChars).entries()) {
        lines.push({
          style: "h1",
          text: wrapped,
          ...(index === 0 ? { outline: { level: 1, title: heading } } : {}),
        });
      }
      continue;
    }
    if (line.startsWith("## ")) {
      const heading = line.slice(3).trim();
      for (const [index, wrapped] of wrapText(heading, STYLE_MAP.h2.maxChars).entries()) {
        lines.push({
          style: "h2",
          text: wrapped,
          ...(index === 0 ? { outline: { level: 2, title: heading } } : {}),
        });
      }
      continue;
    }
    if (line.startsWith("### ")) {
      const heading = line.slice(4).trim();
      for (const [index, wrapped] of wrapText(heading, STYLE_MAP.h3.maxChars).entries()) {
        lines.push({
          style: "h3",
          text: wrapped,
          ...(index === 0 ? { outline: { level: 3, title: heading } } : {}),
        });
      }
      continue;
    }
    if (line.startsWith("- ")) {
      const bulletLines = wrapText(line.slice(2).trim(), STYLE_MAP.bullet.maxChars - 2);
      bulletLines.forEach((wrapped, index) => {
        lines.push({ style: "bullet", text: index === 0 ? `• ${wrapped}` : `  ${wrapped}` });
      });
      continue;
    }
    for (const wrapped of wrapText(line, STYLE_MAP.body.maxChars)) {
      lines.push({ style: "body", text: wrapped });
    }
  }
  return lines;
}

function extractPdfTitle(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() || REVIEWER_PDF_TITLE;
}

function paginateLines(lines) {
  const pages = [];
  const outlineEntries = [];
  let currentPage = [];
  let currentY = PAGE_HEIGHT - PAGE_MARGIN_TOP;

  for (const line of lines) {
    const style = STYLE_MAP[line.style];
    if (currentY - style.lineHeight < PAGE_MARGIN_BOTTOM + FOOTER_HEIGHT) {
      pages.push(currentPage);
      currentPage = [];
      currentY = PAGE_HEIGHT - PAGE_MARGIN_TOP;
    }
    const pageIndex = pages.length;
    const pageLine = {
      font: style.font,
      fontSize: style.fontSize,
      x: PAGE_MARGIN_X,
      y: currentY,
      text: line.text,
    };
    currentPage.push(pageLine);
    if (line.outline && line.outline.level <= 2) {
      outlineEntries.push({
        level: line.outline.level,
        title: line.outline.title,
        pageIndex,
        y: currentY,
      });
    }
    currentY -= style.lineHeight;
  }

  if (currentPage.length === 0) {
    currentPage.push({
      font: STYLE_MAP.body.font,
      fontSize: STYLE_MAP.body.fontSize,
      x: PAGE_MARGIN_X,
      y: PAGE_HEIGHT - PAGE_MARGIN_TOP,
      text: "",
    });
  }
  pages.push(currentPage);

  pages.forEach((page, index) => {
    page.push({
      font: STYLE_MAP.body.font,
      fontSize: 9,
      x: PAGE_NUMBER_X,
      y: FOOTER_Y,
      text: `Page ${index + 1} of ${pages.length}`,
    });
  });

  return { pages, outlineEntries };
}

function buildOutlineTree(entries) {
  const root = { children: [] };
  const stack = [root];

  for (const entry of entries) {
    const node = { ...entry, children: [] };
    while (stack.length > 1) {
      const parent = stack[stack.length - 1];
      if ((parent.level || 0) < entry.level) break;
      stack.pop();
    }
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  }

  return root;
}

function countVisibleDescendants(node) {
  if (!node.children || node.children.length === 0) return 0;
  return node.children.length + node.children.reduce((sum, child) => sum + countVisibleDescendants(child), 0);
}

function buildPdf(pages, outlineEntries, metadata = {}) {
  const title = metadata.title || REVIEWER_PDF_TITLE;
  const subject = metadata.subject || REVIEWER_PDF_SUBJECT;
  const keywords = metadata.keywords || REVIEWER_PDF_KEYWORDS;
  const objects = [];

  const addObject = (body = "") => {
    const objectId = objects.length + 1;
    objects.push(`${objectId} 0 obj\n${body}\nendobj\n`);
    return objectId;
  };
  const setObject = (objectId, body) => {
    objects[objectId - 1] = `${objectId} 0 obj\n${body}\nendobj\n`;
  };

  const fontRegularId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontBoldId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  const pageIds = [];
  const contentIds = [];

  for (const page of pages) {
    const content = page
      .map((line) => {
        const text = escapePdfText(line.text);
        return `BT /${line.font} ${line.fontSize} Tf ${line.x} ${line.y} Td (${text}) Tj ET`;
      })
      .join("\n");
    const contentBuffer = Buffer.from(content, "utf8");
    const contentId = addObject(`<< /Length ${contentBuffer.length} >>\nstream\n${content}\nendstream`);
    contentIds.push(contentId);
    pageIds.push(null);
  }

  const pagesId = addObject("<< /Type /Pages /Kids [] /Count 0 >>");

  for (let index = 0; index < pages.length; index += 1) {
    const pageId = addObject(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
        `/Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> ` +
        `/Contents ${contentIds[index]} 0 R >>`
    );
    pageIds[index] = pageId;
  }

  setObject(pagesId, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);

  const outlineRoot = buildOutlineTree(outlineEntries);
  let outlinesId = null;
  if (outlineRoot.children.length > 0) {
    outlinesId = addObject();
    const assignIds = (node) => {
      node.id = addObject();
      for (const child of node.children) assignIds(child);
    };
    for (const child of outlineRoot.children) assignIds(child);

    const writeOutlineNode = (node, parentId, siblings) => {
      const index = siblings.indexOf(node);
      const prev = index > 0 ? siblings[index - 1].id : null;
      const next = index < siblings.length - 1 ? siblings[index + 1].id : null;
      const firstChild = node.children[0]?.id || null;
      const lastChild = node.children[node.children.length - 1]?.id || null;
      const openCount = countVisibleDescendants(node);
      const pageId = pageIds[node.pageIndex];
      const body = [
        `<< /Title (${escapePdfText(node.title)})`,
        `/Parent ${parentId} 0 R`,
        prev ? `/Prev ${prev} 0 R` : "",
        next ? `/Next ${next} 0 R` : "",
        firstChild ? `/First ${firstChild} 0 R` : "",
        lastChild ? `/Last ${lastChild} 0 R` : "",
        openCount > 0 ? `/Count ${openCount}` : "",
        `/Dest [${pageId} 0 R /XYZ ${PAGE_MARGIN_X} ${Math.round(node.y)} null]`,
        ">>",
      ]
        .filter(Boolean)
        .join(" ");
      setObject(node.id, body);
      for (const child of node.children) {
        writeOutlineNode(child, node.id, node.children);
      }
    };

    for (const child of outlineRoot.children) {
      writeOutlineNode(child, outlinesId, outlineRoot.children);
    }
    setObject(
      outlinesId,
      `<< /Type /Outlines /First ${outlineRoot.children[0].id} 0 R /Last ${
        outlineRoot.children[outlineRoot.children.length - 1].id
      } 0 R /Count ${countVisibleDescendants(outlineRoot)} >>`
    );
  }

  const infoId = addObject(
    `<< /Title (${escapePdfText(title)}) /Author (${escapePdfText(REVIEWER_PDF_AUTHOR)}) ` +
      `/Subject (${escapePdfText(subject)}) /Keywords (${escapePdfText(keywords)}) ` +
      `/Creator (${escapePdfText(REVIEWER_PDF_AUTHOR)}) /Producer (${escapePdfText(REVIEWER_PDF_AUTHOR)}) ` +
      `/CreationDate (${pdfDate()}) /ModDate (${pdfDate()}) >>`
  );
  const catalogId = addObject(
    `<< /Type /Catalog /Pages ${pagesId} 0 R ${
      outlinesId ? `/Outlines ${outlinesId} 0 R /PageMode /UseOutlines` : ""
    } /ViewerPreferences << /DisplayDocTitle true >> >>`
  );

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += object;
  }
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return pdf;
}

export function renderEuReviewerPdf(reportDir) {
  const markdownAbs = path.join(reportDir, EU_REVIEWER_MARKDOWN_REL_PATH);
  const pdfAbs = path.join(reportDir, EU_REVIEWER_PDF_REL_PATH);
  return renderEuReviewerPdfFromPaths(markdownAbs, pdfAbs);
}

export function renderEuReviewerPdfFromPaths(markdownAbs, pdfAbs) {
  const markdown = readFileSync(markdownAbs, "utf8");
  const layoutLines = markdownToLayoutLines(markdown);
  const { pages, outlineEntries } = paginateLines(layoutLines);
  const title = extractPdfTitle(markdown);
  const pdf = buildPdf(pages, outlineEntries, {
    title,
    subject: title,
  });

  mkdirSync(path.dirname(pdfAbs), { recursive: true });
  writeFileSync(pdfAbs, pdf, "binary");

  return {
    renderer: "built-in-pdf-writer",
    pdfRelPath: pdfAbs.endsWith(EU_REVIEWER_PDF_REL_PATH) ? EU_REVIEWER_PDF_REL_PATH : pdfAbs,
    pdfAbsPath: pdfAbs,
    pages: pages.length,
    outlineEntries: outlineEntries.length,
  };
}
