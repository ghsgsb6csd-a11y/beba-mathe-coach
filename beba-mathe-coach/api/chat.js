export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Nur POST erlaubt"
    });
  }

  try {
    const {
      mode = "photo",
      message,
      imageBase64,
      history = []
    } = req.body;

    const apiKey =
      process.env.OPENAI_API_KEY ||
      process.env.openai_api_key;

    if (!apiKey) {
      return res.status(500).json({
        error: "OpenAI API-Key fehlt"
      });
    }

    const safeHistory = history
      .filter(
        (m) =>
          m.role === "user" ||
          m.role === "assistant"
      )
      .slice(-8)
      .map((m) => ({
        role: m.role,
        content: String(
          m.content || ""
        ).slice(0, 1500)
      }));

    async function readPhoto(purpose) {
      if (!imageBase64) return null;

      const readPrompt =
        purpose === "exam"
          ? `
Du liest ein Foto einer Klausuraufgabe oder Prüfungsaufgabe.

Lies nur das Bild.
Erkläre noch nichts.

WICHTIG:
- Schreibe nur, was wirklich sichtbar ist.
- Markiere unsichere Stellen.
- Erfinde keine Aufgaben.
- Verwende kein LaTeX.

Antworte als JSON:
{
  "aufgabentext_sicher": "",
  "unsichere_stellen": [],
  "sichtbare_operatoren": [],
  "sichtbares_thema": "",
  "lesbarkeit": "gut | mittel | schlecht"
}
`
          : `
Du liest ein Foto eines Mathe-Arbeitsblattes oder eines handschriftlichen Lösungswegs.

Lies nur das Bild.
Erkläre noch nichts.

WICHTIG:
- Schreibe nur, was wirklich sichtbar ist.
- Markiere unsichere Stellen.
- Erfinde keine Aufgaben.
- Erfinde keine Variablen.
- Verwende kein LaTeX.
- Wenn kein x sichtbar ist, schreibe kein x.

Antworte als JSON:
{
  "sicher_erkannt": [],
  "unsicher": [],
  "sichtbare_rechnungen": [],
  "erkannte_fehler": [
    {
      "position": "",
      "falscher_schritt": "",
      "korrektur": "",
      "vermuteter_fehlertyp": ""
    }
  ],
  "typische_fehlermoeglichkeiten": [],
  "lesbarkeit": "gut | mittel | schlecht"
}
`;

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "gpt-4o",
            temperature: 0,
            max_tokens: 900,
            response_format: {
              type: "json_object"
            },
            messages: [
              {
                role: "system",
                content: readPrompt
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text:
                      "Lies dieses Foto vorsichtig aus. Nicht erklären, nur erkennen."
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
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error?.message ||
            "Fehler beim Lesen des Fotos"
        );
      }

      return (
        data.choices?.[0]?.message
          ?.content || null
      );
    }

    if (mode === "exam") {
      const photoReading =
        await readPhoto("exam");

      const examPrompt = `
Du bist BEBA, ein Coach für Klausuraufgaben.

Du hilfst Lehrkräften und Schülern dabei,
Klausuraufgaben mit der BEBA-Strategie zu verbessern.

BEBA:
B = Beschreiben
E = Erklären
B = Begründen
A = Anwenden

Deine Aufgabe:
- Prüfe die Verständlichkeit.
- Prüfe Operatoren.
- Prüfe Schwierigkeit und Niveau.
- Verbessere die Formulierungen.
- Erstelle bessere Teilaufgaben.
- Erstelle einen Erwartungshorizont.
- Gib einfache Bewertungshinweise.

Antworte mit:

## Erste Einschätzung

## BEBA-Check

## Verbesserte Aufgabenfassung

## Erwartungshorizont

## Bewertungsvorschlag

## Rückfrage
`;

      const userText =
        message ||
        "Bitte verbessere diese Klausuraufgabe.";

      const content = photoReading
        ? "Foto-Auslesung:\n\n" +
          photoReading +
          "\n\nMeine Bitte:\n" +
          userText
        : userText;

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "gpt-4o",
            temperature: 0.2,
            max_tokens: 1600,
            messages: [
              {
                role: "system",
                content: examPrompt
              },
              ...safeHistory,
              {
                role: "user",
                content
              }
            ]
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return res.status(500).json({
          error:
            data.error?.message ||
            "OpenAI Fehler"
        });
      }

      return res.status(200).json({
        reply:
          data.choices?.[0]?.message
            ?.content ||
          "Keine Antwort erhalten."
      });
    }

    const photoReading =
      await readPhoto("photo");

    const photoTutorPrompt = `
Du bist BEBA, ein freundlicher Mathe-Lerncoach für Kinder.

Dein Ziel:
Das Kind soll seinen Fehler verstehen und es danach selbst besser machen können.

Wichtig:
- Bewerte die Arbeit nicht wie ein Lehrer mit Note.
- Schreibe nicht "gut gemacht" und dann eine lange Bewertung.
- Sprich direkt mit dem Kind.
- Nutze einfache Wörter.
- Schreibe kurze Sätze.
- Erkläre nur den Fehler, nicht die ganze Aufgabe.
- Stelle immer nur eine kleine Frage.
- Gib nicht sofort alles vor.

Arbeite so:

## Ich glaube, hier ist der Fehler

Nenne höchstens 1 oder 2 Fehler.

Schreibe einfach:
- Wo ist der Fehler?
- Was steht dort?
- Was stimmt daran nicht?
- Wie wäre es richtig?

## Warum passiert so ein Fehler?

Erkläre ganz einfach.
Zum Beispiel:
- "Hier wurde Mal und Geteilt verwechselt."
- "Hier wurde ein Schritt übersprungen."
- "Hier passt die Umkehraufgabe nicht."

## Lass uns das zusammen verbessern

Zeige nur den nächsten kleinen Schritt.
Nicht die ganze Lösung.

## Du bist dran

Stelle genau eine kurze Frage.

## Kleine Übung

Gib genau eine ähnliche Aufgabe.
Noch ohne Lösung.

Regeln:
- Keine Noten.
- Keine Bewertung der ganzen Arbeit.
- Keine langen Texte.
- Keine Fachwörter, wenn einfache Wörter reichen.
- Kein LaTeX.
- Keine erfundenen Zahlen.
- Wenn du das Foto nicht sicher lesen kannst, sage:
  "Ich kann diese Stelle noch nicht sicher lesen."
`;

    const userText =
      message ||
      "Bitte finde Fehler und hilf mir daraus zu lernen.";

    const content = photoReading
      ? "Hier ist die vorsichtige Foto-Auslesung:\n\n" +
        photoReading +
        "\n\nMeine Frage:\n" +
        userText
      : userText;

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          temperature: 0.15,
          max_tokens: 650,
          messages: [
            {
              role: "system",
              content: photoTutorPrompt
            },
            ...safeHistory,
            {
              role: "user",
              content
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error:
          data.error?.message ||
          "OpenAI Fehler"
      });
    }

    return res.status(200).json({
      reply:
        data.choices?.[0]?.message
          ?.content ||
        "Keine Antwort erhalten."
    });
  } catch (error) {
    return res.status(500).json({
      error:
        error.message ||
        "Unbekannter Fehler"
    });
  }
}
