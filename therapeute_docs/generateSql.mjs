import pkg from 'xlsx';
const { readFile, utils } = pkg;
import fs from 'fs';
import crypto from 'crypto';

const USER_ID = '4a273b15-4d0b-4f24-b035-10428271cfb3';
const clientsData = [];
const sessionsData = [];

// Helper: Excel date to ISO
function excelDateToJSDate(serial) {
  if (typeof serial !== 'number') {
    // try to parse "DD/MM/YY" or "DD/MM/YYYY"
    if (typeof serial === 'string' && serial.includes('/')) {
      const parts = serial.split('/');
      if (parts.length === 3) {
        let year = parseInt(parts[2]);
        if (year < 100) year += 2000;
        return new Date(Date.UTC(year, parseInt(parts[1]) - 1, parseInt(parts[0])));
      }
    }
    return null;
  }
  const utc_days  = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;                                        
  const date_info = new Date(utc_value * 1000);
  const fractional_day = serial - Math.floor(serial) + 0.0000001;
  let total_seconds = Math.floor(86400 * fractional_day);
  const seconds = total_seconds % 60;
  total_seconds -= seconds;
  const hours = Math.floor(total_seconds / (60 * 60));
  const minutes = Math.floor(total_seconds / 60) % 60;
  return new Date(Date.UTC(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds));
}

// 1. Parse Clients
const wbClients = readFile('FICHIER CLIENTS (1).ods');
const wsClients = wbClients.Sheets['FICHIER_CLIENTS_LISTE_'];
const rawClients = utils.sheet_to_json(wsClients, { header: 1 });

const clientsMap = new Map(); // nameKey -> clientObj

// skip headers
for (let i = 1; i < rawClients.length; i++) {
  const row = rawClients[i];
  if (!row || row.length < 3) continue;
  
  const nom = row[2] ? row[2].toString().trim().toUpperCase() : '';
  const prenom = row[3] ? row[3].toString().trim() : '';
  if (!nom && !prenom) continue;

  const phone = row[7] ? row[7].toString().trim() : null;
  const email = row[8] ? row[8].toString().trim() : null;
  let source = row[11] ? row[11].toString().trim() : null;
  if (source === 'T' || source === 't') source = 'Téléphone';

  const isCoupleStr = nom.includes(' ET ') || prenom.toLowerCase().includes(' et ');
  
  const partnerA = {
    firstName: prenom,
    lastName: nom,
    phone: phone,
    email: email
  };

  // Group by "NOM" if consecutive or if multiple rows have same NOM
  const existing = clientsMap.get(nom);
  if (existing) {
    existing.type = 'client';
    if (!existing.partner_b) {
      existing.partner_b = partnerA;
    }
  } else {
    clientsMap.set(nom, {
      id: crypto.randomUUID(),
      nom: nom,
      prenom: prenom,
      type: isCoupleStr ? 'client' : 'individual',
      partner_a: partnerA,
      partner_b: null,
      source: source,
      phone: phone,
      email: email,
      notes: ''
    });
  }
}

// Parse HOME WORK notes
for (const sheetName of wbClients.SheetNames) {
  if (sheetName === 'FICHIER_CLIENTS_LISTE_') continue;
  
  // Find matching client
  let matchedClient = null;
  for (const [nom, c] of clientsMap.entries()) {
    if (sheetName.toUpperCase().includes(nom)) {
      matchedClient = c;
      break;
    }
  }
  
  if (matchedClient) {
    const ws = wbClients.Sheets[sheetName];
    const data = utils.sheet_to_json(ws, { header: 1 });
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[1]) {
        let dateStr = '';
        if (row[0]) {
          const d = excelDateToJSDate(row[0]);
          if (d) dateStr = `[${d.toISOString().split('T')[0]}] `;
        }
        matchedClient.notes += `${dateStr}${row[1]}\n`;
      }
    }
  }
}

// Helper to fuzzy match client names
function findClient(rawName) {
  if (!rawName) return null;
  const upper = rawName.toString().toUpperCase();
  for (const [nom, c] of clientsMap.entries()) {
    if (upper.includes(nom) || nom.includes(upper)) return c;
  }
  return null;
}

