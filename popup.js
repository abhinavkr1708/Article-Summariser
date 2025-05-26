document.getElementById("summarize").addEventListener("click", () => {
  const resultDiv = document.getElementById("result");
  const summaryType = document.getElementById("summary-type").value;
  resultDiv.innerHTML = '<div class="loader"><div>';
  /// Get User's Api Key
  chrome.storage.sync.get(["geminiApiKey"], ({ geminiApiKey }) => {
    if (!geminiApiKey) {
      resultDiv.textContent = "Set your API Key.By Going to the options of the Extensions.";
      return;
    }
    // Ask content.js for the page text
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.tabs.sendMessage(
        tab.id,
        { type: "GET_ARTICLE_TEXT" },
        async (res) => {
          if (!res || !res.text) {
            resultDiv.innerText = "No text found on this page";
            return;
          }
          // Send text to Gemini
          try {
            const summary = await getGeminiSummary(
              res.text,
              summaryType,
              geminiApiKey
            );
            resultDiv.innerText = summary;
          } catch (error) {
            resultDiv.textContent = `Error: +${
              error.message || "Failed to generate Summary."
            }`;
          }
        }
      );
    });
  });
});
async function getGeminiSummary(rawText, type, apiKey) {
  const max = 20000;
  const text = rawText.length > max ? rawText.slice(0, max) + "..." : rawText;
  const promptMap = {
    brief: `Summarize in 2-3 sentences :\n\n${text}`,
    detailed: `Give a detailed Summary :\n\n${text}`,
    bullets: `Summarize in 7-8 bullet points:(Start each line with "..."):\n\n${text}`,
  };
  const prompt = promptMap[type] || promptMap.brief;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
          },
        }),
      }
    );

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error?.message || "API request failed");
    }

    const data = await res.json();
    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No summary available."
    );
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to generate summary. Please try again later.");
  }
}
document.getElementById("copy-btn").addEventListener("click", () => {
  const txt = document.getElementById("result").innerText;
  if (!txt) return;
  navigator.clipboard.writeText(txt).then(() => {
    const btn = document.getElementById("copy-btn");
    const old = btn.textContent;
    btn.textContent = "Copied";
    setTimeout(() => (btn.textContent = old), 3000);
  });
});
