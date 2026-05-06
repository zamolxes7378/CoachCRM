const fs = require('fs')

function patchFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf8')

    const helper = `
// Helper to fetch all rows circumventing Supabase's max_rows API limit
async function fetchAllRows(queryBuilder) {
  let allData = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await queryBuilder.range(page * pageSize, (page + 1) * pageSize - 1);
    if (error) return { data: null, error };
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < pageSize) break;
    page++;
  }
  return { data: allData, error: null };
}
`
    if (!content.includes('fetchAllRows')) {
        content = content.replace("import { supabase } from '../lib/supabase.js'", "import { supabase } from '../lib/supabase.js'\n" + helper)
    }

    const pattern = /await supabase([\s\S]*?)\.limit\(10000\)/g
    content = content.replace(pattern, (match, p1) => {
        return `await fetchAllRows(supabase${p1})`
    })

    fs.writeFileSync(filepath, content)
    console.log(`Patched ${filepath}`)
}

patchFile('src/services/dataService.js')
patchFile('src/services/billingReminderService.js')
