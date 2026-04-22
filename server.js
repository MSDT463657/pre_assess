import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import express from "express";
import OpenAI from "openai";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");

const systemPrompt =
  "You are a cybersecurity training coach preparing Saudi Aramco employees for their Information Security Essentials assessment.\n\n" +
  "The assessment covers 8 topics: Social Engineering, Data Security, Access Control and Authentication, Password Protection, Mobile Security, Social Media Security, Secure Internet Browsing, and Cloud Security.\n\n" +
  "Your role:\n" +
  "- When a learner selects a topic, ask them a short open question to probe their understanding of that topic\n" +
  "- When they answer, give brief specific feedback and a follow-up question or a short scenario to test their knowledge\n" +
  "- Keep all responses under 100 words\n" +
  "- Never lecture unprompted — ask first, explain after\n" +
  "- Periodically (every 3-4 exchanges) check if the learner feels ready for the assessment\n" +
  "- If the learner demonstrates strong understanding across 2 or more topics, proactively tell them they appear ready and suggest they proceed to the assessment\n" +
  "- If the learner is struggling, focus on that topic and give a simple plain-English explanation before moving on\n" +
  "- Tone: encouraging, direct, like a good trainer\n" +
  "- Never use bullet points in responses";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(express.json());
app.use(express.static(publicDir));

app.post("/api/chat", async (req, res) => {
  try {
    const { history } = req.body || {};

    if (!Array.isArray(history)) {
      return res.status(400).json({ error: "history must be an array" });
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...history
        .filter(
          (entry) =>
            entry &&
            (entry.role === "user" || entry.role === "assistant") &&
            typeof entry.content === "string" &&
            entry.content.trim().length > 0
        )
        .map((entry) => ({ role: entry.role, content: entry.content.trim() }))
    ];

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 200
    });

    const reply = completion.choices?.[0]?.message?.content?.trim() || "";
    return res.json({ reply });
  } catch (error) {
    const detail =
      error && typeof error === "object" && "message" in error
        ? String(error.message)
        : "Unknown error";
    return res.status(500).json({
      error: "Failed to generate reply",
      detail
    });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(port, () => {
  console.log(`Pre-assessment app running on port ${port}`);
});
