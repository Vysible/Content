# Troubleshooting — Fehlerbehebung

Lösungen für häufige Probleme und Fehlermeldungen.

---

## Login-Probleme

### "Ungültige Anmeldedaten"

**Ursachen:**
- Falsches Passwort
- E-Mail-Adresse falsch geschrieben
- Caps Lock aktiviert

**Lösungen:**

1. **Passwort zurücksetzen:**
   - Klicken Sie auf **"Passwort vergessen"**
   - Geben Sie Ihre E-Mail-Adresse ein
   - Sie erhalten eine E-Mail mit einem Reset-Link (gültig 1 Stunde)
   - Klicken Sie auf den Link und vergeben Sie ein neues Passwort

2. **E-Mail-Adresse prüfen:**
   - Achten Sie auf Groß-/Kleinschreibung
   - Prüfen Sie auf Leerzeichen am Anfang/Ende
   - Kopieren Sie die E-Mail nicht aus anderen Programmen (unsichtbare Zeichen)

3. **Caps Lock prüfen:**
   - Deaktivieren Sie Caps Lock
   - Versuchen Sie es erneut

### "Account gesperrt"

**Ursache:** Nach 5 fehlgeschlagenen Login-Versuchen wird Ihr Account für 15 Minuten gesperrt.

**Lösung:**
- Warten Sie 15 Minuten
- Versuchen Sie es erneut
- Falls weiterhin gesperrt: Kontaktieren Sie den Support

### "Session abgelaufen"

**Ursache:** Sie waren länger als 30 Tage nicht eingeloggt.

**Lösung:**
- Melden Sie sich erneut an
- Aktivieren Sie **"Angemeldet bleiben"** beim Login (Cookie-Laufzeit: 30 Tage)

---

## Content-Generierung

### Generierung startet nicht

**Symptom:** Nach Klick auf "Jetzt generieren" passiert nichts.

**Lösungen:**

1. **Browser-Cache leeren:**
   - Windows: Strg+Shift+Entf
   - macOS: Cmd+Shift+Delete
   - Wählen Sie "Cached Images and Files"
   - Klicken Sie auf "Clear Data"

2. **JavaScript aktiviert?**
   - Öffnen Sie Browser-Einstellungen
   - Suchen Sie nach "JavaScript"
   - Stellen Sie sicher, dass JavaScript aktiviert ist

3. **Ad-Blocker deaktivieren:**
   - Deaktivieren Sie Ad-Blocker für vysible.cloud
   - Laden Sie die Seite neu (F5)

### "Budget überschritten"

**Symptom:** Fehlermeldung beim Start der Generierung.

**Lösung:**

1. **Budget erhöhen:**
   - Öffnen Sie **Einstellungen → Kosten & Abrechnung**
   - Erhöhen Sie Ihr monatliches Budget
   - Klicken Sie auf **"Speichern"**

2. **Warten bis Monatsende:**
   - Das Budget wird am 1. des Monats zurückgesetzt
   - Alternative: Kontaktieren Sie Ihren Agentur-Administrator

### Generierung hängt bei einem Schritt

**Symptom:** Der Fortschrittsbalken bewegt sich nicht mehr.

**Lösungen:**

1. **5 Minuten warten:**
   - Manche Schritte (z.B. Scraping großer Websites) dauern länger
   - Schließen Sie das Fenster nicht

2. **Seite aktualisieren:**
   - Drücken Sie F5
   - Der Fortschritt wird automatisch wiederhergestellt
   - Die Generierung läuft im Hintergrund weiter

3. **Nach 30 Minuten:**
   - Falls keine Änderung: Generierung abbrechen
   - Neue Generierung starten
   - Falls erneut hängt: Support kontaktieren mit Screenshot

### "Scraping fehlgeschlagen"

**Symptom:** Fehlermeldung im Schritt "Scraping".

**Ursachen:**
- Praxis-Website ist offline
- Website blockiert automatisierte Zugriffe
- Website hat Captcha

**Lösungen:**

1. **Website-Erreichbarkeit prüfen:**
   - Öffnen Sie die Praxis-URL in einem neuen Tab
   - Lädt die Website normal?
   - Falls nein: Warten Sie, bis die Website wieder online ist

2. **URL korrigieren:**
   - Öffnen Sie **Projekt → Einstellungen**
   - Prüfen Sie die Praxis-URL
   - Korrigieren Sie Tippfehler (z.B. `htps://` statt `https://`)

