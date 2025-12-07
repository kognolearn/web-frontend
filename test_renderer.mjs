
import { normalizeLatex } from './utils/richText.js';

function parseContent(content) {
  if (!content) return [];
  
  // Content should already have proper newlines from JSON parsing
  // Only normalize Windows line endings
  let normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Normalize double-escaped backslashes from JSON (\\( -> \(, \\[ -> \[, etc.)
  // This handles cases where content has \\( instead of \( for inline math
  normalizedContent = normalizedContent
    .replace(/\\\\(\(|\))/g, '\\$1')  // \\( -> \(, \\) -> \)
    .replace(/\\\\(\[|\])/g, '\\$1')  // \\[ -> \[, \\] -> \]
    .replace(/\\\\mathbf/g, '\\mathbf')
    .replace(/\\\\mathbb/g, '\\mathbb')
    .replace(/\\\\lambda/g, '\\lambda')
    .replace(/\\\\begin/g, '\\begin')
    .replace(/\\\\end/g, '\\end')
    .replace(/\\\\frac/g, '\\frac')
    .replace(/\\\\sqrt/g, '\\sqrt')
    .replace(/\\\\sum/g, '\\sum')
    .replace(/\\\\int/g, '\\int')
    .replace(/\\\\cdot/g, '\\cdot')
    .replace(/\\\\times/g, '\\times')
    .replace(/\\\\pm/g, '\\pm')
    .replace(/\\\\neq/g, '\\neq')
    .replace(/\\\\leq/g, '\\leq')
    .replace(/\\\\geq/g, '\\geq')
    .replace(/\\\\infty/g, '\\infty')
    .replace(/\\\\alpha/g, '\\alpha')
    .replace(/\\\\beta/g, '\\beta')
    .replace(/\\\\gamma/g, '\\gamma')
    .replace(/\\\\delta/g, '\\delta')
    .replace(/\\\\theta/g, '\\theta')
    .replace(/\\\\pi/g, '\\pi')
    .replace(/\\\\sigma/g, '\\sigma')
    .replace(/\\\\mu/g, '\\mu')
    .replace(/\\\\epsilon/g, '\\epsilon')
    .replace(/\\\\text/g, '\\text')
    .replace(/\\\\quad/g, '\\quad')
    .replace(/\\\\qquad/g, '\\qquad')
    .replace(/\\\\left/g, '\\left')
    .replace(/\\\\right/g, '\\right');
  
  normalizedContent = normalizeLatex(normalizedContent);
  
  const blocks = [];
  const lines = normalizedContent.split("\n");
  
  let i = 0;
  
  // Helper to consume lines for multi-line blocks
  const consumeUntil = (startIdx, endCondition) => {
    const collected = [];
    let j = startIdx;
    while (j < lines.length && !endCondition(lines[j], j)) {
      collected.push(lines[j]);
      j++;
    }
    return { collected, endIdx: j };
  };
  
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Empty line
    if (!trimmed) {
      i++;
      continue;
    }

    // Block math ($$...$$ or \[...\])
    const isDollarBlock = trimmed.startsWith("$$");
    const isBracketBlock = trimmed.startsWith("\\[");
    
    if (isDollarBlock || isBracketBlock) {
      const startMarker = isDollarBlock ? "$$" : "\\[";
      const endMarker = isDollarBlock ? "$$" : "\\]";
      const sliceStart = 2; // Both are 2 chars
      const sliceEnd = -2; // Both are 2 chars

      if (trimmed.endsWith(endMarker) && trimmed.length > 4) {
        // Single line block math
        blocks.push({
          type: "block-math",
          content: trimmed.slice(sliceStart, sliceEnd).trim(),
        });
        i++;
        continue;
      } else {
        // Multi-line block math
        const { collected, endIdx } = consumeUntil(i + 1, (l) => l.trim().endsWith(endMarker));
        const mathContent = [trimmed.slice(sliceStart), ...collected];
        if (endIdx < lines.length) {
          const lastLine = lines[endIdx].trim();
          mathContent.push(lastLine.slice(0, sliceEnd));
        }
        blocks.push({
          type: "block-math",
          content: mathContent.join("\n").trim(),
        });
        i = endIdx + 1;
        continue;
      }
    }
    
    // Default: paragraph
    blocks.push({
        type: "paragraph",
        content: line
    });
    i++;
  }
  
  return blocks;
}

const input = `
**Step 1: Row Reduce to REF**
\\[
\\begin{bmatrix}
1 & 2 & 0 & 1 \\\\
2 & 4 & 1 & 4 \\\\
3 & 6 & 1 & 5
\\end{bmatrix}
\\xrightarrow{R_{2} - 2R_{1}, R_{3} - 3R_{1}}
\\begin{bmatrix}
1 & 2 & 0 & 1 \\\\
0 & 0 & 1 & 2 \\\\
0 & 0 & 1 & 2
\\end{bmatrix}
\\]
`;

console.log(JSON.stringify(parseContent(input), null, 2));