// 2. Parse RDVs
const rdvFiles = fs.readdirSync('.').filter(f => f.startsWith('RDV') && f.endsWith('.ods'));
for (const file of rdvFiles) {
  const wb = readFile(file);
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const data = utils.sheet_to_json(ws, { header: 1 });
    
    // find headers
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(10, data.length); i++) {
      if (data[i] && data[i].includes('NOM')) {
        headerRowIdx = i;
        break;
      }
    }
    
    if (headerRowIdx === -1) continue;
    const headers = data[headerRowIdx];
    const colNom = headers.findIndex(h => typeof h === 'string' && h.trim() === 'NOM');
    const colDate = headers.findIndex(h => typeof h === 'string' && h.trim().includes('DATE DE RDV'));
    const colHeure = headers.findIndex(h => typeof h === 'string' && h.trim().includes('HEURE RDV'));
    const colDuree = headers.findIndex(h => typeof h === 'string' && h.trim() === 'DUREE');
    const colVisio = headers.findIndex(h => typeof h === 'string' && h.trim().includes('VISIO'));
    const colPresent = headers.findIndex(h => typeof h === 'string' && h.trim().includes('PRESENT'));
    const colReglement = headers.findIndex(h => typeof h === 'string' && h.trim().includes('COMPTANT'));
    const colReglementAttente = headers.findIndex(h => typeof h === 'string' && h.trim().includes('ATTENTE'));
    const colFacture = headers.findIndex(h => typeof h === 'string' && h.trim().includes('FACTURE'));
    const colCR = headers.findIndex(h => typeof h === 'string' && h.trim() === 'CR');
    const colAnnul = headers.findIndex(h => typeof h === 'string' && h.trim().includes('ANNUL'));

    for (let i = headerRowIdx + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 3) continue;
      
      const rawName = row[colNom];
      if (!rawName || typeof rawName !== 'string' || rawName === '/' || rawName.includes('OBJ 3975')) continue;
      
      let client = findClient(rawName);
      if (!client) {
        // Create missing client
        client = {
          id: crypto.randomUUID(),
          nom: rawName.toUpperCase().trim(),
          type: rawName.toLowerCase().includes(' et ') ? 'client' : 'individual',
          partner_a: { firstName: rawName.trim(), lastName: '' },
          partner_b: null,
          source: null,
          phone: null,
          email: null,
          notes: ''
        };
        clientsMap.set(client.nom, client);
      }

      // Date parsing
      let d = null;
      if (colDate !== -1 && row[colDate]) {
        d = excelDateToJSDate(row[colDate]);
      }
      if (!d) {
        // approximate date from sheet name
        const match = sheetName.match(/(JANVIER|FEVRIER|MARS|AVRIL|MAI|JUIN|JUILLET|AOUT|SEPTEMBRE|OCTOBRE|NOVEMBRE|DECEMBRE)\s+(\d{4})/i);
        if (match) {
          const months = ['JANVIER','FEVRIER','MARS','AVRIL','MAI','JUIN','JUILLET','AOUT','SEPTEMBRE','OCTOBRE','NOVEMBRE','DECEMBRE'];
          const m = months.indexOf(match[1].toUpperCase());
          d = new Date(Date.UTC(parseInt(match[2]), m, 1, 10, 0, 0));
        } else {
          d = new Date();
        }
      }
      
      // Heure
      if (colHeure !== -1 && row[colHeure] && typeof row[colHeure] === 'string') {
        const timeMatch = row[colHeure].match(/(\d{1,2})[Hh:](\d{2})/);
        if (timeMatch) {
          d.setUTCHours(parseInt(timeMatch[1]));
          d.setUTCMinutes(parseInt(timeMatch[2]));
        }
      }

      // Duration
      let duration = 60;
      if (colDuree !== -1 && row[colDuree]) {
        const val = row[colDuree];
        if (typeof val === 'number') {
          if (val < 10) duration = val * 60; // e.g. 1.5 -> 90
          else duration = val;
        } else if (typeof val === 'string') {
          const m = val.match(/(\d{1,2})[Hh](\d{2})/);
          if (m) duration = parseInt(m[1]) * 60 + parseInt(m[2]);
        }
      }

      // Status
      let status = 'scheduled';
      if (colPresent !== -1 && (row[colPresent] === 1 || row[colPresent] === '1' || row[colPresent] === 'OK')) status = 'completed';
      if (colVisio !== -1 && (row[colVisio] === 1 || row[colVisio] === '1')) status = 'completed';
      if (colAnnul !== -1 && row[colAnnul] && row[colAnnul] !== '/' && row[colAnnul] !== 0) status = 'cancelled';
      if (d < new Date() && status === 'scheduled') status = 'completed';

      // Payments
      let paymentAmount = 0;
      let paymentMethod = null;
      let paymentStatus = 'pending';
      let hasReport = false;

      if (colReglement !== -1 && row[colReglement] && row[colReglement] !== '/') {
        const val = row[colReglement];
        if (typeof val === 'number') paymentAmount = val;
        else if (typeof val === 'string' && val.includes('ESP')) { paymentAmount = parseInt(val.replace(/\D/g, '')) || 70; paymentMethod = 'especes'; }
        else if (typeof val === 'string' && val.includes('CHQ')) { paymentAmount = parseInt(val.replace(/\D/g, '')) || 70; paymentMethod = 'cheque'; }
        else if (typeof val === 'string' && val.includes('VIR')) { paymentAmount = parseInt(val.replace(/\D/g, '')) || 70; paymentMethod = 'virement'; }
        paymentStatus = 'paid';
      }
      
      if (paymentAmount === 0 && colReglementAttente !== -1 && row[colReglementAttente] && row[colReglementAttente] !== '/') {
        const val = row[colReglementAttente];
        if (typeof val === 'number') paymentAmount = val;
        paymentStatus = 'pending';
      }

      if (colCR !== -1 && (row[colCR] === 'OK' || row[colCR] === 1 || row[colCR] === '1')) hasReport = true;

      // Fallback if date is invalid
      if (!d || isNaN(d)) {
        d = new Date();
      }

      sessionsData.push({
        id: crypto.randomUUID(),
        client_id: client.id,
        user_id: USER_ID,
        date: d.toISOString(),
        duration: duration,
        status: status,
        phase: 'début',
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        payment_amount: paymentAmount > 0 ? paymentAmount : null,
        has_report: hasReport
      });
    }
  }
}

