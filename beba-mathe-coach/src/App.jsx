import { useState } from "react";
import ReactMarkdown from "react-markdown";

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text:
        "# 👋 Willkommen beim BEBA-Mathecoach\n\n" +
        "Fotografiere deine Aufgabe oder deinen Lösungsweg.\n\n" +
        "Ich lese zuerst das Foto, prüfe dann mögliche Fehler und lerne mit dir Schritt für Schritt."
    }
  ]);

  const [input, setInput] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);

  async function compressImage(file) {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = dataUrl;
    });

    const maxSize = 1200;
    const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);

    const width = Math.round(img.width * scale);
    const height = Math.round(img.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", 0.72);
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setProcessingImage(true);
      const compressed = await compressImage(file);
      setImageBase64(compressed);
      setImagePreview(compressed);
    } catch {
      alert("Das Foto konnte nicht verarbeitet werden. Bitte versuche es erneut.");
    } finally {
      setProcessingImage(false);
      e.target.value = "";
    }
  }

  async function sendMessage() {
    if (!input.trim() && !imageBase64) return;

    const userText =
      input.trim() ||
      "Bitte lies das Foto, finde mögliche Fehler und hilf mir beim Verstehen.";

    const userMessage = {
      role: "user",
      text: userText,
      image: imagePreview
    };

    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: userText,
          imageBase64,
          history: updatedMessages
            .filter((m) => !m.image)
            .slice(-8)
            .map((m) => ({
              role: m.role,
              content: m.text
            }))
        })
      });

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.reply || data.error || "Keine Antwort erhalten."
        }
      ]);

      setImageBase64("");
      setImagePreview("");
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text:
            "## Verbindung unterbrochen\n\n" +
            "Die Anfrage hat nicht geklappt. Bitte versuche es nochmal mit einem kleineren oder schärferen Foto."
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  function resetChat() {
    setMessages([
      {
        role: "assistant",
        text:
          "# Neue Aufgabe ✅\n\n" +
          "Fotografiere eine Aufgabe oder stelle direkt eine Frage."
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
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <h1 style={{ textAlign: "center" }}>📘 BEBA-Mathecoach</h1>

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
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                marginBottom: "16px"
              }}
            >
              <div
                style={{
                  maxWidth: "90%",
                  background: msg.role === "user" ? "#2563eb" : "#f1f5f9",
                  color: msg.role === "user" ? "white" : "#111827",
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

                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            </div>
          ))}

          {(loading || processingImage) && (
            <div
              style={{
                display: "inline-block",
                background: "#f1f5f9",
                padding: "14px",
                borderRadius: "16px",
                color: "#555"
              }}
            >
              {processingImage
                ? "📷 Ich bereite das Foto vor..."
                : "🧠 Ich lese zuerst das Foto und prüfe dann die Aufgabe..."}
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
            <p style={{ marginTop: 0 }}>Ausgewähltes Foto:</p>

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
            onChange={(e) => setInput(e.target.value)}
            placeholder="Frag nach: Was ist falsch? Warum? Wie rechne ich weiter?"
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
              disabled={loading || processingImage}
              style={{
                border: "none",
                background: loading || processingImage ? "#9ca3af" : "#16a34a",
                color: "white",
                borderRadius: "12px",
                padding: "12px 18px",
                cursor: loading || processingImage ? "not-allowed" : "pointer",
                fontWeight: "bold"
              }}
            >
              {loading ? "Denke..." : "Senden"}
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
