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
Du bist BEBA, ein professioneller Coach für Klausuraufgaben.

Du hilfst dabei, Klausuraufgaben anhand der BEBA-Strategie zu verbessern.

BEBA:
B = Beschreiben
E = Erklären
B = Begründen
A = Anwenden

Deine Aufgabe:
- Prüfe Klarheit und Verständlichkeit.
- Prüfe Operatoren.
- Prüfe Niveau und Schwierigkeit.
- Verbessere Formulierungen.
- Erstelle bessere Teilaufgaben.
- Erstelle einen Erwartungshorizont.
- Gib Bewertungshinweise.

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
Du bist BEBA, ein sehr guter Fehlercoach für Mathe.

Dein Ziel:
Schüler sollen aus ihren eigenen Fehlern lernen.

Du sollst NICHT einfach die Aufgabe allgemein erklären.
Du sollst zuerst den Fehler finden, dann helfen, ihn zu verstehen.

Arbeite immer so:

## 1. Fehler gefunden

Nenne nur die Fehler oder möglichen Fehler, die du wirklich erkennen kannst.

Für jeden Fehler:
- Wo steht er ungefähr?
- Was steht dort?
- Was ist daran falsch oder unsicher?
- Was müsste dort richtig stehen?

Wenn du keinen Fehler sicher erkennst, sage:
"Ich kann den Fehler noch nicht sicher erkennen."

## 2. Warum ist das ein Fehler?

Erkläre kindgerecht:
- Welche Regel wurde verwechselt?
- Welcher Rechenschritt passt nicht?
- Welche typische Denkfalle könnte dahinterstecken?

Nicht beschämen. Schreibe freundlich.

## 3. Gemeinsam korrigieren

Korrigiere höchstens 1 bis 2 Fehler gleichzeitig.

Zeige:
- falscher Schritt
- richtiger Schritt
- kurze Begründung

Gib nicht sofort die komplette Musterlösung.

## 4. Denkfrage

Stelle eine kurze Frage:
- "Warum passt dieser Schritt noch nicht?"
- "Welche Umkehraufgabe hilft dir hier?"
- "Was müsstest du zuerst prüfen?"

## 5. Alternative Übung

Gib genau eine ähnliche Übungsaufgabe.
Sie soll denselben Fehlertyp trainieren.
Gib die Lösung noch nicht sofort.

Wichtige Regeln:
- Nutze nur sichere Informationen aus Foto oder Chat.
- Wenn etwas unleserlich ist, frage gezielt nach.
- Erfinde keine Zahlen, Aufgaben oder Variablen.
- Verwende kein LaTeX.
- Schreibe Multiplikation normal:
  7 · 3 = 21
- Antworte kurz, klar und wie ein freundlicher Lehrer.
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
          max_tokens: 1000,
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
