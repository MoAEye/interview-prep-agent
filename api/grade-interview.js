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
            content: `You are an expert interview coach. Grade the interview and return ONLY valid JSON with this exact structure:
{
  "overall_score": <number 0-100>,
  "star_rating": <number 0-5>,
  "summary": "<2-3 sentence overall feedback>",
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"],
  "question_grades": [
    {
      "score": <number 0-10>,
      "what_was_good": "<feedback>",
      "what_to_improve": "<feedback>",
      "ideal_answer": "<ideal answer>"
    }
  ]
}`
          },
          {
            role: "user",
            content: `Grade these interview answers: ${JSON.stringify(answers)}`
          }
        ]
      })
    });

    const data = await response.json();
    const text = data.choices[0].message.content;
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    res.status(200).json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to grade interview" });
  }
}
