import { useState } from "react";
import ReactMarkdown from "react-markdown";

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text:
        "Hallo 👋\n\nLade zuerst ein Foto von der Aufgabe hoch, die du verbessern möchtest.\n\nDanach begleite ich dich Schritt für Schritt mit der BEBA-Strategie."
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
          "Neue Aufgabe gestartet ✅\n\nLade bitte wieder ein Foto der Aufgabe hoch."
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
      "Bitte hilf mir, diese Aufgabe mit der BEBA-Strategie zu verstehen.";
    const currentImage = image;

    setMessages((prev) => [
      ...prev,
      { role: "user", text: currentInput },
      { role: "assistant", text: "Ich schaue mir die Aufgabe genau an..." }
    ]);

    setInput("");
    setLoading(true);

    try {
      let imageBase64 = null;

      if (currentImage) {
        imageBase64 = await fileToBase64(currentImage);
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
        Lade ein Foto deiner Aufgabe hoch. Der Coach konzentriert sich nur auf
        diese Aufgabe und führt dich durch Beschreiben, Erklären, Begründen und
        Anwenden.
      </p>

      <div
        style={{
          padding: "18px",
          border: "1px solid #ddd",
          borderRadius: "12px",
          marginBottom: "20px",
          background: "#fafafa"
        }}
      >
        <h2>1. Aufgabe hochladen</h2>

       <input
  type="file"
  accept="image/*"
  capture="environment"
  onChange={handleImageUpload}
/>

        {imagePreview && (
          <div style={{ marginTop: "16px" }}>
            <img
              src={imagePreview}
              alt="Hochgeladene Aufgabe"
              style={{
                maxWidth: "100%",
                borderRadius: "10px",
                border: "1px solid #ccc"
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
        placeholder="Optional: Was war schwierig? Zum Beispiel: Ich verstehe den Ansatz nicht."
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
          {loading ? "Analysiere..." : "Aufgabe verbessern"}
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
