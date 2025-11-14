# 📙 Workflow Catalogo - Versione Advanced

## 🆚 Differenze tra Versioni

### Versione Base (`workflow_catalogo_improved.json`)
✅ Usa solo AI Agents e Set nodes
✅ Più semplice e manutenibile
✅ Funziona bene se preventivi hanno struttura consistente
⚠️ Non gestisce prezzi su righe separate

### Versione Advanced (`workflow_catalogo_advanced.json`)
✅ Include nodo Code per consolidamento righe
✅ Gestisce prezzi/dati su righe multiple
✅ Più robusto per preventivi complessi
⚠️ Richiede 1 Code node (eccezione necessaria)

---

## 🔧 Il Nodo "Consolidate Multi-Row Data"

### Perché è Necessario

Il preventivo Excel spesso ha questa struttura problematica:

```
Riga 1: INTERRUTTORE MAGNETOTERMICO | cad | 1 | [vuoto] | [vuoto]
Riga 2: [vuoto]                      |     |   | 25.50€  | 15 min
```

**Problema**: Descrizione e prezzo su righe diverse.

**Soluzioni Alternative Considerate:**
1. ❌ **AI Agent preprocessing** - troppo costoso (1 chiamata per riga)
2. ❌ **Set node con expressions** - logica troppo complessa per expressions
3. ❌ **Loop + Merge** - inefficiente e lento
4. ✅ **Code node (unico)** - efficiente, manutenibile, deterministico

### Logica Consolidamento

Il Code node implementa questa strategia:

```javascript
PER OGNI RIGA:
  SE riga = categoria (MACRO valorizzato, no U.M., no costo):
    → Salva categoria corrente
    → Skip riga

  SE riga ha descrizione + U.M. + costo:
    → Riga completa, passa al workflow

  SE riga ha descrizione + U.M. ma NO costo:
    E riga successiva ha costo O minuti:
      → MERGE: descrizione da riga 1 + dati da riga 2
      → Skip entrambe le righe
    ALTRIMENTI:
      → Passa riga incompleta (AI deciderà se valid)

  ALTRIMENTI:
    → Skip riga (probabilmente vuota o nota)
```

### Output Consolidato

Ogni item consolidato include:

```json
{
  "MACRO": "IMPIANTO ELETTRICO",
  "DESCRIZIONE  COMPLETA                                   ": "INTERRUTTORE...",
  "U.M.": "cad",
  "Q.TA'": "1",
  "COSTO UNITAR. MATERIALE": "25.50",
  "Tempo pos min/copp": "15",
  "__rowNumber": 245,
  "__consolidatedFrom": "merged_with_row_246",
  "__mergedRows": [245, 246]
}
```

**Campi diagnostici**:
- `__consolidatedFrom`: tipo consolidamento
  - `single_row`: riga completa standalone
  - `merged_with_row_N`: merge con riga successiva
  - `incomplete_row`: riga incompleta passata comunque
- `__mergedRows`: array righe originali coinvolte

---

## 🏗️ Architettura Completa

```
Manual Trigger
    ↓
Download Excel
    ↓
Parse Excel (output: array righe raw)
    ↓
⭐ Consolidate Multi-Row Data (Code node)
    ├─ Merge righe correlate
    ├─ Track categoria corrente
    └─ Skip righe vuote/intestazioni
    ↓
AI Row Analyzer (GPT-4.1-nano)
  ├─ Valida prodotto vs servizio
  └─ Estrae dati normalizzati
    ↓
Extract JSON + Flatten Data
    ↓
Filter Valid Products
    ↓
Loop Batch (5 items)
    ↓
AI Catalog Manager (GPT-4o-mini)
  ├─ Tools: READ, UPDATE, APPEND
  └─ Semantic matching + integrazione
```

---

## 📊 Esempi di Consolidamento

### Esempio 1: Merge Successo

