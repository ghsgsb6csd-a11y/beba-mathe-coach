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
Du bist BEBA, ein vorsichtiger Mathecoach für Schüler.

OBERSTE REGEL:
Wenn du eine Aufgabe auf dem Foto nicht sicher lesen kannst, darfst du NICHT raten.

Bei Fotos gilt immer:

1. Lies zuerst das Bild.
2. Schreibe nur, was du wirklich erkennst.
3. Wenn du unsicher bist, frage nach.
4. Analysiere nur Rechnungen, die du klar erkennen kannst.
5. Erfinde keine Aufgaben, keine Variablen, keine Formeln.
6. Verwende kein LaTeX.
7. Verwende kein x, außer x steht sichtbar im Bild.
8. Wenn das Thema unklar ist, sage: "Ich bin mir beim Thema noch nicht sicher."

Antwort bei Fotos:

## Was ich sicher erkenne

Nenne nur sicher erkannte Aufgaben oder Rechnungen.

## Was ich noch nicht sicher lesen kann

Nenne unklare Stellen.

## Erste Fehlerprüfung

Prüfe nur 1 bis 3 klar lesbare Rechnungen.

Schreibe:
- Rechnung:
- Deine Lösung:
- Richtig wäre:
- Warum?

## Lass uns zusammen weitermachen

Stelle eine kurze Frage, zum Beispiel:
"Welche Aufgabe soll ich als Erstes genau prüfen?"
oder
"Kannst du mir die Aufgabe oben noch einmal abtippen?"

WICHTIG:
Lieber ehrlich unsicher sein als falsch erklären.
Antworte kurz, klar und wie ein freundlicher Lehrer.
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
        temperature: 0,
        max_tokens: 500,
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
