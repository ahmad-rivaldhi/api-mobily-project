const fs = require('fs');
const path = require('path');

const readmePath = path.join(__dirname, '..', '..', 'README.md');
const lines = fs.readFileSync(readmePath, 'utf8').split(/\r?\n/);

let start = -1;
let end = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('**Project Structure**') && start === -1) {
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].trim() === '```') {
        start = j;
        break;
      }
    }
  }
  if (start >= 0 && end === -1 && i > start && lines[i].trim() === '```') {
    end = i;
    break;
  }
}

if (start < 0 || end < 0) {
  console.error('Could not find structure block', { start, end });
  process.exit(1);
}

const newBlock = `\`\`\`
FTTH - Mobily - Project/
├── environments/
├── Authentication/
├── Mobily/                      # Mobily × journey
├── OpenAccess/                  # STC | ITC | ACES | DOWIYAT × journey
├── Shared-Workflows/            # WFM-CPE, WFM-ME, TMF641, SingleView
├── Search-By-SAN-CPE/
├── Automation/
└── Documentation/

**Where to put new requests**

| Request type | Folder |
|--------------|--------|
| Mobily TMF622 per journey | \`Mobily/{Journey}/\` |
| OA TMF622 / OA notifications | \`OpenAccess/{Provider}/{Journey}/\` |
| WFM, TMF641, SingleView | \`Shared-Workflows/\` |
\`\`\``.split('\n');

const out = [...lines.slice(0, start), ...newBlock, ...lines.slice(end + 1)];
fs.writeFileSync(readmePath, out.join('\n'));
console.log(`Patched README lines ${start + 1}-${end + 1}`);
