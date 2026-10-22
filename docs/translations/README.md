# Correcting the Kinyarwanda text

`baho-text.csv` lists every piece of Kinyarwanda text in Baho, one row per distinct
phrase. A phrase used in several places has one row, and a correction updates all of them.

| Column | Meaning |
|---|---|
| Section | *App interface* (buttons, titles, messages) or *Lesson and disease content* |
| Current text | The text as it is now. **Do not edit this column.** |
| Corrected text | Write the right wording here. Leave it empty if the text is fine. |
| Comment | Optional notes for the reviewer |
| Where it is used | File and line, for reference |

Rules for the corrected text:

- Keep parts like `${userName}` or `${diseases.length}` exactly as they are; the app fills them in.
- Lesson bodies can be long; correct the whole cell.
- Open and save the file in Excel, Google Sheets or LibreOffice as **CSV (UTF-8)**.

Apply the corrections from the project folder:

```bash
npm run translations:apply -- --dry-run   # show what would change
npm run translations:apply                # change the code
npm run translations:apply -- --db        # also fix lessons already in PostgreSQL
npm run translations:export               # regenerate the list afterwards
```
