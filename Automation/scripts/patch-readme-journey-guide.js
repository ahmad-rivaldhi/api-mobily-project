const fs = require('fs');
const path = require('path');

const readmePath = path.join(__dirname, '..', '..', 'README.md');
let text = fs.readFileSync(readmePath, 'utf8');

const journeyGuideStart = text.indexOf('## ');
const marker = '**Journey Guide**';
const jStart = text.indexOf(marker);
if (jStart < 0) throw new Error('Journey Guide not found');
const sectionStart = text.lastIndexOf('## ', jStart);

const searchStart = text.indexOf('**Search By SAN');
const gettingStart = text.indexOf('**Getting Started**');
if (gettingStart < 0) throw new Error('Getting Started not found');

const newJourney = `## Journey Guide

Each \`folder.bru\` under \`Mobily/{Journey}/\` or \`OpenAccess/{Provider}/{Journey}/\` documents the step sequence. Shared steps always come from \`Shared-Workflows/\`.

| Journey | Mobily path | OpenAccess path | Toolkit examples |
|---------|-------------|-----------------|------------------|
| Activation | \`Mobily/Activation/\` | \`OpenAccess/{P}/Activation/\` | \`mobily-activation\`, \`stc-activation\` |
| Relocation | \`Mobily/Relocation/\` | \`OpenAccess/{P}/Relocation/\` | \`mobily-relocation\`, \`dawiyat-relocation\` |
| Device Swap | \`Mobily/Device-Swap/\` | \`OpenAccess/{P}/Device-Swap/\` | \`mobily-device-swap-cpe\` |
| Upgrade / Downgrade | \`Mobily/Upgrade|Downgrade/\` | \`OpenAccess/{P}/Upgrade|Downgrade/\` | \`mobily-upgrade\`, \`oa-downgrade\` |
| Suspend / Resume | \`Mobily/Suspend/\` | \`OpenAccess/{P}/Suspend|Resume/\` | \`dawiyat-suspend\`, \`stc-resume\` |
| Termination | \`Mobily/Termination/\` | \`OpenAccess/{P}/Termination/\` | \`mobily-termination\` |
| Rewiring | \`Mobily/Rewiring/\` | \`OpenAccess/{P}/Rewiring/\` | \`mobily-rewiring\` |
| Maintenance | \`Mobily/Maintenance/\` | \`OpenAccess/{P}/Maintenance/\` | \`stc-maintenance\` |
| Installation Failure | \`Mobily/Installation-Failure/\` | \`OpenAccess/{P}/Installation-Failure/\` | \`mobily-failure\`, \`stc-failure\` |
| Request Update | \`Mobily/Request-Update/\` | \`OpenAccess/{P}/Request-Update/\` | manual |
| Mesh Extender | \`Mobily/Mesh-Extender-Standalone/\` | \`OpenAccess/{P}/Mesh-Extender-Standalone/\` | manual |

Mobily field-work journeys compose: **create order → WFM-CPE (shared) → TMF641 → SingleView → WFM Step-09**.

OA activation uses provider ONT notifications under \`Activation/ONT-Installation/\` (no shared WFM CPE, no SV UAT step).

---

### `;

text = text.slice(0, sectionStart) + newJourney + text.slice(searchStart);

text = text.replace(
  /3\. \*\*Pick Your Journey\*\*[\s\S]*?Follow the numbered sub-folders in order\n/,
  `3. **Pick provider + journey**\n   - Mobily: \`Mobily/{Journey}/\`\n   - OpenAccess: \`OpenAccess/{Provider}/{Journey}/\`\n   - Read \`folder.bru\` for the full step table\n\n`,
);

text = text.replace(
  /4\. \*\*Execute APIs in Sequence\*\*[\s\S]*?Step-09\n/,
  `4. **Execute in order**\n   - Provider-specific create/notify steps first\n   - Then shared \`Shared-Workflows/\` steps as listed in folder docs\n\n`,
);

text = text.replace(
  /\*\*Organization:\*\* Journey-Centric \(reorganized from API-type grouping\)/,
  '**Organization:** Provider × Journey + Shared (March 2026 reorg)',
);

text = text.replace(
  /- \*\*Journey-centric organization\*\* ensures contextual correctness[\s\S]*?- Environment variables are shared across all journeys/,
  '- **Provider × Journey + Shared** — provider files grouped by journey; WFM/TMF641/SV centralized\n- Automation paths live in `Automation/constants/paths.js`\n- Environment variables are shared across all journeys',
);

fs.writeFileSync(readmePath, text);
console.log('Patched Journey Guide, Getting Started, Notes');
