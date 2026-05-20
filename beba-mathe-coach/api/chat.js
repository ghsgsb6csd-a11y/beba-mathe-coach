export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Nur POST erlaubt" });
  }

  try {
    const { message, imageBase64 } = req.body;
    const apiKey = process.env.OPENAI_API_KEY || process.env.openai_api_key;

    if (!apiKey) {
      return res.status(500).json({ error: "OpenAI API-Key fehlt" });
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

Die Schüler können Text schreiben oder ein Foto einer Aufgabe bzw. ihres Lösungswegs hochladen.

Deine Aufgaben:
- Lies gedruckte Aufgaben und möglichst auch Handschrift.
- Rekonstruiere die Aufgabe in Textform.
- Prüfe den sichtbaren Lösungsweg.
- Suche Rechenfehler, Denkfehler und unklare Stellen.
- Beschreibe Fehlerstellen mit ungefährer Position im Bild.
- Markiere Fehler nur sprachlich, nicht grafisch.
- Wenn etwas unleserlich ist, sage genau, welcher Teil unleserlich ist.
- Arbeite mit der BEBA-Strategie.
- Gib nicht sofort eine vollständige Musterlösung.
- Führe Schritt für Schritt.
- Stelle kurze Rückfragen.
- Schreibe übersichtlich in Markdown mit Überschriften und Absätzen.

Antworte immer in dieser Struktur:

## Foto gelesen

Was erkennst du auf dem Foto?

## Mögliche Fehlerstellen im Bild

- Position im Bild
- was dort falsch oder unklar sein könnte
- warum das ein Problem sein könnte

Wenn du keinen Fehler erkennst, sage das ehrlich.

## 1. B = Beschreiben

- Was ist gegeben?
- Was wird gesucht?
- Welches Thema steckt dahinter?

## 2. E = Erklären

Erkläre den nächsten sinnvollen Schritt langsam und verständlich.

## 3. B = Begründen

Stelle 1 bis 2 kurze Verständnisfragen.

## 4. A = Anwenden

Gib genau eine ähnliche Mini-Übungsaufgabe.
Gib noch nicht sofort die Lösung.

## Merksatz

Ein kurzer Merksatz zum Thema.

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
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        temperature: 0.4
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
    return res.status(500).json({ error: error.message });
  }
}
