import sys

def process(filepath):
    with open(filepath, "r") as f:
        content = f.read()

    helper = """
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
"""
    if "fetchAllRows" not in content:
        content = content.replace("import { supabase } from '../lib/supabase.js'", "import { supabase } from '../lib/supabase.js'\n" + helper)

    funcs = [
        "getClients", "getSessions", "getSessionsByClient",
        "getReports", "getTherapyCycles", "getContacts",
        "getContactsByClient", "getProfessionals",
        "getBillingReminders", "getBillingRemindersByClient"
    ]
    
    lines = content.split('\n')
    out_lines = []
    in_target_func = False
    brace_level = 0
    query_chain_active = False
    
    for i in range(len(lines)):
        line = lines[i]
        
        for fn in funcs:
            if line.startswith(f"export async function {fn}("):
                in_target_func = True
                brace_level = 0
                break
                
        if in_target_func:
            if "{" in line: brace_level += line.count("{")
            if "}" in line: brace_level -= line.count("}")
            
            if "const { data, error } = await supabase" in line:
                line = line.replace("await supabase", "await fetchAllRows(supabase")
                query_chain_active = True
                
            if line.strip().startswith("if (error) throw new Error") and query_chain_active:
                out_lines.append("    )")
                query_chain_active = False
                
            if brace_level == 0 and line.startswith("}"):
                in_target_func = False
                
        out_lines.append(line)
        
    with open(filepath, "w") as f:
        f.write("\n".join(out_lines))
    print(f"Patched {filepath}")

process('src/services/dataService.js')
process('src/services/billingReminderService.js')
