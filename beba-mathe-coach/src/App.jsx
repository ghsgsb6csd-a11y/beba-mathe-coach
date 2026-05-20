import { useState } from "react";

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hallo 👋 Ich bin dein BEBA-Mathecoach."
    }
  ]);

  const [input, setInput] = useState("");

  function sendMessage() {
    alert("Button funktioniert!");

    if (!input.trim()) return;

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        text: input
      },
      {
        role: "assistant",
        text: "Test erfolgreich: React funktioniert."
      }
    ]);

    setInput("");
  }

  return (
    <div
      style={{
        fontFamily: "Arial",
        maxWidth: "800px",
        margin: "0 auto",
        padding: "20px"
      }}
    >
     <h1>TEST VERSION 123</h1>

      <p>
        Verstehe schwierige Aufgaben aus deiner Mathearbeit Schritt für Schritt.
      </p>

      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: "10px",
          padding: "20px",
          minHeight: "400px",
          marginBottom: "20px"
        }}
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              marginBottom: "15px",
              textAlign: msg.role === "user" ? "right" : "left"
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "10px",
                borderRadius: "10px",
                background:
                  msg.role === "user" ? "#dbeafe" : "#f3f4f6"
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
        placeholder="Schreibe deine Aufgabe hier hinein..."
        rows={4}
        style={{
          width: "100%",
          padding: "10px",
          marginBottom: "10px"
        }}
      />

      <button
        onClick={sendMessage}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          cursor: "pointer"
        }}
      >
        Nachricht senden
      </button>
    </div>
  );
}
