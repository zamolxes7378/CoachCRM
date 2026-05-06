const fs = require('fs');

const dataStr = fs.readFileSync('/home/zamolxes/.gemini/antigravity/brain/ede88459-05fa-49ef-8ab9-b92db6dcb00d/.system_generated/steps/132/output.txt', 'utf8');

const start = dataStr.indexOf('[');
const end = dataStr.lastIndexOf(']');
if (start === -1 || end === -1) {
    console.error("Could not find array");
    process.exit(1);
}

const jsonStr = dataStr.substring(start, end + 1);
const clients = JSON.parse(jsonStr);

function extractNames(str) {
    if (!str) return null;
    const words = str.split(/\s+/);
    const lastNames = [];
    const firstNames = [];
    for (const w of words) {
        if (w === '') continue;
        if (w.toUpperCase() === w && /[A-ZÀ-Ÿ]/.test(w)) {
            lastNames.push(w);
        } else {
            firstNames.push(w);
        }
    }
    if (lastNames.length > 0 && firstNames.length > 0) {
        return {
            extractedLastName: lastNames.join(' '),
            extractedFirstName: firstNames.join(' ')
        };
    }
    return null;
}

let md = `# Proposition de Normalisation des Noms/Prénoms\n\nVoici les cas détectés :\n\n| Client ID | P | Prénom Actuel | Nom Actuel | => Nouveau Prénom | => Nouveau Nom |\n|-----------|---|---------------|------------|-------------------|----------------|\n`;

let count = 0;

for (const c of clients) {
    if (c.partner_a && c.partner_a.firstName) {
        const ext = extractNames(c.partner_a.firstName);
        if (ext) {
            const oldLastName = c.partner_a.lastName ? c.partner_a.lastName.trim() : '';
            const newLastName = oldLastName ? oldLastName + ' ' + ext.extractedLastName : ext.extractedLastName;
            md += `| \`${c.id.split('-')[0]}\` | A | ${c.partner_a.firstName} | ${oldLastName || '*vide*'} | **${ext.extractedFirstName}** | **${newLastName}** |\n`;
            count++;
        }
    }
    if (c.partner_b && c.partner_b.firstName) {
        const ext = extractNames(c.partner_b.firstName);
        if (ext) {
            const oldLastName = c.partner_b.lastName ? c.partner_b.lastName.trim() : '';
            const newLastName = oldLastName ? oldLastName + ' ' + ext.extractedLastName : ext.extractedLastName;
            md += `| \`${c.id.split('-')[0]}\` | B | ${c.partner_b.firstName} | ${oldLastName || '*vide*'} | **${ext.extractedFirstName}** | **${newLastName}** |\n`;
            count++;
        }
    }
}

fs.writeFileSync('/home/zamolxes/.gemini/antigravity/brain/ede88459-05fa-49ef-8ab9-b92db6dcb00d/artifacts/proposed_changes.md', md);
console.log("Created with", count);
