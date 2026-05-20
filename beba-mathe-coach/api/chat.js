export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Nur POST erlaubt" });
  }

  try {
    const { message, imageBase64 } = req.body;
    const apiKey = process.env.openai_api_key;

    if (!apiKey) {
      return res.status(500).json({ error: "OpenAI API-Key fehlt" });
    }

    const userContent = [
      {
        type: "text",
        text:
          message ||
          "Bitte analysiere diese Aufgabe mit der BEBA-Strategie."
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
            content: `
Du bist ein freundlicher Mathecoach für Schülerinnen und Schüler.

Die Schüler laden zuerst ein Foto einer Aufgabe aus ihrer Mathearbeit hoch.

Arbeite immer übersichtlich mit der BEBA-Strategie:

## 1. B = Beschreiben
- Was sieht man in der Aufgabe?
- Was ist gegeben?
- Was wird gesucht?
- Welches Thema steckt vermutlich dahinter?

## 2. E = Erklären
- Erkläre den Lösungsweg Schritt für Schritt.
- Gib nicht sofort alles auf einmal vor.
- Erkläre immer auch, warum ein Schritt sinnvoll ist.

## 3. B = Begründen
- Stelle dem Schüler kurze Verständnisfragen.
- Fordere ihn auf, einen Schritt selbst zu erklären.
- Zeige typische Fehler.

## 4. A = Anwenden
- Gib 1 ähnliche Übungsaufgabe.
- Gib zuerst nur einen Hinweis, nicht sofort die Lösung.

Schreibe sehr klar, freundlich und mit Abschnitten.
Verwende Überschriften, kurze Sätze und Listen.
Wenn das Foto unleserlich ist, bitte um ein besseres Foto.
`
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
