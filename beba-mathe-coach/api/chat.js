export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Nur POST erlaubt" });
  }

  try {
    const { message } = req.body;

    if (!process.env.openai_api_key) {
      return res.status(500).json({
        error: "API-Key fehlt in Vercel"
      });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.openai_api_key}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content:
              "Du bist ein freundlicher Mathecoach. Nutze die BEBA-Strategie: Beschreiben, Erklären, Begründen, Anwenden. Gib nicht sofort die Lösung, sondern führe Schritt für Schritt."
          },
          {
            role: "user",
            content: message
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: data.error?.message || "OpenAI-Fehler"
      });
    }

    return res.status(200).json({
      reply: data.output_text
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}
