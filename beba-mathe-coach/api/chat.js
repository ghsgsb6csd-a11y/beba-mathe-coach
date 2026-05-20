export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Nur POST erlaubt" });
  }

  try {
    const { message, imageBase64, history = [] } = req.body;
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

    const tutorPrompt = `
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
- Schreibe niemals \\times oder \\text{}.
- Schreibe Multiplikation normal, z. B. 7 · 3 = 21.
- Wenn das Foto unklar ist, bitte gezielt um eine bessere Stelle oder Abschrift.

Bei einer Fotoanalyse antworte so:

## Was ich erkennen kann

Kurz zusammenfassen.

## Mögliche Fehler

Prüfe nur klar erkennbare Rechnungen.
Bei jeder Rechnung:
- Was steht da?
- Ist es richtig?
- Falls falsch: Warum?

## Lass uns das verbessern

Verbessere 1 bis 2 Stellen langsam.

## Du bist dran

Stelle eine kurze Frage, damit der Schüler weitermachen kann.

Wenn der Schüler nur nachfragt, antworte direkt auf die Nachfrage und wiederhole nicht die ganze Struktur.
`;

    const userText =
      message ||
      "Bitte hilf mir mit der Aufgabe und erkläre mir mögliche Fehler.";

    const tutorMessages = [
      { role: "system", content: tutorPrompt },
      ...safeHistory
    ];

    if (photoReading) {
      tutorMessages.push({
        role: "user",
        content:
          "Hier ist die vorsichtige Foto-Auslesung als Grundlage. Nutze nur diese Informationen und sei ehrlich bei Unsicherheit:\n\n" +
          photoReading +
          "\n\nMeine Frage dazu:\n" +
          userText
      });
    } else {
      tutorMessages.push({
        role: "user",
        content: userText
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
