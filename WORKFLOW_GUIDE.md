# 📙 Guida Workflow Catalogo Smart - AI Enhanced

## 🎯 Panoramica

Workflow n8n per automatizzare la creazione di un catalogo prodotti per impianti elettrici a partire da preventivi Excel.

### Problemi Risolti

✅ **Filtro servizi vs prodotti**: Distingue automaticamente prodotti fisici da servizi (trasporti, demolizioni, opere)
✅ **Gestione categorie**: Riconosce intestazioni categoria separate dai prodotti
✅ **Descrizioni normalizzate**: Estrae e unifica descrizioni tecniche
✅ **Semantic matching**: Evita duplicati trovando prodotti simili già in catalogo
✅ **Aggiornamenti intelligenti**: Arricchisce descrizioni esistenti senza sovrascrivere
✅ **Efficienza costi**: Usa GPT-4.1-nano per validazione (economico) e GPT-4o-mini per gestione catalogo (accurato)

---

## 🏗️ Architettura Workflow

```
Manual Trigger
    ↓
Download Excel (Google Drive)
    ↓
Parse Excel
    ↓
AI Row Analyzer (GPT-4.1-nano)
  ├─ Valida se prodotto/servizio/categoria
  ├─ Normalizza descrizioni
  └─ Estrae dati tecnici
    ↓
Extract JSON
    ↓
Flatten Data
    ↓
Filter Valid Products (solo keep=true)
    ↓
Loop Batch (5 item/batch)
    ↓
AI Catalog Manager (GPT-4o-mini)
  ├─ Tools: Catalogo READ
  ├─ Tools: Catalogo UPDATE
  └─ Tools: Catalogo APPEND
    ↓
Catalogo aggiornato
```

---

## 🔧 Configurazione Nodi

### 1. AI Row Analyzer (Primo AI Agent)

**Modello**: GPT-4.1-nano
**Temperature**: 0.1 (massima precisione)
**Max Tokens**: 500

**Funzione**:
- Classifica riga come: `category_header` / `service` / `product`
- Skip intestazioni categoria e servizi
- Estrae dati tecnici dai prodotti validi
- Normalizza descrizioni e identifica ID prodotto

**Output JSON**:
```json
{
  "keep": true/false,
  "row_type": "product|service|category_header",
  "skip_reason": "...",
  "categoria_macro": "...",
  "categoria_catalogo": "...",
  "descrizione_prodotto": "...",
  "descrizione_completa": "...",
  "id_prodotto_rilevato": "...",
  "unita_misura": "...",
  "costo_materiale_unitario": 0.00,
  "minuti_manodopera_unitari": 0
}
```

### 2. Extract JSON + Flatten Data

Due nodi Set in sequenza:

