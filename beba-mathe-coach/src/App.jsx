import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

export default function App() {
  const fileInputRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text:
        "# 👋 Willkommen beim BEBA-Mathecoach\n\n" +
        "Fotografiere deine Aufgabe oder deinen Lösungsweg.\n\n" +
        "Ich erkenne Handschrift, analysiere Fehler und helfe dir Schritt für Schritt."
    }
  ]);

  const [input, setInput] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);

  function openCamera() {
    fileInputRef.current?.click();
  }

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

  async function sendMessage() {
    if (!input.trim() && !image) return;

    const userText =
      input.trim() ||
      "Bitte analysiere das Foto und finde mögliche Fehler.";

    const preview = imagePreview;

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text: userText,
        image: preview
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
          message: userText,
          imageBase64
        })
      });

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.reply || "Keine Antwort erhalten."
        }
      ]);

      setImage(null);
      setImagePreview("");
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `# Fehler\n\n${error.message}`
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
          "Fotografiere jetzt die nächste Matheaufgabe."
      }
    ]);

    setInput("");
    setImage(null);
    setImagePreview("");
  }

  return (
    <div
      style={{
        background: "#f5f7fb",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        padding: "20px"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "900px",
          display: "flex",
          flexDirection: "column"
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
            flex: 1,
            background: "white",
            borderRadius: "20px",
            padding: "20px",
            overflowY: "auto",
            minHeight: "70vh",
            boxShadow: "0 4px 18px rgba(0,0,0,0.08)"
          }}
        >
          {messages.map((msg, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                justifyContent:
                  msg.role === "user" ? "flex-end" : "flex-start",
                marginBottom: "18px"
              }}
            >
              <div
                style={{
                  background:
                    msg.role === "user" ? "#2563eb" : "#f1f5f9",
                  color: msg.role === "user" ? "white" : "#111",
                  padding: "16px",
                  borderRadius: "18px",
                  maxWidth: "85%",
                  lineHeight: "1.6",
                  fontSize: "16px"
                }}
              >
                {msg.image && (
                  <img
                    src={msg.image}
                    alt="Aufgabe"
                    style={{
                      width: "100%",
                      borderRadius: "12px",
                      marginBottom: "12px"
                    }}
                  />
                )}

                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            </div>
          ))}

          {loading && (
            <div
              style={{
                background: "#f1f5f9",
                padding: "16px",
                borderRadius: "16px",
                display: "inline-block"
              }}
            >
              📖 Ich lese die Handschrift und analysiere die Aufgabe...
            </div>
          )}
        </div>

        {imagePreview && (
          <div
            style={{
              marginTop: "14px",
              background: "white",
              padding: "12px",
              borderRadius: "14px"
            }}
          >
            <img
              src={imagePreview}
              alt="Vorschau"
              style={{
                width: "140px",
                borderRadius: "12px"
              }}
            />
          </div>
        )}

        <div
          style={{
            marginTop: "16px",
            background: "white",
            borderRadius: "18px",
            padding: "14px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Was verstehst du nicht?"
            rows={3}
            style={{
              width: "100%",
              border: "none",
              resize: "none",
              outline: "none",
              fontSize: "16px"
            }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "12px",
              gap: "10px"
            }}
          >
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={openCamera}
                style={{
                  border: "none",
                  background: "#2563eb",
                  color: "white",
                  borderRadius: "12px",
                  padding: "12px 16px",
                  cursor: "pointer",
                  fontSize: "18px"
                }}
              >
                📷
              </button>

              <button
                onClick={resetChat}
                style={{
                  border: "none",
                  background: "#e5e7eb",
                  borderRadius: "12px",
                  padding: "12px 16px",
                  cursor: "pointer"
                }}
              >
                Neu
              </button>
            </div>

            <button
              onClick={sendMessage}
              disabled={loading}
              style={{
                border: "none",
                background: "#16a34a",
                color: "white",
                borderRadius: "12px",
                padding: "12px 20px",
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              Senden
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
            style={{ display: "none" }}
          />
        </div>
      </div>
    </div>
  );
}
