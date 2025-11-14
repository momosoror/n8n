// ========================================
// 🔄 Excel Row Consolidator - FIXED
// ========================================
// Risolve: "trim is not a function" con null checks

const rows = $input.all();
const consolidated = [];
let currentCategory = '';
let i = 0;

while (i < rows.length) {
  const current = rows[i].json;
  const next = i + 1 < rows.length ? rows[i + 1].json : null;

  // Safe access con optional chaining e fallback
  const descrizione = (current['DESCRIZIONE  COMPLETA                                   '] || current['DESCRIZIONE'] || '').toString().trim();
  const um = (current['U.M.'] || '').toString().trim();
  const macro = (current['MACRO'] || '').toString().trim();
  const costo = current['COSTO UNITAR. MATERIALE'];
  const tempo = current['Tempo pos min/copp'];

  const hasDescription = descrizione.length > 0;
  const hasUM = um.length > 0;
  const hasCost = costo !== null && costo !== undefined && costo !== '';
  const hasMacro = macro.length > 0;

  // Identifica categoria: ha MACRO, no UM, no costo
  const isCategory = hasMacro && !hasUM && !hasCost;

  if (isCategory) {
    currentCategory = macro;
    i++;
    continue;
  }

  // Caso 1: Riga completa
  if (hasDescription && hasUM && hasCost) {
    consolidated.push({
      json: {
        ...current,
        'MACRO': macro || currentCategory,
        __rowNumber: i + 1,
        __consolidatedFrom: 'single_row'
      }
    });
    i++;
  }
  // Caso 2: Riga incompleta + merge con successiva
  else if (hasDescription && hasUM && !hasCost && next) {
    const nextCosto = next['COSTO UNITAR. MATERIALE'];
    const nextTempo = next['Tempo pos min/copp'];
    const nextHasCost = nextCosto !== null && nextCosto !== undefined && nextCosto !== '';
    const nextHasTime = nextTempo !== null && nextTempo !== undefined && nextTempo !== '';

    if (nextHasCost || nextHasTime) {
      // Merge
      consolidated.push({
        json: {
          'MACRO': macro || currentCategory,
          'DESCRIZIONE  COMPLETA                                   ': descrizione,
          'U.M.': um,
          "Q.TA'": current["Q.TA'"] || next["Q.TA'"] || '',
          'COSTO UNITAR. MATERIALE': nextHasCost ? nextCosto : costo,
          'Tempo pos min/copp': nextHasTime ? nextTempo : tempo,
          'Preventivo': current['Preventivo'] || '',
          __rowNumber: i + 1,
          __consolidatedFrom: 'merged_with_row_' + (i + 2),
          __mergedRows: [i + 1, i + 2]
        }
      });
      i += 2;
    } else {
      // Passa riga incompleta
      consolidated.push({
        json: {
          ...current,
          'MACRO': macro || currentCategory,
          __rowNumber: i + 1,
          __consolidatedFrom: 'incomplete_row'
        }
      });
      i++;
    }
  }
  // Caso 3: Solo descrizione senza UM (skip)
  else if (hasDescription && !hasUM) {
    i++;
    continue;
  }
  // Caso 4: Altro (skip)
  else {
    i++;
    continue;
  }
}

return consolidated;
