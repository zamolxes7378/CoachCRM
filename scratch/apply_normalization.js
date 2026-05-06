const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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

async function run() {
  const { data: clients, error } = await supabase.from('clients').select('*');
  if (error) {
    console.error('Error fetching clients:', error);
    return;
  }
  
  let updatedCount = 0;
  for (const c of clients) {
    let changed = false;
    let partnerA = c.partner_a || {};
    let partnerB = c.partner_b || {};
    
    // Special cases
    if (c.id.startsWith('035e6126')) {
        if (partnerA.firstName === 'PY') {
            partnerA.firstName = 'Pierre Yves';
            changed = true;
        }
        if (partnerB.firstName === 'PY') {
            partnerB.firstName = 'Pierre Yves';
            changed = true;
        }
    }
    
    if (c.id.startsWith('2c08ba46')) {
        if (partnerA.firstName === 'MELANIE') {
            partnerA.firstName = 'Mélanie';
            changed = true;
        }
        if (partnerB.firstName === 'MELANIE') {
            partnerB.firstName = 'Mélanie';
            changed = true;
        }
        if (partnerA.firstName === 'MICKAEL') {
            partnerA.firstName = 'Mickael';
            changed = true;
        }
        if (partnerB.firstName === 'MICKAEL') {
            partnerB.firstName = 'Mickael';
            changed = true;
        }
    }

    // Normalization rule
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
        const { error: updateError } = await supabase.from('clients')
            .update({ partner_a: partnerA, partner_b: partnerB })
            .eq('id', c.id);
            
        if (updateError) {
            console.error(`Error updating ${c.id}:`, updateError);
        } else {
            console.log(`Updated client ${c.id}`);
            updatedCount++;
        }
    }
  }
  
  console.log(`Finished. Updated ${updatedCount} clients.`);
}

run();
