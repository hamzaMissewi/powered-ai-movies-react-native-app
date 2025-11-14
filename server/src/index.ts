import dotenv from "dotenv";
import express, { Request, Response } from "express";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

if (!GROQ_API_KEY) {
  console.error("GROQ_API_KEY missing. Set it in .env");
  process.exit(1);
}

type IncomingRequest = {
  // either single message or full messages array
  message?: string;
  messages?: { role: "user" | "system" | "assistant"; content: string }[];
  model?: string;
  temperature?: number;
};

app.post("/api/groq", async (req: Request, res: Response) => {
  let body: IncomingRequest = req.body || {};

  // Handle the stream
  // if (req.body && typeof req.body.getReader === "function") {
  //   const reader = (req.body as ReadableStream).getReader();
  //   const decoder = new TextDecoder();
  //   let done = false;

  //   while (!done) {
  //     const { value, done: doneReading } = await reader.read();
  //     done = doneReading;
  //     if (value) {
  //       body += decoder.decode(value);
  //     }
  //   }

  //   // Parse the JSON
  //   const parsedBody = JSON.parse(body) as IncomingRequest;
  //   // Use parsedBody instead of req.body
  //   body = parsedBody;
  // }

  // Build messages for Groq Chat API
  const messages = body.messages ?? [
    {
      role: "user",
      content: body.message ?? "",
    },
  ];

  const payload = {
    model: body.model ?? "llama-3.1-8b-instant",
    messages,
    max_tokens: 800,
    temperature: body.temperature ?? 0.2,
  };

  try {
    const response = await fetch(GROQ_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Groq API error", response.status, text);
      return res
        .status(502)
        .json({ error: "Groq API error", status: response.status, text });
    }

    const json = await response.json();

    // Groq's Chat returns OpenAI-like shape: choices[0].message.content
    const content = json?.choices?.[0]?.message?.content ?? json?.text ?? null;

    if (!content) {
      return res
        .status(500)
        .json({ error: "No content returned from Groq", raw: json });
    }

    return res.json({ content, raw: json });
  } catch (err: any) {
    console.error("Server error", err);
    return res.status(500).json({ error: err.message ?? String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Groq proxy server listening at http://localhost:${PORT}`);
});
