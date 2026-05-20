import { useState } from "react";
import ReactMarkdown from "react-markdown";

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text:
        "# 👋 Willkommen beim BEBA-Mathecoach\n\n" +
        "Fotografiere deine Aufgabe oder deinen Lösungsweg.\n\n" +
        "Ich lese die Handschrift, suche mögliche Fehler und helfe dir Schritt für Schritt mit BEBA."
    }
  ]);

  const [input, setInput] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);

  function getExifOrientation(arrayBuffer) {
    const view = new DataView(arrayBuffer);

    if (view.getUint16(0, false) !== 0xffd8) return 1;

    let offset = 2;

    while (offset < view.byteLength) {
      const marker = view.getUint16(offset, false);
      offset += 2;

      if (marker === 0xffe1) {
        offset += 2;

        if (view.getUint32(offset, false) !== 0x45786966) return 1;

        offset += 6;

        const little = view.getUint16(offset, false) === 0x4949;
        offset += view.getUint32(offset + 4, little);

        const tags = view.getUint16(offset, little);
        offset += 2;

        for (let i = 0; i < tags; i++) {
          const tagOffset = offset + i * 12;

          if (view.getUint16(tagOffset, little) === 0x0112) {
            return view.getUint16(tagOffset + 8, little);
          }
        }
      } else {
        offset += view.getUint16(offset, false);
      }
    }

    return 1;
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  async function compressAndRotateImage(file) {
    const arrayBuffer = await file.arrayBuffer();
    const orientation = getExifOrientation(arrayBuffer);

    const reader = new FileReader();

    const dataUrl = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const img = await loadImage(dataUrl);

    const maxSize = 900;
    const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);

    let width = Math.round(img.width * scale);
    let height = Math.round(img.height * scale);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if ([5, 6, 7, 8].includes(orientation)) {
      canvas.width = height;
      canvas.height = width;
    } else {
      canvas.width = width;
      canvas.height = height;
    }

    switch (orientation) {
      case 2:
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        break;
      case 3:
        ctx.translate(width, height);
        ctx.rotate(Math.PI);
        break;
      case 4:
        ctx.translate(0, height);
        ctx.scale(1, -1);
        break;
      case 5:
        ctx.rotate(0.5 * Math.PI);
        ctx.scale(1, -1);
        break;
      case 6:
        ctx.rotate(0.5 * Math.PI);
        ctx.translate(0, -height);
        break;
      case 7:
        ctx.rotate(0.5 * Math.PI);
        ctx.translate(width, -height);
        ctx.scale(-1, 1);
        break;
      case 8:
        ctx.rotate(-0.5 * Math.PI);
        ctx.translate(-width, 0);
        break;
      default:
        break;
    }

    ctx.drawImage(img, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", 0.55);
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setProcessingImage(true);

      const compressed = await compressAndRotateImage(file);

      setImageBase64(compressed);
      setImagePreview(compressed);
    } catch (error) {
      alert("Das Foto konnte nicht verarbeitet werden. Bitte versuche es nochmal.");
    } finally {
      setProcessingImage(false);
      e.target.value = "";
    }
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: userText,
          imageBase64
        })
      });

      clearTimeout(timeoutId);

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
            "Die Analyse hat zu lange gedauert oder die Verbindung wurde unterbrochen.\n\n" +
            "Bitte versuche es nochmal mit einem schärferen Foto und möglichst wenig Hintergrund."
        }
      ]);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
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
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <h1 style={{ textAlign: "center", marginBottom: "20px" }}>
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
                : "📖 Ich lese die Handschrift und analysiere die Aufgabe..."}
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
              {loading ? "Analysiere..." : "Senden"}
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
