# Română · Proiecte școlare

Platformă rapidă, statică, pentru organizarea proiectelor școlare pe **materii** și **linkuri** (ex. „Copac Octombrie”).

UI-ul urmează 1:1 limbajul vizual Colibri din [Zyro-byte/site](https://github.com/Zyro-byte/site) (dark/light, topbar, listă materii, secțiune linkuri).

## Funcții

- **Materii** — adaugă / șterge subiecte
- **Linkuri** — nume + URL per materie (ex. *Copac Octombrie*)
- **Parolă admin** `20205` — obligatorie pentru orice adăugare / editare / ștergere
- Sesiune admin în `sessionStorage` (se resetează la închiderea tab-ului)
- Date în `localStorage` (fără backend, încărcare instant)
- Temă dark/light (taste **D**)

## Rulare local

```bash
npm start
# → http://localhost:3000
```

Sau deschide direct `index.html` (funcționează și static pe GitHub Pages / Vercel).

## Deploy Vercel

Repo-ul e gata pentru Vercel static + `vercel.json` (cache assets).

## Structură

```
index.html   — UI
app.css      — stiluri Colibri
app.js       — logică + localStorage
theme.js     — dark/light
server.js    — static file server Node
icons/       — brand mark
```
