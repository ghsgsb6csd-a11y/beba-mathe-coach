export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Nur POST erlaubt"
    });
  }

  try {
    const { message, imageBase64 } = req.body;

    const apiKey =
      process.env.OPENAI_API_KEY ||
      process.env.openai_api_key;

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
          "Bitte analysiere das Foto."
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

Analysiere Fotos von Matheaufgaben und Lösungswegen.

Wichtig:
- Lies möglichst auch Handschrift.
- Erkenne mögliche Fehler.
- Wenn das Bild gedreht wirkt, interpretiere es trotzdem korrekt.
- Erkläre langsam und verständlich.
- Nutze Überschriften und Absätze.
- Schreibe übersichtlich in Markdown.
- Hilf Schritt für Schritt mit der BEBA-Strategie.
- Gib nicht sofort eine vollständige Musterlösung.

Antwortstruktur:

## Foto gelesen

## Mögliche Fehlerstellen

## B = Beschreiben

## E = Erklären

## B = Begründen

## A = Anwenden

## Merksatz
`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000);

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.3,
          max_tokens: 900,
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
      }
    );

    clearTimeout(timeoutId);

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
        data.choices?.[0]?.message?.content ||
        "Keine Antwort erhalten."
    });
  } catch (error) {
    return res.status(500).json({
      error:
        error.name === "AbortError"
          ? "Die Anfrage hat zu lange gedauert. Bitte versuche es erneut."
          : error.message
    });
  }
}