3. **Alternative: Manuelle Eingabe:**
   - Überspringen Sie das Scraping
   - Geben Sie die Praxis-Informationen manuell ein (Positionierungs-Interview)

---

## Editor-Probleme

### Änderungen werden nicht gespeichert

**Symptom:** Nach dem Speichern sind Änderungen beim erneuten Öffnen weg.

**Lösungen:**

1. **Speicher-Indikator prüfen:**
   - Sehen Sie einen **grünen Haken** nach dem Speichern?
   - Falls nein: Internetverbindung prüfen

2. **Manuell speichern:**
   - Klicken Sie auf **"Speichern"** (oben rechts)
   - Warten Sie auf den grünen Haken
   - Erst dann das Fenster schließen

3. **Browser-Kompatibilität:**
   - Nutzen Sie Chrome, Firefox, Safari oder Edge
   - Internet Explorer wird nicht unterstützt

### "Konflikt erkannt"

**Symptom:** Fehlermeldung beim Speichern: "Ein anderer Benutzer hat diesen Inhalt geändert."

**Ursache:** Sie haben den Inhalt in zwei Browser-Tabs gleichzeitig geöffnet und bearbeitet.

**Lösung:**
1. Kopieren Sie Ihre Änderungen (Strg+A, Strg+C)
2. Klicken Sie auf **"Neu laden"**
3. Fügen Sie Ihre Änderungen erneut ein
4. Speichern Sie

**Vermeidung:** Öffnen Sie jeden Inhalt nur in einem Tab.

### Formatierung geht verloren

**Symptom:** Fett/Kursiv/Überschriften verschwinden nach dem Speichern.

**Ursache:** Sie haben Text aus Word/Google Docs kopiert — unsichtbare Formatierungen stören.

**Lösung:**
1. Kopieren Sie den Text in einen **Nur-Text-Editor** (Notepad, TextEdit)
2. Kopieren Sie von dort in Vysible
3. Formatieren Sie neu mit den Editor-Funktionen

**Alternative:**
- Nutzen Sie **"Als reinen Text einfügen"**: Strg+Shift+V (Windows) / Cmd+Shift+V (macOS)

---

## Praxis-Portal

### "Token abgelaufen"

**Symptom:** Praxis-Mitarbeiter sieht Fehlermeldung beim Öffnen des Links.

**Ursache:** Der Freigabe-Link ist älter als 24 Stunden.

**Lösung:**
1. Senden Sie eine **neue Einladung**:
   - Öffnen Sie Ihr Projekt
   - Klicken Sie auf **"Praxis einladen"**
   - Geben Sie die **gleiche E-Mail-Adresse** ein
   - Klicken Sie auf **"Einladung senden"**
2. Der neue Link ist wieder 24 Stunden gültig

**Tipp für die Praxis:** Link sofort nach Erhalt öffnen — dann bleibt die Anmeldung 7 Tage aktiv.

### Praxis sieht keine Inhalte

**Symptom:** Praxis-Portal zeigt "Noch keine Inhalte zur Freigabe vorhanden."

**Ursachen:**
- Content-Generierung ist noch nicht abgeschlossen
- Projekt hat keine generierten Inhalte

**Lösung:**
1. **Generierung prüfen:**
   - Öffnen Sie Ihr Projekt
   - Ist die Generierung abgeschlossen?
   - Falls nein: Warten Sie, bis die Generierung fertig ist

2. **Inhalte vorhanden?**
   - Öffnen Sie **Projekt → Inhalte**
   - Sehen Sie dort Inhalte?
   - Falls nein: Starten Sie eine neue Generierung

### Freigabe-Button funktioniert nicht

**Symptom:** Klick auf "Inhalt freigeben" hat keine Wirkung.

**Lösungen:**

1. **Seite neu laden:**
   - Drücken Sie F5
   - Versuchen Sie es erneut

2. **Cookies aktiviert?**
   - Öffnen Sie Browser-Einstellungen
   - Aktivieren Sie Cookies für vysible.cloud

3. **JavaScript aktiviert?**
   - Prüfen Sie Browser-Einstellungen
   - JavaScript muss aktiviert sein

---

## Export-Probleme

### "Keine Inhalte zum Exportieren"

**Symptom:** Fehlermeldung beim Export.

**Ursache:** Sie haben **"Nur freigegebene Inhalte"** gewählt, aber es gibt keine freigegebenen Inhalte.

**Lösung:**
1. **Freigaben prüfen:**
   - Öffnen Sie **Projekt → Inhalte**
   - Sind Inhalte als "Freigegeben" markiert?
   - Falls nein: Holen Sie Freigaben ein oder wählen Sie **"Alle Inhalte"** beim Export

