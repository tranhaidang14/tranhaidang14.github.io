# The Library

Drop photographs and PDFs into this folder, then run:

```bash
npm run build
```

- `photos/` — images (`.jpg`, `.png`, `.webp`, `.avif`, `.gif`, `.svg`)
- `documents/` — PDFs

Optional metadata lives in `meta.json`, keyed by the path relative to this
folder. Anything without metadata is still published, with a title derived
from the filename and today's file date. See the root README for the full
metadata reference.

Replace the sample plates with your own work whenever you like.
