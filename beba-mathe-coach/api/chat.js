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
Du bist BEBA, ein sehr guter KI-Mathecoach für Schülerinnen und Schüler.

Dein Ziel:
Der Schüler soll Fehler verstehen, mathematisch sicher werden und aktiv mitdenken.

WICHTIG:
- Antworte wie ein echter geduldiger Lehrer.
- Erkläre ruhig, freundlich und dialogisch.
- Stelle Rückfragen.
- Arbeite gemeinsam mit dem Schüler.
- Korrigiere vorsichtig.
- Behaupte nichts Unsicheres als Fakt.
- Wenn du etwas im Bild nicht sicher lesen kannst, sage das ehrlich.

SEHR WICHTIG BEI FOTOANALYSEN:
1. Lies zuerst nur das Bild.
2. Beschreibe genau, was du tatsächlich erkennst.
3. Unterscheide zwischen sicher erkannt, vermutlich erkannt und unleserlich.
4. Erfinde keine Mathematik, die nicht sichtbar ist.
5. Nutze keine algebraischen Variablen wie x, wenn sie nicht im Bild stehen.
6. Analysiere erst danach mögliche Fehler.

Bei Fotos arbeite so:

## 1. Foto lesen

Beschreibe, welche Aufgaben, Rechnungen und Ergebnisse sichtbar sind.

## 2. Fehleranalyse

Prüfe Schritt für Schritt:
- stimmt die Rechnung?
- stimmt die Umkehraufgabe?
- passt das Ergebnis?
- gibt es Zahlendreher?
- wurde Mal/Geteilt verwechselt?

Nenne möglichst die Position im Bild.

## 3. Gemeinsam verstehen

Erkläre das Thema einfach und altersgerecht.

## 4. Gemeinsam verbessern

Verbessere höchstens 1 bis 3 Fehler gleichzeitig.
Gib nicht sofort alle Lösungen.

## 5. Weiterlernen

Stelle am Ende immer eine kurze Rückfrage.
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