2. **Filter ändern:**
   - Klicken Sie erneut auf **"Exportieren"**
   - Wählen Sie **"Alle Inhalte"**
   - Klicken Sie auf **"Download starten"**

### Download startet nicht

**Symptom:** Nach Klick auf "Download starten" passiert nichts.

**Lösungen:**

1. **Pop-up-Blocker:**
   - Deaktivieren Sie Pop-up-Blocker für vysible.cloud
   - Browser-Einstellungen → Pop-ups und Weiterleitungen → vysible.cloud erlauben

2. **Download-Ordner voll:**
   - Prüfen Sie Ihren Downloads-Ordner
   - Löschen Sie alte Dateien
   - Versuchen Sie es erneut

3. **Anderes Format wählen:**
   - Versuchen Sie ein anderes Format (z.B. PDF statt DOCX)
   - Falls ein Format funktioniert: Browser-Cache leeren und erneut versuchen

### DOCX-Datei lässt sich nicht öffnen

**Symptom:** Word zeigt Fehlermeldung beim Öffnen.

**Lösungen:**

1. **Word-Version prüfen:**
   - Vysible erstellt DOCX im Office 2007+ Format
   - Nutzen Sie mindestens Word 2007 oder neuer
   - Alternative: LibreOffice, Google Docs

2. **Datei reparieren:**
   - Öffnen Sie Word
   - Klicken Sie auf **Datei → Öffnen**
   - Wählen Sie die DOCX-Datei
   - Klicken Sie auf den Pfeil neben **"Öffnen"**
   - Wählen Sie **"Öffnen und reparieren"**

3. **Neu exportieren:**
   - Exportieren Sie erneut aus Vysible
   - Wählen Sie ein anderes Format (PDF oder HTML)

---

## Integrationen

### WordPress-Verbindung schlägt fehl

**Symptom:** "Verbindung fehlgeschlagen" beim Testen der WordPress-Integration.

**Lösungen:**

1. **Application-Password prüfen:**
   - Haben Sie ein **Application-Password** in WordPress generiert?
   - **Nicht** Ihr normales WordPress-Passwort verwenden!
   - WordPress → Benutzer → Profil → Application-Passwords → Neues Password generieren

2. **URL korrekt?**
   - Prüfen Sie die WordPress-URL
   - Format: `https://ihre-website.de` (ohne `/wp-admin`)
   - Keine Leerzeichen am Anfang/Ende

3. **REST-API aktiviert?**
   - Manche WordPress-Plugins deaktivieren die REST-API
   - Deaktivieren Sie Security-Plugins temporär
   - Testen Sie erneut

4. **SSL-Zertifikat gültig?**
   - Öffnen Sie Ihre WordPress-Website im Browser
   - Sehen Sie ein Schloss-Symbol in der Adressleiste?
   - Falls nein: SSL-Zertifikat erneuern

### Canva-Verbindung bricht ab

**Symptom:** Nach Klick auf "Mit Canva verbinden" erscheint Fehlermeldung.

**Lösungen:**

1. **Pop-ups erlauben:**
   - Canva öffnet sich in einem neuen Fenster
   - Erlauben Sie Pop-ups für vysible.cloud

2. **Canva-Account vorhanden?**
   - Sie benötigen einen Canva-Account (kostenlos)
   - Registrieren Sie sich bei canva.com

3. **Erneut versuchen:**
   - Klicken Sie auf **"Verbindung trennen"**
   - Warten Sie 1 Minute
   - Klicken Sie erneut auf **"Mit Canva verbinden"**

---

## Performance-Probleme

### Vysible lädt langsam

**Symptom:** Seiten brauchen lange zum Laden.

**Lösungen:**

1. **Internetverbindung prüfen:**
   - Öffnen Sie speedtest.net
   - Prüfen Sie Ihre Download-Geschwindigkeit
   - Mindestens 5 Mbit/s empfohlen

2. **Browser-Cache leeren:**
   - Windows: Strg+Shift+Entf
   - macOS: Cmd+Shift+Delete
   - Wählen Sie "Cached Images and Files"

3. **Andere Browser testen:**
   - Versuchen Sie Chrome, Firefox oder Edge
   - Vergleichen Sie die Geschwindigkeit

4. **Browser-Erweiterungen deaktivieren:**
   - Deaktivieren Sie alle Erweiterungen
   - Laden Sie Vysible neu
   - Falls schneller: Aktivieren Sie Erweiterungen einzeln, um den Übeltäter zu finden

