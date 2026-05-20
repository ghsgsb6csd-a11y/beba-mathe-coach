import { useState } from "react";

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text:
        "Hallo 👋 Ich bin dein BEBA-Mathecoach.\n\nBitte lade zuerst ein Foto von der Aufgabe hoch, die du verbessern möchtest. Danach begleite ich dich Schritt für Schritt."
    }
  ]);

  const [input, setInput] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

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
          "Super, das Foto ist ausgewählt. Schreibe jetzt kurz dazu, was du verbessern möchtest — oder klicke direkt auf „Absenden“."
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

  async function sendMessage() {
    if (!input.trim() && !image) return;

    const currentInput = input || "Bitte analysiere diese Matheaufgabe mit der BEBA-Strategie.";
    const currentImage = image;

    setMessages((prev) => [
      ...prev,
      { role: "user", text: currentInput },
      { role: "assistant", text: "Ich schaue mir die Aufgabe an..." }
    ]);

    setInput("");

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
  }

  return (
    <div style={{ fontFamily: "Arial", maxWidth: "850px", margin: "0 auto", padding: "20px" }}>
      <h1>📘 BEBA-Mathecoach</h1>

      <p>
        Lade ein Foto deiner Aufgabe hoch. Die KI hilft dir, sie mit der BEBA-Strategie zu verstehen.
      </p>

      <div style={{ marginBottom: "20px", padding: "15px", border: "1px solid #ddd", borderRadius: "10px" }}>
        <strong>1. Foto hochladen</strong>
        <br />
        <input type="file" accept="image/*" onChange={handleImageUpload} style={{ marginTop: "10px" }} />

        {imagePreview && (
          <div style={{ marginTop: "15px" }}>
            <img
              src={imagePreview}
              alt="Hochgeladene Aufgabe"
              style={{ maxWidth: "100%", borderRadius: "10px", border: "1px solid #ccc" }}
            />
          </div>
        )}
      </div>

      <div style={{ border: "1px solid #ccc", borderRadius: "10px", padding: "20px", minHeight: "400px", marginBottom: "20px" }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ marginBottom: "15px", textAlign: msg.role === "user" ? "right" : "left" }}>
            <div
              style={{
                display: "inline-block",
                padding: "12px",
                borderRadius: "10px",
                background: msg.role === "user" ? "#dbeafe" : "#f3f4f6",
                whiteSpace: "pre-wrap",
                lineHeight: "1.5",
                maxWidth: "90%"
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Optional: Was möchtest du verbessern? Zum Beispiel: Ich habe den Ansatz nicht verstanden."
        rows={4}
        style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
      />

      <button onClick={sendMessage} style={{ padding: "12px 22px", fontSize: "16px", cursor: "pointer" }}>
        Aufgabe absenden
      </button>
    </div>
  );
}
