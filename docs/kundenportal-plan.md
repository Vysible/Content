# Kundenportal — Planungsdokument

## Was bereits existiert

- `/share/[token]` — passwortgeschützter Read-only-Link (alle Inhalte, kein Approval)
- `ShareLink`-Modell in Prisma: token, passwordHash, expiresAt, projectId
- `SharePanel`-Komponente in der Ergebnisse-Seite generiert/verwaltet den Link
- SMTP für E-Mails ist konfiguriert
- GA4Dashboard + GoogleAdsDashboard existieren bereits als Komponenten

---

## Ziel: Was das Kundenportal leisten muss

1. **Selektive Freigabe**: Die Agentur wählt pro Projekt welche Inhalte der Kunde sieht
2. **Schöne Darstellung**: Kein Admin-UI — premium, klar, mobilfreundlich
3. **Freigabe-Workflow**: Kunde kann Inhalte genehmigen, ablehnen oder kommentieren
4. **Analysen**: Einfache GA4-Übersicht für den Kunden (kein roher Google Ads-dump)

---

## Technischer Plan

### 1. Datenmodell-Erweiterungen

**StoredTextResult** (in `textResults` JSON-Feld) bekommt zwei neue Felder:
```ts
portalVisible?: boolean          // Agentur schaltet Inhalt im Portal frei
customerApproval?: 'pending' | 'approved' | 'changes_requested'
customerComment?: string
```

Datei: `lib/generation/results-store.ts`

**Neue Prisma-Tabelle `PortalLink`** (statt `ShareLink` erweitern):
```prisma
model PortalLink {
  id            String   @id @default(cuid())
  token         String   @unique @default(cuid())
  projectId     String
  project       Project  @relation(fields: [projectId], references: [id])
  passwordHash  String
  expiresAt     DateTime
  createdAt     DateTime @default(now())
  showAnalytics Boolean  @default(false)
}
```

---

### 2. Agentur-UI: Inhalte fürs Portal markieren

- Kleiner Toggle "Im Kundenportal zeigen" neben dem Status-Dropdown pro Karte
- PATCH `/api/projects/[id]/results` mit `{ index, updates: { portalVisible: true } }`
- Grüner Punkt als Indikator wenn im Portal sichtbar
- Neues `PortalPanel` (ersetzt/erweitert `SharePanel`): Link erstellen, Passwort setzen, Analysen einschließen, Link kopieren/per Mail senden

---

### 3. Neue Route: `/portal/[token]`

Getrennt von `/share/[token]` — eigenes Design, eigene Logik.
Alles auf einer Seite mit Sub-Tabs: Übersicht | Blog | Newsletter | Social | Analysen

---

### 4. Darstellung im Portal

**Blog:** Vollständig gerenderter Artikel, schöne Typografie, keine Admin-Chrome
**Newsletter:** E-Mail-Optik (Betreff, Preheader, Body styled wie echte Mail)
**Social:** Instagram/Facebook-Mockup-Karte mit Praxis-Icon und Like/Kommentar-Symbolen
**Analysen:** Nur Sitzungen, Top-Seiten, Verweildauer — kein roher Ads-Dump

Jede Karte hat: **[✓ Freigeben]** und **[✎ Änderungswunsch]** Button + optionales Kommentarfeld

---

### 5. Freigabe-API

`POST /api/portal/[token]/approve` → `{ index, approval, comment }`
- Speichert in `textResults[index].customerApproval`
- E-Mail-Benachrichtigung an die Agentur
- Admin-Ansicht zeigt Badge: "Freigegeben ✓", "Änderung ✎", "Ausstehend ●"

---

### 6. Dateien (Überblick)

| Datei | Was |
|-------|-----|
| `prisma/schema.prisma` | `PortalLink` Modell |
| `lib/generation/results-store.ts` | portalVisible, customerApproval, customerComment |
| `components/results/ResultsTabs.tsx` | Portal-Toggle pro Karte |
| `components/results/PortalPanel.tsx` | NEU — Link erstellen |
| `app/portal/[token]/page.tsx` | NEU — Portal-Login |
| `app/portal/[token]/PortalView.tsx` | NEU — Kundendarstellung |
| `app/api/portal/[token]/approve/route.ts` | NEU — Freigabe |
| `app/api/projects/[id]/portal/route.ts` | NEU — Link-Verwaltung |

---

### 7. Reihenfolge morgen

1. Prisma-Migration (PortalLink)
2. StoredTextResult erweitern
3. Portal-Toggle im Admin
4. Portal-Route + Login
5. Darstellung (Blog, Newsletter, Social)
6. Freigabe-Buttons + API
7. Analysen-Tab
8. E-Mail-Benachrichtigung

---

### 8. Offene Fragen für morgen

- Portal unter `vysible.cloud/portal/...` oder eigene Domain?
- Nur Token+Passwort oder Kunden-Login?
- Logo-Upload für Praxis-Branding?
- Soll Freigabe die Veröffentlichung im Admin freischalten?