1. **Extract JSON**: Parsea output AI e rimuove markdown code blocks
   ```javascript
   JSON.parse($json.output.replace(/```json\n?/g, '').replace(/```/g, '').trim())
   ```

2. **Flatten Data**: Estrae campi dal JSON parsato in variabili separate

### 3. Filter Valid Products

Filtra solo righe con:
- `keep = true`
- `descrizione_prodotto` non vuota

### 4. AI Catalog Manager (Secondo AI Agent)

**Modello**: GPT-4o-mini
**Temperature**: 0.2
**Max Tokens**: 1000

**Funzione**:
- Cerca prodotti simili in catalogo (semantic matching > 75%)
- UPDATE se trova match: arricchisce descrizione, aggiorna prezzi
- APPEND se nuovo: genera ID e inserisce
- Mantiene storicità dati

**Tools connessi**:
- `Catalogo READ`: Ricerca nel Google Sheet
- `Catalogo UPDATE`: Aggiorna righe esistenti (match su id_prodotto)
- `Catalogo APPEND`: Inserisce nuove righe

---

## 📊 Mapping Campi

### Da Preventivo Excel → Catalogo

| Campo Preventivo | Campo Catalogo | Note |
|-----------------|----------------|------|
| DESCRIZIONE | description | Normalizzata + categoria |
| U.M. | unita_misura | Diretta |
| COSTO UNITAR. MATERIALE | costo_materiale_unitario | Conversione numero |
| Tempo pos min/copp | minuti_manodopera_unitari | Conversione numero |
| MACRO | category | Dedotta/normalizzata |
| - | id_prodotto | Rilevato da descrizione o generato |

### Generazione ID Prodotto

1. **Se presente nella descrizione**: Usa ID rilevato (es. "BTdin", "C60")
2. **Se assente**: Genera formato `[CATEGORIA]_NNN` (es. "IMPE_001", "QUAD_023")

---

## ⚙️ Configurazione Iniziale

### 1. Credenziali Google

Assicurati di configurare:
- **Google Drive OAuth2** per download Excel
- **Google Sheets OAuth2** per accesso catalogo

### 2. OpenAI API

Configura credenziale OpenAI con accesso a:
- `gpt-4.1-nano` (validazione righe)
- `gpt-4o-mini` (gestione catalogo)

### 3. File Excel Sorgente

Il workflow scarica da Google Drive:
- **File ID**: `12xobrtNcwYLrUZ-xUUnmxYqUZUVqptRw`
- **Nome**: TABELLA COSTI - UBIFY.xlsx

**Struttura attesa**:
- Header row: 1
- Colonne: MACRO, DESCRIZIONE, U.M., Q.TA', COSTO UNITAR. MATERIALE, Tempo pos min/copp

### 4. Google Sheet Catalogo

- **Sheet ID**: `1Rg0oVT04mG4oy2OhgiYDNZVhSCLTyBFgVKdODIyQIEM`
- **Sheet name**: Foglio1

**Colonne richieste**:
```
id_prodotto | description | category | unita_misura | costo_materiale_unitario | minuti_manodopera_unitari | Tempo pos min/copp
```

---

## 🚀 Utilizzo

### Import Workflow

1. Copia il contenuto di `workflow_catalogo_improved.json`
2. In n8n: Settings → Import from File
3. Configura le credenziali richieste
4. Attiva il workflow

### Esecuzione

1. Clicca "Execute Workflow" sul Manual Trigger
2. Monitora l'esecuzione nei log
3. Verifica il catalogo Google Sheets aggiornato

### Batch Processing

Il workflow processa **5 prodotti alla volta** per:
- Evitare rate limiting API
- Permettere monitoring incrementale
- Gestire meglio errori

---

## 🧠 Scelta Modelli AI

### GPT-4.1-nano (AI Row Analyzer)

**Perché nano?**
- ✅ Task semplice e ripetitivo (classificazione)
- ✅ Output strutturato JSON
- ✅ Basso costo per migliaia di righe
- ✅ Velocità elevata

**Costo stimato**: ~$0.15 per 1000 righe

### GPT-4o-mini (AI Catalog Manager)

**Perché mini?**
- ✅ Task complesso (semantic matching)
- ✅ Uso di tools (READ/UPDATE/APPEND)
- ✅ Reasoning avanzato per evitare duplicati
- ✅ Gestione merge descrizioni

**Costo stimato**: ~$0.50 per 1000 righe (dopo filtro prodotti)

### Alternative

**Se necessiti maggiore accuratezza**:
- Usa `gpt-4o` (full) per AI Catalog Manager
- Costo maggiore ma zero errori di matching

**Se necessiti massimo risparmio**:
- Testa `gpt-4.1-nano` anche per Catalog Manager
- Verifica accuracy su sample prima di usare in produzione

---

## 🐛 Troubleshooting

### Problema: "JSON parse error"

**Causa**: AI restituisce testo con markdown code blocks
**Soluzione**: Il nodo "Extract JSON" rimuove automaticamente i blocchi. Se persiste, aggiungi nel prompt:

```
IMPORTANTE: Rispondi SOLO con JSON puro, senza ```json``` wrapper
```

### Problema: "Duplicate products created"

**Causa**: Threshold semantic matching troppo basso
**Soluzione**: Nel prompt AI Catalog Manager, aumenta threshold da 75% a 85%:

```
- Similarità descrizione > 85% = STESSO PRODOTTO
```

### Problema: "Missing prices (null values)"

**Causa**: Prezzo su riga successiva nel preventivo
**Soluzione**: Vedi "Versione Avanzata" sotto per gestire righe multiple

### Problema: "Categories imported as products"

**Causa**: AI non riconosce intestazioni
**Soluzione**: Nel prompt AI Row Analyzer, aggiungi esempi di categorie comuni:

```
Esempi categorie da SKIPPARE:
- IMPIANTO ELETTRICO
- QUADRI ELETTRICI
- CAVI E CONDUTTORI
- ILLUMINAZIONE
```

---

## 🔬 Testing

### Test Manuale

1. Prepara un Excel di test con 10-20 righe miste:
   - 2-3 intestazioni categoria
   - 3-4 servizi (trasporto, opere)
   - 5-10 prodotti reali

2. Esegui workflow e verifica:
   - Solo prodotti inseriti in catalogo
   - Descrizioni normalizzate
   - Prezzi corretti
   - Nessun duplicato

### Validation Query

Controlla duplicati in Google Sheets:

```sql
=QUERY(A:G, "SELECT description, COUNT(description) WHERE description <> '' GROUP BY description HAVING COUNT(description) > 1")
```

---

## 📈 Ottimizzazioni Future

### Versione Avanzata: Gestione Righe Multiple

Per gestire il caso "prezzo su riga successiva", aggiungi un nodo AI preprocessor prima di "AI Row Analyzer":

**Nuovo nodo: AI Excel Consolidator**
- Input: Tutte le righe Excel
- Output: Righe consolidate (descrizione + prezzo uniti)
- Logica: Se riga N ha descrizione senza prezzo, cerca in riga N+1

Vedi file `workflow_catalogo_advanced.json` (da creare se necessario).

### Altre Migliorie

- **Logging**: Aggiungi nodo Google Sheets per log operazioni (created/updated/skipped)
- **Notifications**: Webhook Slack/Telegram per alert errori
- **Incremental**: Filtra solo righe Excel nuove (confronto timestamp)
- **Validation**: Pre-check formato Excel prima di processing

---

## 📞 Supporto

Per problemi o domande:
1. Verifica log esecuzione n8n
2. Controlla output intermedio di ogni nodo
3. Testa singoli AI Agent in isolation
4. Valida formato Excel e Google Sheets

---

## 📝 Changelog

### v2.0 (Improved - Current)
- ✅ Sostituito nodo "Trasforma output AI" non funzionante
- ✅ Aggiunto dual-model approach (nano + mini)
- ✅ Migliorato prompt per distinguere categoria/prodotto
- ✅ Aggiunto filter prodotti validi
- ✅ Ridotto batch size da 10 a 5 per stability

### v1.0 (Original)
- ⚠️ Problemi: nodo Set vuoto, categoria detection, duplicati
