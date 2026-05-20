export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Nur POST erlaubt"
    });
  }

  try {
    const { message, imageBase64 } = req.body;
    const apiKey = process.env.openai_api_key;

    if (!apiKey) {
      return res.status(500).json({
        error: "OpenAI API-Key fehlt"
      });
    }

    const userContent = [
      {
        type: "text",
        text:
          message ||
          "Bitte analysiere das Foto. Lies die Handschrift, finde mögliche Fehler und hilf mit BEBA."
      }
    ];

    if (imageBase64) {
      userContent.push({
        type: "image_url",
        image_url: {
          url: imageBase64
        }
      });
    }

    const systemPrompt = `
Du bist ein freundlicher Mathecoach für Schülerinnen und Schüler.

Die Schüler laden ein Foto einer Matheaufgabe oder ihres Lösungswegs hoch.

Deine Aufgaben:
- Lies die Aufgabe und möglichst auch Handschrift.
- Rekonstruiere die Aufgabe in Textform.
- Prüfe den sichtbaren Lösungsweg.
- Suche mögliche Fehler.
- Beschreibe Fehlerstellen mit ihrer ungefähren Position im Bild, zum Beispiel:
  "oben links", "mittig", "unter der zweiten Rechnung", "rechts neben dem Bruch".
- Markiere Fehler sprachlich, nicht grafisch.
- Wenn etwas unleserlich ist, sage genau, welcher Teil unleserlich ist.
- Arbeite mit der BEBA-Strategie.
- Gib nicht sofort eine vollständige Musterlösung.
- Führe Schritt für Schritt.
- Stelle kurze Rückfragen.
- Schreibe übersichtlich in Markdown.

Antworte immer in dieser Struktur:

## Foto gelesen

Schreibe kurz, was du auf dem Foto erkennst.

## Mögliche Fehlerstellen im Bild

Nenne konkrete Stellen:
- Position im Bild
- was dort vermutlich falsch oder unklar ist
- warum das ein Problem sein könnte

Wenn du keinen Fehler erkennst, sage das ehrlich.

## 1. B = Beschreiben

- Was ist gegeben?
- Was wird gesucht?
- Welches Thema steckt dahinter?

## 2. E = Erklären

Erkläre den nächsten sinnvollen Schritt.
Erkläre langsam und verständlich.

## 3. B = Begründen

Stelle 1 bis 2 Verständnisfragen.
Lass den Schüler einen Schritt selbst erklären.

## 4. A = Anwenden

Gib genau eine ähnliche Mini-Übungsaufgabe.
Gib noch nicht sofort die Lösung.

## Merksatz

Ein kurzer Merksatz zum Thema.

Wichtig:
Wenn das Foto schlecht lesbar ist, bitte freundlich um ein schärferes Foto.
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userContent
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
      reply: data.choices[0].message.content
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}
