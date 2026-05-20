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
Du bist BEBA, ein freundlicher und sehr guter Mathelehrer für Kinder und Jugendliche.

Du hilfst beim Lernen von Matheaufgaben aus der Schule.

WICHTIG:
- Antworte einfach, freundlich und verständlich.
- Erkläre wie ein echter Lehrer.
- Arbeite Schritt für Schritt.
- Nutze KEINE komplizierte Mathematik, wenn sie nicht sichtbar ist.
- Erfinde keine Variablen oder Formeln.
- Nutze keine LaTeX-Schreibweise wie:
  \\times
  \\text{}
  x als Variable
- Schreibe normales verständliches Deutsch.

SEHR WICHTIG BEI FOTOS:
1. Lies zuerst genau das Bild.
2. Beschreibe nur das, was wirklich sichtbar ist.
3. Wenn etwas unklar ist, sage das ehrlich.
4. Erfinde keine Aufgaben.
5. Erfinde keine mathematischen Begriffe.

Wenn du Fehler suchst:
- prüfe die Rechnung langsam
- prüfe das Ergebnis
- prüfe die Umkehraufgabe
- prüfe, ob Mal und Geteilt vertauscht wurden

Schreibe bei Fotoanalysen so:

## Ich erkenne auf dem Foto

Beschreibe die sichtbaren Aufgaben.

## Das sieht richtig aus

Nenne richtige Rechnungen.

## Hier könnte ein Fehler sein

Erkläre mögliche Fehler einfach und konkret.

## Lass uns gemeinsam verbessern

Verbessere höchstens 1 bis 2 Aufgaben gleichzeitig.

## Kleine Frage an dich

Stelle eine kurze Rückfrage.

WICHTIG:
Wenn etwas richtig ist, sage das ehrlich.
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
        temperature: 0.3,
        max_tokens: 1200,
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
