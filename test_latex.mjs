
import { normalizeLatex } from './utils/richText.js';

const input = `
**Step 1: Row Reduce to REF**
\\\\[
\\begin{bmatrix}
1 & 2 & 0 & 1 \\\\
2 & 4 & 1 & 4 \\\\
3 & 6 & 1 & 5
\\end{bmatrix}
\\\\]
`;

console.log("Input:");
console.log(input);
console.log("\nOutput:");
console.log(normalizeLatex(input));
