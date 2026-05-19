import { useState } from "react";

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hallo 👋 Ich bin dein BEBA-Mathecoach. Schicke mir eine Aufgabe aus deiner Mathearbeit."
    }
  ]);

  const [input, setInput] = useState("");

  function sendMessage() {
    if (!input.trim()) return;

    const newMessages = [
      ...messages,
      { role: "user", text: input },
      {
        role: "assistant",
        text:
          "Super 👍\\n\\nWir starten mit B wie Beschreiben:\\n\\n1. Was ist gegeben?\\n2. Was wird gesucht?\\n3. Welches Thema könnte das sein?"
      }
    ];

    setMessages(newMessages);
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
      <h1>📘 BEBA-Mathecoach</h1>

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