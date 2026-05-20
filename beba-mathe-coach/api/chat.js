async function sendMessage() {
  if (!input.trim()) return;

  const userMessage = {
    role: "user",
    text: input
  };

  setMessages((prev) => [...prev, userMessage]);

  const currentInput = input;
  setInput("");

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: currentInput
      })
    });

    const data = await response.json();

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        text: data.reply
      }
    ]);
  } catch (error) {
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        text: "Es gab einen Fehler."
      }
    ]);
  }
}