// Generate SQL
let sql = `BEGIN;\n\n`;

// 0. Clean up existing test data for this user
sql += `-- Nettoyage des données de test existantes\n`;
sql += `DELETE FROM reports WHERE client_id IN (SELECT id FROM clients WHERE user_id = '${USER_ID}');\n`;
sql += `DELETE FROM contacts WHERE user_id = '${USER_ID}';\n`;
sql += `DELETE FROM sessions WHERE user_id = '${USER_ID}';\n`;
sql += `DELETE FROM therapy_cycles WHERE user_id = '${USER_ID}';\n`;
sql += `UPDATE clients SET referred_by = NULL WHERE user_id = '${USER_ID}';\n`;
sql += `DELETE FROM clients WHERE user_id = '${USER_ID}';\n\n`;

sql += `-- Importation des nouveaux clients\n`;
for (const c of clientsMap.values()) {
  const safePartnerA = JSON.stringify(c.partner_a).replace(/'/g, "''");
  const safePartnerB = c.partner_b ? `'${JSON.stringify(c.partner_b).replace(/'/g, "''")}'` : 'null';
  const safeNotes = c.notes.replace(/'/g, "''");
  const safeSource = c.source ? `'${c.source.replace(/'/g, "''")}'` : 'null';
  
  sql += `INSERT INTO clients (id, user_id, type, partner_a, partner_b, source, status, notes, created_at, updated_at) VALUES ('${c.id}', '${USER_ID}', '${c.type}', '${safePartnerA}', ${safePartnerB}, ${safeSource}, 'active', '${safeNotes}', NOW(), NOW());\n`;
}

for (const s of sessionsData) {
  const safePayMethod = s.payment_method ? `'${s.payment_method}'` : 'null';
  const safePayAmount = s.payment_amount !== null ? s.payment_amount : 'null';
  
  sql += `INSERT INTO sessions (id, client_id, user_id, date, duration, status, phase, payment_method, payment_status, payment_amount, has_report, created_at) VALUES ('${s.id}', '${s.client_id}', '${s.user_id}', '${s.date}', ${s.duration}, '${s.status}', '${s.phase}', ${safePayMethod}, '${s.payment_status}', ${safePayAmount}, ${s.has_report}, NOW());\n`;
}

sql += `COMMIT;\n`;

fs.writeFileSync('import.sql', sql);
console.log(`Generated import.sql with ${clientsMap.size} clients and ${sessionsData.length} sessions.`);
