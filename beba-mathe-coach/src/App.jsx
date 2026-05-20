import { useState } from "react";
import ReactMarkdown from "react-markdown";

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text:
        "Hallo 👋\n\nTippe auf **Foto aufnehmen** und fotografiere die Aufgabe oder deinen Lösungsweg.\n\nIch erkenne die Aufgabe, suche typische Fehler und helfe dir mit der BEBA-Strategie."
    }
  ]);

  const [input, setInput] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);

  function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setImage(file);
    setImagePreview(URL.createObjectURL(file));

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        text:
          "Foto erhalten ✅\n\nKlicke jetzt auf **Aufgabe analysieren**. Du kannst vorher noch kurz dazuschreiben, was du nicht verstanden hast."
      }
    ]);
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function resetTask() {
    setMessages([
      {
        role: "assistant",
        text:
          "Neue Aufgabe gestartet ✅\n\nTippe auf **Foto aufnehmen** und fotografiere die nächste Aufgabe."
      }
    ]);
    setInput("");
    setImage(null);
    setImagePreview("");
  }

  async function sendMessage() {
    if (!image && !input.trim()) return;

    const currentInput =
      input.trim() ||
      "Bitte analysiere das Foto. Lies die Handschrift, finde mögliche Fehler und hilf mir mit der BEBA-Strategie.";

    setMessages((prev) => [
      ...prev,
      { role: "user", text: currentInput },
      {
        role: "assistant",
        text: "Ich lese die Aufgabe und prüfe den Lösungsweg..."
      }
    ]);

    setInput("");
    setLoading(true);

    try {
      let imageBase64 = null;

      if (image) {
        imageBase64 = await fileToBase64(image);
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: currentInput,
          imageBase64
        })
      });

      const data = await response.json();

      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          text: data.reply || data.error || "Keine Antwort erhalten."
        }
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          text: "Fehler: " + error.message
        }
      ]);
    }

    setLoading(false);
  }

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        maxWidth: "900px",
        margin: "0 auto",
        padding: "24px",
        lineHeight: "1.5"
      }}
    >
      <h1>📘 BEBA-Mathecoach</h1>

      <p>
        Fotografiere deine Aufgabe oder deinen Lösungsweg. Der Coach liest das
        Bild, beschreibt mögliche Fehlerstellen und führt dich Schritt für
        Schritt durch BEBA.
      </p>

      <div
        style={{
          padding: "20px",
          border: "1px solid #ddd",
          borderRadius: "14px",
          marginBottom: "20px",
          background: "#fafafa"
        }}
      >
        <h2>1. Foto aufnehmen</h2>

        <label
          style={{
            display: "inline-block",
            padding: "14px 22px",
            background: "#2563eb",
            color: "white",
            borderRadius: "12px",
            fontSize: "18px",
            cursor: "pointer",
            marginTop: "10px"
          }}
        >
          📸 Foto aufnehmen
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
            style={{ display: "none" }}
          />
        </label>

        {imagePreview && (
          <div style={{ marginTop: "18px" }}>
            <h3>Dein Foto</h3>
            <img
              src={imagePreview}
              alt="Hochgeladene Aufgabe"
              style={{
                maxWidth: "100%",
                borderRadius: "12px",
                border: "2px solid #ddd"
              }}
            />
          </div>
        )}
      </div>

      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: "12px",
          padding: "20px",
          minHeight: "420px",
          marginBottom: "20px",
          background: "white"
        }}
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              marginBottom: "18px",
              textAlign: msg.role === "user" ? "right" : "left"
            }}
          >
            <div
              style={{
                display: "inline-block",
                textAlign: "left",
                padding: "14px 16px",
                borderRadius: "12px",
                background: msg.role === "user" ? "#dbeafe" : "#f3f4f6",
                maxWidth: "92%"
              }}
            >
              <ReactMarkdown>{msg.text}</ReactMarkdown>
            </div>
          </div>
        ))}
      </div>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Optional: Was war schwierig? Zum Beispiel: Ich weiß nicht, wo mein Fehler ist."
        rows={4}
        style={{
          width: "100%",
          padding: "12px",
          marginBottom: "12px",
          borderRadius: "10px",
          border: "1px solid #ccc",
          fontSize: "16px"
        }}
      />

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button
          onClick={sendMessage}
          disabled={loading}
          style={{
            padding: "12px 22px",
            fontSize: "16px",
            cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "Analysiere..." : "Aufgabe analysieren"}
        </button>

        <button
          onClick={resetTask}
          style={{
            padding: "12px 22px",
            fontSize: "16px",
            cursor: "pointer"
          }}
        >
          Neue Aufgabe starten
        </button>
      </div>
    </div>
  );
}
