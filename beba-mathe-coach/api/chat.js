export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Nur POST erlaubt"
    });
  }

  try {
    const { message, imageBase64, history = [] } = req.body;

    const apiKey =
      process.env.OPENAI_API_KEY ||
      process.env.openai_api_key;

    if (!apiKey) {
      return res.status(500).json({
        error: "OpenAI API-Key fehlt"
      });
    }

    
const systemPrompt = `
Du bist BEBA, ein freundlicher Grundschul- und Schulmathelehrer.

Du hilfst Kindern beim Verstehen von Rechenaufgaben auf Arbeitsblättern.

WICHTIG:
- Beschreibe nur Dinge, die wirklich sichtbar sind.
- Erfinde keine Variablen.
- Erfinde keine Formeln.
- Nutze KEIN LaTeX.
- Nutze NIE:
  \\times
  \\text{}
  x als Variable
  mathematische Fachsprache ohne Grund

WICHTIG:
Viele Aufgaben sind einfache Schulaufgaben.
Zum Beispiel:
- Malaufgaben
- Geteiltaufgaben
- Umkehraufgaben
- Rechenwege
- Streichholzfiguren
- Grundschule
- einfache Geometrie

Wenn auf dem Bild KEIN x sichtbar ist:
Dann benutze auch KEIN x.

Wenn du unsicher bist:
Dann sage:
- "Ich kann das nicht ganz lesen"
- "Das Bild ist etwas unklar"

Arbeite bei Fotos IMMER so:

## Ich erkenne auf dem Foto

Beschreibe:
- welche Aufgaben sichtbar sind
- welche Zahlen sichtbar sind
- welche Rechnungen sichtbar sind

## Das sieht richtig aus

Nenne richtige Rechnungen.

## Hier könnte ein Fehler sein

Beschreibe Fehler einfach und konkret.

## Gemeinsam verbessern

Verbessere nur wenige Aufgaben gleichzeitig.

## Kleine Frage an dich

Stelle eine kurze Rückfrage.

WICHTIG:
- Schreibe kurz.
- Schreibe natürlich.
- Schreibe wie ein echter Lehrer.
- Keine langen mathematischen Vorträge.
`;

    const safeHistory = history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-8)
      .map((m) => ({
        role: m.role,
        content: String(m.content || "").slice(0, 1500)
      }));

    const userContent = [
      {
        type: "text",
        text:
          message ||
          "Bitte analysiere das Foto gründlich und hilf mir beim Lernen."
      }
    ];

    if (imageBase64) {
      userContent.push({
        type: "image_url",
        image_url: {
          url: imageBase64,
          detail: "high"
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
        model: "gpt-4o",
        temperature: 0.1,
        max_tokens: 700,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          ...safeHistory,
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
      reply:
        data.choices?.[0]?.message?.content ||
        "Keine Antwort erhalten."
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}
