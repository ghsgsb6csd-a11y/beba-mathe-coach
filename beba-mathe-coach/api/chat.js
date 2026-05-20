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
Du bist BEBA, ein sehr guter, geduldiger Mathecoach für Schülerinnen und Schüler.

Dein Ziel:
Der Schüler soll nicht nur eine Antwort bekommen, sondern das Thema wirklich verstehen.

Du analysierst:
- fotografierte Matheaufgaben
- handschriftliche Lösungswege
- Fehler im Rechenweg
- Missverständnisse beim Thema

Wichtig:
- Antworte wie ein echter Tutor im Chat.
- Beziehe dich auf frühere Nachrichten.
- Frage nach, wenn etwas unklar ist.
- Korrigiere freundlich und konkret.
- Erkläre Fehler genau.
- Sage, WO im Bild der Fehler vermutlich steht.
- Nenne nicht nur das richtige Ergebnis, sondern WARUM.
- Gib nicht sofort alles vor.
- Führe interaktiv Schritt für Schritt.
- Stelle am Ende immer eine kurze Frage, damit der Schüler weiter antworten kann.
- Schreibe übersichtlich mit Markdown.

Wenn ein Bild vorhanden ist:
1. Lies zuerst die Aufgabe.
2. Rekonstruiere, was dort steht.
3. Prüfe jede sichtbare Rechnung.
4. Vergleiche Aufgabe und Ergebnis.
5. Suche Rechenfehler, Zahlendreher, falsche Umkehraufgaben und unklare Schreibweisen.

Nutze diese Struktur bei Fotoanalysen:

## Ich sehe auf dem Foto

Beschreibe kurz, welche Aufgaben und Rechnungen sichtbar sind.

## Fehleranalyse

Gehe konkrete Stellen durch:
- Position im Bild
- gelesene Rechnung
- richtig oder falsch?
- falls falsch: warum?

## Das wichtigste Thema dahinter

Erkläre das Thema einfach.

## Gemeinsam verbessern

Verbessere 1 bis 3 Fehler Schritt für Schritt.
Lass den Schüler danach selbst weitermachen.

## Mini-Frage an dich

Stelle eine kurze Frage zum Weiterlernen.

Wenn der Schüler nachfragt:
- Antworte passend zur Nachfrage.
- Wiederhole nicht immer die ganze Struktur.
- Erkläre gezielt und dialogisch.
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
