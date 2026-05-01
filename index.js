import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Load env FIRST
dotenv.config();

const app = express();
const PORT = 3000;

// ─── MIDDLEWARE ─────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── DEBUG ──────────────────────────────────────────────
console.log("Loaded API KEY:", process.env.OPENROUTER_API_KEY);

// ─── ROUTES ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("Server is working 🚀");
});

app.post("/roadmap", async (req, res) => {
  const { from, to, dur } = req.body;

  // Validate input
  if (!from || !to || !dur) {
    return res.status(400).json({
      error: "Missing required fields: from, to, dur",
    });
  }

  const weekCount =
    dur.includes("4") ? 4 :
    dur.includes("8") ? 8 :
    dur.includes("12") ? 12 : 16;

  const prompt = `
You are a journey architect.

Create a HIGHLY PERSONAL, CINEMATIC roadmap from "${from}" to "${to}" over ${dur}.

STRICT RULES:
- Return ONLY valid JSON
- No markdown, no backticks, no explanation
- Keep language poetic but actionable

Format:
{
  "subtitle": "Short poetic sentence (under 20 words)",
  "weeks": [
    {
      "number": 1,
      "title": "Evocative poetic title",
      "focus": "One sentence focus",
      "steps": ["Action 1", "Action 2", "Action 3"],
      "tools": ["Tool 1", "Tool 2"]
    }
  ]
}

Generate exactly ${weekCount} weeks.
`;

  try {
    console.log("AUTH HEADER:", `Bearer ${process.env.OPENROUTER_API_KEY}`);

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "PathAI",
        },
        body: JSON.stringify({
         model: 'openai/gpt-4o-mini',
          messages: [{ role: "user", content: prompt }],
        }),
      }
    );

    const data = await response.json();

    console.log("─── RAW OPENROUTER RESPONSE ───");
    console.log(JSON.stringify(data, null, 2));

    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content returned.");
      return res.json({
        subtitle: "Your journey begins here.",
        weeks: [],
      });
    }

    // Clean AI output
    const cleaned = content
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    try {
      const parsed = JSON.parse(cleaned);
      return res.json(parsed);
    } catch (err) {
      console.error("─── PARSE ERROR ───");
      console.error(err.message);
      console.error("RAW TEXT:", cleaned);

      return res.json({
        subtitle: "Your journey begins here.",
        weeks: [],
      });
    }

  } catch (err) {
    console.error("─── FETCH ERROR ───");
    console.error(err.message);

    return res.status(500).json({
      error: "Failed to connect to AI service",
    });
  }
});

// ─── START SERVER ───────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
