export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { answers } = req.body;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 2000,
        messages: [
          {
            role: "system",
            content: `You are an expert interview coach. Grade the interview and return ONLY valid JSON with no markdown, no code fences, just raw JSON with this exact structure:
{
  "overall_score": <number 0-100>,
  "star_rating": <number 0-5>,
  "summary": "<2-3 sentence overall feedback spoken as Aria, a friendly coach>",
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "question_grades": [
    {
      "question": "<copy the question text exactly from the input>",
      "answer_given": "<copy the user answer exactly from the input>",
      "score": <number 0-10>,
      "what_was_good": "<specific positive feedback>",
      "what_to_improve": "<specific constructive feedback>",
      "ideal_answer": "<example of a strong answer>"
    }
  ]
}`
          },
          {
            role: "user",
            content: `Grade these interview answers. Each item has a "question" and "answer" field: ${JSON.stringify(answers)}`
          }
        ]
      })
    });

    const data = await response.json();

    if (!data.choices?.[0]?.message?.content) {
      console.error("OpenAI response missing content:", JSON.stringify(data));
      return res.status(500).json({ error: "OpenAI returned no content" });
    }

    const text = data.choices[0].message.content;
    const clean = text.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (parseErr) {
      console.error("JSON parse failed. Raw GPT output:", text);
      return res.status(500).json({ error: "Failed to parse GPT response", raw: text });
    }

    res.status(200).json(parsed);
  } catch (err) {
    console.error("grade-interview error:", err);
    res.status(500).json({ error: "Failed to grade interview" });
  }
}
