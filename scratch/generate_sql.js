const fs = require('fs');

const dataStr = fs.readFileSync('/home/zamolxes/.gemini/antigravity/brain/ede88459-05fa-49ef-8ab9-b92db6dcb00d/.system_generated/steps/132/output.txt', 'utf8');

const start = dataStr.indexOf('[');
const end = dataStr.lastIndexOf(']');
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

let sql = '';

for (const c of clients) {
    let changed = false;
    let partnerA = { ...c.partner_a };
    let partnerB = { ...c.partner_b };

    // Special cases
    if (c.id.startsWith('035e6126')) {
        if (partnerA.firstName === 'PY') { partnerA.firstName = 'Pierre Yves'; changed = true; }
        if (partnerB.firstName === 'PY') { partnerB.firstName = 'Pierre Yves'; changed = true; }
    }
    
    if (c.id.startsWith('2c08ba46')) {
        if (partnerA.firstName === 'MELANIE') { partnerA.firstName = 'Mélanie'; changed = true; }
        if (partnerB.firstName === 'MELANIE') { partnerB.firstName = 'Mélanie'; changed = true; }
        if (partnerA.firstName === 'MICKAEL') { partnerA.firstName = 'Mickael'; changed = true; }
        if (partnerB.firstName === 'MICKAEL') { partnerB.firstName = 'Mickael'; changed = true; }
    }

    if (partnerA.firstName) {
        const ext = extractNames(partnerA.firstName);
        if (ext) {
            partnerA.firstName = ext.extractedFirstName;
            const oldLastName = partnerA.lastName ? partnerA.lastName.trim() : '';
            partnerA.lastName = oldLastName ? oldLastName + ' ' + ext.extractedLastName : ext.extractedLastName;
            changed = true;
        }
    }
    if (partnerB.firstName) {
        const ext = extractNames(partnerB.firstName);
        if (ext) {
            partnerB.firstName = ext.extractedFirstName;
            const oldLastName = partnerB.lastName ? partnerB.lastName.trim() : '';
            partnerB.lastName = oldLastName ? oldLastName + ' ' + ext.extractedLastName : ext.extractedLastName;
            changed = true;
        }
    }

    if (changed) {
        // Construct SQL statement
        const jsonA = JSON.stringify(partnerA).replace(/'/g, "''");
        const jsonB = JSON.stringify(partnerB).replace(/'/g, "''");
        sql += `UPDATE clients SET partner_a = '${jsonA}'::jsonb, partner_b = '${jsonB}'::jsonb WHERE id = '${c.id}';\n`;
    }
}

fs.writeFileSync('/home/zamolxes/devs/CoachCRM/scratch/updates.sql', sql);
console.log('SQL script generated');
