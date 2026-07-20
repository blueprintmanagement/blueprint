# Blueprint

Blueprint is a private B2B SaaS prototype for construction financial management.

The current application is a Next.js front-end MVP focused on:

- selecting and managing active construction projects;
- registering expenses by project and phase;
- keeping supplier and catalog data for faster entry;
- tracking payment, accounting delivery, and receipt/document pending items;
- exporting a monthly XLSX dossier for accountants and investors.

## Project Status

This repository is used for private versioning and backup. It is not an open-source project.

Current data persistence is local to the browser through `localStorage`. Backend, database, authentication, and real file storage are intentionally out of scope for this first front-end validation stage.

## Development

```bash
npm install
npm run dev
```

Open the local Next.js URL shown in the terminal.

## Validation

```bash
npm run build
```