### Dashboard zeigt veraltete Daten

**Symptom:** Statistiken oder Projekt-Liste ist nicht aktuell.

**Lösungen:**

1. **Seite neu laden:**
   - Drücken Sie F5 (Windows) oder Cmd+R (macOS)
   - Erzwingt ein vollständiges Neuladen

2. **Hard Reload:**
   - Windows: Strg+F5
   - macOS: Cmd+Shift+R
   - Lädt die Seite ohne Cache

3. **Cache leeren:**
   - Falls weiterhin veraltet: Browser-Cache komplett leeren
   - Siehe "Vysible lädt langsam" → Lösung 2

---

## Fehlermeldungen

### "Etwas ist schiefgelaufen"

**Allgemeine Fehlermeldung** — kann viele Ursachen haben.

**Lösungen:**

1. **Seite neu laden:**
   - Drücken Sie F5
   - Versuchen Sie die Aktion erneut

2. **Andere Aktion versuchen:**
   - Navigieren Sie zurück zum Dashboard
   - Versuchen Sie eine andere Funktion
   - Falls diese funktioniert: Ursprüngliche Aktion später erneut versuchen

3. **Support kontaktieren:**
   - Machen Sie einen Screenshot der Fehlermeldung
   - Notieren Sie, was Sie gerade gemacht haben
   - Senden Sie beides an support@vysible.cloud

### "Netzwerkfehler"

**Symptom:** "Keine Verbindung zum Server" oder ähnlich.

**Lösungen:**

1. **Internetverbindung prüfen:**
   - Öffnen Sie eine andere Website (z.B. google.com)
   - Funktioniert diese?
   - Falls nein: Internetverbindung wiederherstellen

2. **VPN/Proxy:**
   - Deaktivieren Sie VPN oder Proxy
   - Versuchen Sie es erneut

3. **Firewall:**
   - Prüfen Sie Firewall-Einstellungen
   - Erlauben Sie Verbindungen zu vysible.cloud

### "Zugriff verweigert"

**Symptom:** "Sie haben keine Berechtigung für diese Aktion."

**Ursachen:**
- Sie versuchen, ein fremdes Projekt zu bearbeiten
- Ihre Benutzerrolle erlaubt diese Aktion nicht

**Lösung:**
- Kontaktieren Sie Ihren Agentur-Administrator
- Lassen Sie sich die nötigen Berechtigungen erteilen

---

## Deployment-Hinweise (für Administratoren)

### Nach Code-Update: Praxis-Portal funktioniert nicht

**Symptom:** Nach einem Deployment erhalten Praxis-Mitarbeiter Fehlermeldungen beim Öffnen des Freigabe-Links.

**Ursache:** Die neue Version nutzt Cookie-basierte Sessions — alte Token-Links funktionieren nicht mehr.

**Lösung:**

1. **Neue Einladungen versenden:**
   - Alle bestehenden Freigabe-Links sind ungültig
   - Senden Sie neue Einladungen an alle Praxis-Mitarbeiter
   - Die neuen Links nutzen das Cookie-System

2. **Praxis informieren:**
   - E-Mail an alle Praxis-Kontakte:
     ```
     Betreff: Neuer Freigabe-Link erforderlich
     
     Sehr geehrte Damen und Herren,
     
     wir haben Vysible aktualisiert. Ihr bisheriger Freigabe-Link 
     funktioniert nicht mehr.
     
     Sie erhalten in Kürze einen neuen Link per E-Mail.
     
     Viele Grüße
     ```

3. **PRAXIS_SESSION_SECRET gesetzt?**
   - Prüfen Sie die Umgebungsvariablen (Coolify/VPS)
   - `PRAXIS_SESSION_SECRET` muss gesetzt sein
   - Generieren: `openssl rand -base64 32`
   - Ohne dieses Secret können keine Cookies signiert werden

---

## Support kontaktieren

Wenn keine der obigen Lösungen hilft:

**E-Mail:** support@vysible.cloud

**Bitte geben Sie an:**
- Ihre E-Mail-Adresse (Login)
- Projekt-Name (falls relevant)
- Was haben Sie versucht?
- Welche Fehlermeldung erschien? (Screenshot hilfreich)
- Browser und Version (z.B. "Chrome 120")
- Betriebssystem (Windows, macOS, Linux)

**Antwortzeit:** Werktags innerhalb von 24 Stunden

---

**Weiter zu:** [FAQ](./faq.md) | [Benutzerhandbuch](./benutzerhandbuch.md)
