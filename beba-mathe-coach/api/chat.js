export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Nur POST erlaubt" });
  }

  try {
    const { mode = "photo", message, imageBase64, history = [] } = req.body;
    const apiKey = process.env.OPENAI_API_KEY || process.env.openai_api_key;

    if (!apiKey) {
      return res.status(500).json({ error: "OpenAI API-Key fehlt" });
    }

    const safeHistory = history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-8)
      .map((m) => ({
        role: m.role,
        content: String(m.content || "").slice(0, 1500)
      }));

    const photoTutorPrompt = `
Du bist BEBA, ein sehr guter Mathecoach für Schülerinnen und Schüler.

Du sollst wie ein echter hilfreicher KI-Tutor antworten:
- freundlich
- geduldig
- konkret
- interaktiv
- nicht zu lang
- ohne erfundene Inhalte

WICHTIG:
- Nutze nur Informationen, die aus dem Foto oder dem Chat sicher hervorgehen.
- Wenn etwas unsicher ist, sage es ehrlich.
- Erfinde keine Aufgaben, keine Zahlen, keine Variablen.
- Verwende kein LaTeX.
- Schreibe Multiplikation normal, z. B. 7 · 3 = 21.
- Wenn das Foto unklar ist, bitte gezielt um eine bessere Stelle oder Abschrift.

Bei einer Fotoanalyse antworte so:

## Was ich erkennen kann

Kurz zusammenfassen.

## Mögliche Fehler

Prüfe nur klar erkennbare Rechnungen.

## Lass uns das verbessern

Verbessere 1 bis 2 Stellen langsam.

## Du bist dran

Stelle eine kurze Frage, damit der Schüler weitermachen kann.
`;

    const examPrompt = `
Du bist BEBA, ein professioneller Coach für Lehrkräfte, Referendarinnen, Referendare und Schüler, die eigene Klausuraufgaben verbessern möchten.

Ziel:
Du hilfst dabei, eigene Klausuraufgaben anhand der BEBA-Strategie zu verbessern.

BEBA bedeutet:
B = Beschreiben
E = Erklären
B = Begründen
A = Anwenden

Deine Aufgabe:
- Prüfe, ob die Aufgabe klar, fair und lösbar ist.
- Prüfe, ob sie zur angegebenen Klassenstufe passt.
- Prüfe, ob Operatoren passend sind.
- Prüfe, ob die Aufgabe wirklich Denken anregt.
- Verbessere die Formulierung.
- Erstelle bei Bedarf eine bessere Version.
- Erstelle passende Teilaufgaben nach BEBA.
- Erstelle einen Erwartungshorizont.
- Gib Hinweise zur Bewertung.
- Mache die Aufgabe nicht unnötig kompliziert.

Antworte immer hilfreich und konkret.

Nutze diese Struktur:

## Erste Einschätzung

Kurz: Was funktioniert schon gut? Was ist noch unklar?

## BEBA-Check

### B = Beschreiben
Passt die Aufgabe dazu, dass Lernende erst beobachten, Informationen entnehmen oder beschreiben?

### E = Erklären
Müssen Lernende Zusammenhänge erklären?

### B = Begründen
Gibt es eine echte Begründungsanforderung?

### A = Anwenden
Können Lernende das Gelernte sinnvoll anwenden?

## Verbesserte Aufgabenfassung

Formuliere eine bessere, direkt nutzbare Version der Aufgabe.

## Erwartungshorizont

Gib Stichpunkte, woran eine gute Antwort erkennbar ist.

## Bewertungsvorschlag

Gib einen einfachen Punkteschlüssel oder Kriterien.

## Rückfrage

Stelle eine kurze Frage, z. B. nach Klassenstufe, Thema oder gewünschtem Schwierigkeitsgrad.

Wichtig:
Wenn Informationen fehlen, mache eine sinnvolle Annahme und sage kurz, welche.
`;

    if (mode === "exam") {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          temperature: 0.25,
          max_tokens: 1600,
          messages: [
            { role: "system", content: examPrompt },
            ...safeHistory,
            {
              role: "user",
              content:
                message ||
                "Bitte verbessere diese Klausuraufgabe anhand der BEBA-Strategie."
            }
          ]
        })
      });

      const data = await response.json();

      if (!response.ok) {
        return res.status(500).json({
          error: data.error?.message || "OpenAI Fehler"
        });
      }

      return res.status(200).json({
        reply: data.choices?.[0]?.message?.content || "Keine Antwort erhalten."
      });
    }

    let photoReading = null;

    if (imageBase64) {
      const readPrompt = `
Du liest ein Foto eines Schul-Arbeitsblattes oder eines handschriftlichen Lösungswegs.

AUFGABE:
Lies nur das Bild. Erkläre noch nichts.

WICHTIG:
- Schreibe nur, was du wirklich erkennst.
- Wenn etwas unsicher ist, markiere es als unsicher.
- Erfinde keine Aufgaben.
- Erfinde keine Variablen.
- Verwende kein LaTeX.
- Wenn kein x sichtbar ist, schreibe kein x.
- Gib keine langen Erklärungen.

Antworte als JSON mit:
{
  "sicher_erkannt": [],
  "unsicher": [],
  "sichtbare_rechnungen": [],
  "moegliche_fehler": [],
  "thema_vermutlich": "",
  "lesbarkeit": "gut | mittel | schlecht"
}
`;

      const readResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          temperature: 0,
          max_tokens: 900,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: readPrompt },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Lies dieses Foto vorsichtig aus. Nicht erklären, nur erkennen."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageBase64,
                    detail: "high"
                  }
                }
              ]
            }
          ]
        })
      });

      const readData = await readResponse.json();

      if (!readResponse.ok) {
        return res.status(500).json({
          error: readData.error?.message || "Fehler beim Lesen des Fotos"
        });
      }

      photoReading = readData.choices?.[0]?.message?.content || null;
    }

    const tutorMessages = [
      { role: "system", content: photoTutorPrompt },
      ...safeHistory
    ];

    if (photoReading) {
      tutorMessages.push({
        role: "user",
        content:
          "Hier ist die vorsichtige Foto-Auslesung als Grundlage. Nutze nur diese Informationen und sei ehrlich bei Unsicherheit:\n\n" +
          photoReading +
          "\n\nMeine Frage dazu:\n" +
          (message ||
            "Bitte hilf mir mit der Aufgabe und erkläre mir mögliche Fehler.")
      });
    } else {
      tutorMessages.push({
        role: "user",
        content:
          message ||
          "Bitte hilf mir mit der Aufgabe und erkläre mir mögliche Fehler."
      });
    }

    const tutorResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.2,
        max_tokens: 1000,
        messages: tutorMessages
      })
    });

    const tutorData = await tutorResponse.json();

    if (!tutorResponse.ok) {
      return res.status(500).json({
        error: tutorData.error?.message || "OpenAI Fehler"
      });
    }

    return res.status(200).json({
      reply: tutorData.choices?.[0]?.message?.content || "Keine Antwort erhalten."
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Unbekannter Fehler"
    });
  }
}
