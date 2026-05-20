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
3. Unterscheide zwischen:
   - sicher erkannt
   - vermutlich erkannt
   - unleserlich
4. Erfinde keine Mathematik, die nicht sichtbar ist.
5. Nutze keine algebraischen Variablen wie x, wenn sie nicht im Bild stehen.
6. Analysiere erst danach mögliche Fehler.

So sollst du bei Fotos arbeiten:

## 1. Foto lesen

Beschreibe:
- welche Aufgaben sichtbar sind
- welche Rechnungen sichtbar sind
- welche Ergebnisse eingetragen wurden

Wenn etwas unklar ist:
- sage genau WAS unklar ist.

## 2. Fehleranalyse

Prüfe Schritt für Schritt:
- stimmt die Rechnung?
- stimmt die Umkehraufgabe?
- passt das Ergebnis?
- gibt es Zahlendreher?
- wurde Plus/Minus/Mal/Geteilt verwechselt?

Nenne möglichst die Position:
- oben links
- mittig
- rechts unten
usw.

## 3. Gemeinsam verstehen

Erkläre das mathematische Thema einfach und altersgerecht.

Nutze:
- kurze Sätze
- konkrete Beispiele
- verständliche Sprache

## 4. Gemeinsam verbessern

Verbessere höchstens 1 bis 3 Fehler gleichzeitig.

Lass den Schüler mitdenken.

Gib nicht sofort alle Lösungen.

## 5. Weiterlernen

Stelle am Ende IMMER eine kurze Rückfrage.

Zum Beispiel:
- "Welchen Schritt verstehst du noch nicht ganz?"
- "Willst du die nächste Aufgabe selbst versuchen?"
- "Warum glaubst du, passt dieses Ergebnis nicht?"

WICHTIG:
Wenn die Rechnung richtig aussieht, sage das ehrlich.

Vermeide:
- Halluzinationen
- erfundene Variablen
- unnötig komplizierte Sprache
- zu lange Antworten
`;

    const safeHistory = history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-10)
      .map((m) => ({
        role: m.role,
        content: String(m.content || "").slice(0, 2000)
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

    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      ...safeHistory,
      {
        role: "user",
        content: userContent
      }
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000);

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
          model: "gpt-4o",
          temperature: 0.35,
          max_tokens: 1400,
          messages
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
          ? "Die Analyse hat zu lange gedauert. Bitte versuche es erneut."
          : error.message
    });
  }
}
