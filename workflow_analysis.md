# Analisi Workflow Catalogo Elettrico

## Problemi Identificati

### 1. **Nodo "Trasforma output AI" non funzionante**
- Il nodo Set ha `"options": {}` - non fa alcuna trasformazione
- L'output dell'AI Agent (JSON string) non viene parsato
- Causa fallimento nel passaggio dati al filtro successivo

### 2. **Prezzi su righe multiple**
- Excel ha struttura: categoria → descrizione prodotto → prezzo (a volte su riga successiva)
- Il parser Excel tratta ogni riga indipendentemente
- Serve preprocessing per consolidare righe correlate

### 3. **Confusione categorie/descrizioni**
- Nel preventivo: categoria principale (es. "IMPIANTO ELETTRICO") è separata dalla descrizione prodotto
- L'AI confonde le righe di intestazione categoria con prodotti
- Prompt non distingue chiaramente tra:
  - Riga categoria (da skippareskippare, ma memorizzare)
  - Riga prodotto (da processare con categoria memorizzata)

### 4. **Inefficienza modelli AI**
- Primo AI Agent usa GPT-4.1-mini per task semplice (validazione)
- Secondo AI Agent usa GPT-4o-mini per task complesso (catalogo)
- Possibile ottimizzazione: GPT-4.1-nano per validazione iniziale

## Soluzioni Proposte

### Nuovo Flusso
1. **Preprocessing AI Agent** - consolida righe Excel correlate, identifica categoria corrente
2. **Validation Filter** - filtra solo prodotti fisici (no servizi)
3. **Batch Loop** - processa a gruppi di 10
4. **Catalog AI Agent** - gestisce inserimento/aggiornamento catalogo con semantic matching

### Miglioramenti Tecnici
- Usare AI Agent per preprocessing (no Code nodes come richiesto)
- Prompt più specifici per distinguere categorie da prodotti
- Output strutturato JSON garantito
- Gestione errori e logging
