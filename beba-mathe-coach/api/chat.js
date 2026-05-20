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

    async function readPhoto(purpose) {
      if (!imageBase64) return null;

      const readPrompt =
        purpose === "exam"
          ? `
Du liest ein Foto einer selbst erstellten Klausuraufgabe, Klassenarbeit, Lernaufgabe oder Prüfungsaufgabe.

Lies nur das Bild. Erkläre noch nichts.

Wichtig:
- Schreibe nur, was du wirklich erkennst.
- Markiere unsichere Stellen.
- Erfinde keine Aufgaben.
- Erfinde keine Punkte.
- Erfinde keine Klassenstufe.
- Verwende kein LaTeX.

Antworte als JSON:
{
  "aufgabentext_sicher": "",
  "unsichere_stellen": [],
  "sichtbare_operatoren": [],
  "sichtbare_punkte": "",
  "sichtbares_thema": "",
  "lesbarkeit": "gut | mittel | schlecht"
}
`
          : `
Du liest ein Foto eines Schul-Arbeitsblattes oder eines handschriftlichen Lösungswegs.

Lies nur das Bild. Erkläre noch nichts.

Wichtig:
- Schreibe nur, was du wirklich erkennst.
- Markiere unsichere Stellen.
- Erfinde keine Aufgaben.
- Erfinde keine Variablen.
- Verwende kein LaTeX.

Antworte als JSON:
{
  "sicher_erkannt": [],
  "unsicher": [],
  "sichtbare_rechnungen": [],
  "moegliche_fehler": [],
  "thema_vermutlich": "",
  "lesbarkeit": "gut | mittel | schlecht"
}
`;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Fehler beim Lesen des Fotos");
      }

      return data.choices?.[0]?.message?.content || null;
    }

    if (mode === "exam") {
      const photoReading = await readPhoto("exam");

      const examPrompt = `
Du bist BEBA, ein professioneller Coach für Klausuraufgaben.

Du hilfst dabei, eigene Klausuraufgaben anhand der BEBA-Strategie zu verbessern.

BEBA bedeutet:
B = Beschreiben
E = Erklären
B = Begründen
A = Anwenden

Deine Aufgabe:
- Prüfe, ob die Aufgabe klar, fair und lösbar ist.
- Prüfe, ob sie zur Klassenstufe passt.
- Prüfe, ob Operatoren passend sind.
- Prüfe, ob die Aufgabe Denkprozesse anregt.
- Verbessere die Formulierung.
- Erstelle eine bessere Aufgabenfassung.
- Erstelle einen Erwartungshorizont.
- Gib Hinweise zur Bewertung.

Wichtig:
- Nutze nur Informationen aus dem Chat oder aus der Foto-Auslesung.
- Wenn etwas fehlt, frage nach.
- Wenn das Foto unklar ist, bitte um eine Abschrift.
- Schreibe konkret und direkt nutzbar.

Antwortstruktur:

## Erste Einschätzung

## BEBA-Check

## Verbesserte Aufgabenfassung

## Erwartungshorizont

## Bewertungsvorschlag

## Rückfrage
`;

      const userText =
        message ||
        "Bitte verbessere diese Klausuraufgabe anhand der BEBA-Strategie.";

      const content = photoReading
        ? "Hier ist die Foto-Auslesung der Klausuraufgabe:\n\n" +
          photoReading +
          "\n\nMeine Bitte dazu:\n" +
          userText
        : userText;

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
            { role: "user", content }
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

    const photoReading = await readPhoto("photo");

    const photoTutorPrompt = `
Du bist BEBA, ein sehr guter Mathecoach für Schülerinnen und Schüler.

Antworte:
- freundlich
- konkret
- interaktiv
- nicht zu lang
- ohne erfundene Inhalte

Wichtig:
- Nutze nur sichere Informationen.
- Wenn etwas unsicher ist, sage es ehrlich.
- Erfinde keine Aufgaben, Zahlen oder Variablen.
- Verwende kein LaTeX.
- Schreibe Multiplikation normal, z. B. 7 · 3 = 21.

Antwortstruktur bei Fotoanalyse:

## Was ich erkennen kann

## Mögliche Fehler

## Lass uns das verbessern

## Du bist dran
`;

    const userText =
      message || "Bitte hilf mir mit der Aufgabe und erkläre mögliche Fehler.";

    const content = photoReading
      ? "Hier ist die vorsichtige Foto-Auslesung:\n\n" +
        photoReading +
        "\n\nMeine Frage dazu:\n" +
        userText
      : userText;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.2,
        max_tokens: 1000,
        messages: [
          { role: "system", content: photoTutorPrompt },
          ...safeHistory,
          { role: "user", content }
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
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Unbekannter Fehler"
    });
  }
}
