import { useState } from "react";
import ReactMarkdown from "react-markdown";

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text:
        "# 👋 Willkommen beim BEBA-Mathecoach\n\n" +
        "Fotografiere deine Aufgabe oder deinen Lösungsweg.\n\n" +
        "Ich erkenne Handschrift, finde mögliche Fehler und helfe dir Schritt für Schritt."
    }
  ]);

  const [input, setInput] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = () => {
        img.src = reader.result;
      };

      img.onload = () => {
        const canvas = document.createElement("canvas");

        const maxWidth = 1000;
        const scale = Math.min(maxWidth / img.width, 1);

        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext("2d");

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const compressedBase64 = canvas.toDataURL(
          "image/jpeg",
          0.7
        );

        resolve(compressedBase64);
      };

      img.onerror = reject;
      reader.onerror = reject;

      reader.readAsDataURL(file);
    });
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];

    if (!file) return;

    try {
      setLoading(true);

      const compressed = await compressImage(file);

      setImageBase64(compressed);
      setImagePreview(compressed);
    } catch (error) {
      alert("Fehler beim Verarbeiten des Bildes.");
    }

    setLoading(false);
  }

  async function sendMessage() {
    if (!input.trim() && !imageBase64) return;

    const userText =
      input.trim() ||
      "Bitte analysiere das Foto und finde mögliche Fehler.";

    const currentImage = imagePreview;

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text: userText,
        image: currentImage
      }
    ]);

    setInput("");
    setLoading(true);

    try {
      console.log("Sende Anfrage...");

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: userText,
          imageBase64
        })
      });

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text:
            data.reply ||
            data.error ||
            "Keine Antwort erhalten."
        }
      ]);

      setImageBase64("");
      setImagePreview("");
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text:
            "# Fehler\n\n" +
            (error.message || "Unbekannter Fehler")
        }
      ]);
    }

    setLoading(false);
  }

  function resetChat() {
    setMessages([
      {
        role: "assistant",
        text:
          "# Neue Aufgabe ✅\n\n" +
          "Fotografiere jetzt deine nächste Matheaufgabe."
      }
    ]);

    setInput("");
    setImageBase64("");
    setImagePreview("");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        fontFamily: "Arial, sans-serif",
        padding: "16px",
        boxSizing: "border-box"
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto"
        }}
      >
        <h1
          style={{
            textAlign: "center",
            marginBottom: "20px"
          }}
        >
          📘 BEBA-Mathecoach
        </h1>

        <div
          style={{
            background: "white",
            borderRadius: "18px",
            padding: "16px",
            minHeight: "60vh",
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            marginBottom: "16px"
          }}
        >
          {messages.map((msg, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                justifyContent:
                  msg.role === "user"
                    ? "flex-end"
                    : "flex-start",
                marginBottom: "16px"
              }}
            >
              <div
                style={{
                  maxWidth: "90%",
                  background:
                    msg.role === "user"
                      ? "#2563eb"
                      : "#f1f5f9",
                  color:
                    msg.role === "user"
                      ? "white"
                      : "#111827",
                  borderRadius: "18px",
                  padding: "14px",
                  lineHeight: "1.6",
                  fontSize: "16px",
                  overflowWrap: "break-word"
                }}
              >
                {msg.image && (
                  <img
                    src={msg.image}
                    alt="Aufgabe"
                    style={{
                      width: "100%",
                      maxHeight: "320px",
                      objectFit: "contain",
                      borderRadius: "12px",
                      marginBottom: "12px",
                      background: "white"
                    }}
                  />
                )}

                <ReactMarkdown>
                  {msg.text}
                </ReactMarkdown>
              </div>
            </div>
          ))}

          {loading && (
            <div
              style={{
                display: "inline-block",
                background: "#f1f5f9",
                padding: "14px",
                borderRadius: "16px",
                color: "#555"
              }}
            >
              📖 Ich lese die Handschrift und analysiere die Aufgabe...
            </div>
          )}
        </div>

        {imagePreview && (
          <div
            style={{
              background: "white",
              borderRadius: "14px",
              padding: "12px",
              marginBottom: "14px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
            }}
          >
            <p style={{ marginTop: 0 }}>
              Ausgewähltes Foto:
            </p>

            <img
              src={imagePreview}
              alt="Vorschau"
              style={{
                width: "140px",
                borderRadius: "12px",
                display: "block",
                marginBottom: "10px"
              }}
            />

            <button
              onClick={() => {
                setImageBase64("");
                setImagePreview("");
              }}
              style={{
                border: "none",
                background: "#e5e7eb",
                padding: "10px 14px",
                borderRadius: "10px",
                cursor: "pointer"
              }}
            >
              Foto entfernen
            </button>
          </div>
        )}

        <div
          style={{
            background: "white",
            borderRadius: "18px",
            padding: "14px",
            boxShadow: "0 4px 14px rgba(0,0,0,0.08)"
          }}
        >
          <textarea
            value={input}
            onChange={(e) =>
              setInput(e.target.value)
            }
            placeholder="Was verstehst du nicht?"
            rows={3}
            style={{
              width: "100%",
              border: "1px solid #ddd",
              borderRadius: "12px",
              padding: "12px",
              fontSize: "16px",
              boxSizing: "border-box",
              resize: "none"
            }}
          />

          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "12px",
              flexWrap: "wrap"
            }}
          >
            <label
              style={{
                background: "#2563eb",
                color: "white",
                borderRadius: "12px",
                padding: "12px 16px",
                cursor: "pointer",
                fontSize: "16px"
              }}
            >
              📷 Foto aufnehmen

              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: "none" }}
              />
            </label>

            <button
              onClick={sendMessage}
              disabled={loading}
              style={{
                border: "none",
                background:
                  loading
                    ? "#9ca3af"
                    : "#16a34a",
                color: "white",
                borderRadius: "12px",
                padding: "12px 18px",
                cursor:
                  loading
                    ? "not-allowed"
                    : "pointer",
                fontWeight: "bold"
              }}
            >
              {loading
                ? "Analysiere..."
                : "Senden"}
            </button>

            <button
              onClick={resetChat}
              style={{
                border: "none",
                background: "#e5e7eb",
                borderRadius: "12px",
                padding: "12px 18px",
                cursor: "pointer"
              }}
            >
              Neu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