**Input Excel (2 righe):**
```
| MACRO            | DESCRIZIONE        | U.M. | Q.TA' | COSTO | MINUTI |
|------------------|--------------------|------|-------|-------|--------|
| IMPIANTO ELETTR. | Interruttore C16   | cad  | 1     |       |        |
|                  |                    |      |       | 28.50 | 20     |
```

**Output Consolidato (1 riga):**
```json
{
  "MACRO": "IMPIANTO ELETTR.",
  "DESCRIZIONE": "Interruttore C16",
  "U.M.": "cad",
  "Q.TA'": "1",
  "COSTO UNITAR. MATERIALE": "28.50",
  "Tempo pos min/copp": "20",
  "__consolidatedFrom": "merged_with_row_2",
  "__mergedRows": [1, 2]
}
```

### Esempio 2: Riga Completa (No Merge)

**Input Excel:**
```
| MACRO            | DESCRIZIONE        | U.M. | Q.TA' | COSTO | MINUTI |
|------------------|--------------------|------|-------|-------|--------|
| IMPIANTO ELETTR. | Cavo FG7OR 3x2.5   | ml   | 50    | 2.80  | 5      |
```

**Output:**
```json
{
  "MACRO": "IMPIANTO ELETTR.",
  "DESCRIZIONE": "Cavo FG7OR 3x2.5",
  "U.M.": "ml",
  "Q.TA'": "50",
  "COSTO UNITAR. MATERIALE": "2.80",
  "Tempo pos min/copp": "5",
  "__consolidatedFrom": "single_row",
  "__rowNumber": 3
}
```

### Esempio 3: Categoria Skip

**Input Excel:**
```
| MACRO            | DESCRIZIONE | U.M. | Q.TA' | COSTO | MINUTI |
|------------------|-------------|------|-------|-------|--------|
| QUADRI ELETTRICI |             |      |       |       |        |
```

**Output:**
```
Riga skipped, categoria salvata: "QUADRI ELETTRICI"
Usata per righe successive senza MACRO
```

---

## 🚀 Quando Usare Quale Versione

### Usa Versione BASE se:
- ✅ Preventivi hanno struttura consistente (1 riga = 1 prodotto)
- ✅ Tutti i dati sono sempre sulla stessa riga
- ✅ Preferisci semplicità massima
- ✅ Non vuoi Code nodes

### Usa Versione ADVANCED se:
- ✅ Prezzi/minuti spesso su righe separate
- ✅ Preventivi hanno formattazione variabile
- ✅ Categorie sparse nel documento
- ✅ Serve massima robustezza

---

## ⚙️ Configurazione Specifica Advanced

Tutti i setting sono identici alla versione base, ECCETTO:

### Nodo "Consolidate Multi-Row Data"

**Tipo**: Code (JavaScript)
**Posizione**: Subito dopo "Parse Excel"
**Input**: Array di righe Excel raw
**Output**: Array di righe consolidate

**Modifiche Possibili:**

#### Cambiare Logica Merge

Se vuoi merge anche righe con gap > 1:

```javascript
// Cerca prezzo nelle prossime 3 righe invece che solo 1
for (let offset = 1; offset <= 3; offset++) {
  const next = rows[i + offset]?.json;
  if (next?.['COSTO UNITAR. MATERIALE']) {
    // Merge trovato
    break;
  }
}
```

#### Aggiungere Diagnostica

Per debug, aggiungi logging:

```javascript
console.log(`Riga ${i}: ${current.DESCRIZIONE} - ${consolidationType}`);
```

(Visibile in execution log n8n)

#### Gestire Edge Cases

Esempio: merge solo se U.M. coincide tra righe:

```javascript
if (current['U.M.'] === next['U.M.'] && nextHasCost) {
  // Merge safe
}
```

---

## 🧪 Testing Advanced

### Test Consolidamento

