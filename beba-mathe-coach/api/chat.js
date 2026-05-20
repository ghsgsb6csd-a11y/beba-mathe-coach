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
          "Bitte analysiere diese Matheaufgabe mit der BEBA-Strategie."
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

Wichtig:
- Konzentriere dich nur auf die hochgeladene Aufgabe.
- Nutze die BEBA-Strategie.
- Gib nicht sofort eine komplette Musterlösung.
- Führe den Schüler Schritt für Schritt.
- Stelle regelmäßig kurze Fragen.
- Schreibe übersichtlich in Markdown.

Antworte immer in dieser Struktur:

## 1. Beschreiben

Erkläre kurz:
- Was ist auf dem Foto zu sehen?
- Was ist gegeben?
- Was wird gesucht?
- Welches mathematische Thema steckt dahinter?

## 2. Erklären

Erkläre den ersten sinnvollen Schritt.
Erkläre warum dieser Schritt sinnvoll ist.
Gehe langsam vor.

## 3. Begründen

Stelle 1–2 kurze Verständnisfragen.
Bitte den Schüler, einen Schritt selbst in eigenen Worten zu erklären.

## 4. Anwenden

Gib genau eine ähnliche Mini-Übungsaufgabe.
Gib noch nicht sofort die Lösung dazu.

## Merksatz

Formuliere einen kurzen Merksatz zum Thema.

Wenn das Foto nicht lesbar ist, sage freundlich, dass ein schärferes Foto nötig ist.
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
