import re

with open('/home/zamolxes/.gemini/antigravity/brain/ede88459-05fa-49ef-8ab9-b92db6dcb00d/proposed_normalization.md', 'r') as f:
    lines = f.readlines()

sql_stmts = []

for line in lines:
    if line.startswith('| `'):
        # Format: | `96c29a4a` | B | Sébastien DELAFOSSE | *(vide)* | **Sébastien** | **DELAFOSSE** |
        parts = [p.strip() for p in line.split('|')]
        # Parts: '', '`96c29a4a`', 'B', 'Sébastien DELAFOSSE', '*(vide)*', '**Sébastien**', '**DELAFOSSE**', ''
        if len(parts) >= 8:
            short_id = parts[1].replace('`', '')
            partner = parts[2]
            new_first = parts[5].replace('**', '').replace("'", "''")
            new_last = parts[6].replace('**', '').replace("'", "''")
            
            # Special manual case from user: 035e6126 -> Pierre Yves
            if short_id == '035e6126' and new_first == 'PY':
                new_first = 'Pierre Yves'
            if short_id == '2c08ba46' and new_first == 'MELANIE':
                new_first = 'Mélanie'
            if short_id == '2c08ba46' and new_first == 'MICKAEL':
                new_first = 'Mickael'
                
            partner_col = "partner_a" if partner == "A" else "partner_b"
            
            stmt = f"UPDATE clients SET {partner_col} = jsonb_set(jsonb_set({partner_col}, '{{firstName}}', '\"{new_first}\"'), '{{lastName}}', '\"{new_last}\"') WHERE id::text LIKE '{short_id}%';"
            sql_stmts.append(stmt)

with open('/home/zamolxes/devs/CoachCRM/scratch/updates.sql', 'w') as f:
    f.write('\n'.join(sql_stmts))
    
print('Done!')