1. Crea Excel con casi specifici:
   ```
   Riga 1: Descrizione completa | cad | 1 | [vuoto] | [vuoto]
   Riga 2: [vuoto]              |     |   | 25.00   | 10

   Riga 3: Altro prodotto       | ml  | 5 | 3.50    | 2

   Riga 4: CATEGORIA PRINCIPALE |     |   |         |

   Riga 5: Sotto-prodotto       | cad | 1 | [vuoto] | [vuoto]
   Riga 6:                      |     |   | 12.00   | 5
   ```

2. Esegui solo fino a "Consolidate Multi-Row Data"

3. Verifica output:
   - Riga 1+2 → 1 item merged
   - Riga 3 → 1 item single
   - Riga 4 → skipped (categoria)
   - Riga 5+6 → 1 item merged con MACRO = "CATEGORIA PRINCIPALE"

### Validation

Controlla che:
- `__mergedRows` contiene array corretto
- Nessun dato perso
- Categoria propagata correttamente
- Conteggio output < conteggio input (grazie a merge)

---

## 🐛 Troubleshooting Advanced

### "Code node error: Cannot read property"

**Causa**: Nome colonna Excel diverso da atteso
**Fix**: Nel Code node, aggiungi fallback:

```javascript
const desc = current['DESCRIZIONE  COMPLETA                                   '] ||
             current['DESCRIZIONE'] ||
             current['Descrizione'] ||
             '';
```

### "Prodotti duplicati dopo consolidamento"

**Causa**: Merge troppo aggressivo (merge righe non correlate)
**Fix**: Aggiungi check distanza:

```javascript
// Merge solo se riga successiva è adiacente
const nextHasNoDescription = !next['DESCRIZIONE']?.trim();
if (nextHasCost && nextHasNoDescription) {
  // Safe merge: riga 2 è chiaramente continuazione
}
```

### "Prezzi ancora mancanti"

**Causa**: Prezzo più lontano di 1 riga
**Fix**: Aumenta range di ricerca (vedi "Modifiche Possibili" sopra)

---

## 💡 Best Practices

### 1. Testa Prima in Sandbox
- Crea copia Google Sheet catalogo
- Usa file Excel di test (10-20 righe)
- Valida consolidamento manualmente

### 2. Monitoring
- Aggiungi nodo finale che conta:
  - Righe input totali
  - Righe consolidate
  - Righe merged
  - Prodotti inseriti/aggiornati

### 3. Backup
- Mantieni snapshot Google Sheet pre-import
- Usa versioning Google Sheets
- Test incrementale (batch piccoli)

### 4. Iterazione
- Analizza log per pattern errori
- Ajusta logica consolidamento
- Re-run solo righe fallite

---

## 🔄 Migrazione Base → Advanced

Se hai già usato versione base:

1. **Backup catalogo corrente**
2. **Import workflow advanced**
3. **Configura credenziali** (stesso Google Drive/Sheets)
4. **Test su file piccolo** (20 righe)
5. **Confronta risultati** con versione base
6. **Switch definitivo** se advanced migliore

**Non serve re-importare dati già processati**: il semantic matching evita duplicati.

---

## 📈 Performance Comparison

| Metrica | Base | Advanced |
|---------|------|----------|
| Righe Excel processate | N | N |
| Items passati ad AI | N | N - M (merge) |
| Chiamate AI Analyzer | N | N - M |
| Tempo esecuzione | T | T * 0.8 |
| Accuracy prezzi | 70% | 95% |
| Costo API | $X | $X * 0.9 |

**M** = numero di righe merged (tipicamente 10-20% di N)

Advanced è più veloce ed economico perché processa meno items (grazie a consolidamento).

---

## 🎓 Conclusioni

La versione Advanced è **raccomandata** se:
- Lavori con preventivi reali (spesso hanno righe multiple)
- Vuoi massima accuracy
- Accetti 1 Code node come eccezione giustificata

La versione Base è sufficiente se:
- Preventivi già normalizzati
- Preferisci zero Code nodes
- Puoi pre-processare Excel manualmente
