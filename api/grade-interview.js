export default async function handler(req, res) {

  function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return isNaN(n) ? fallback : n;
  }

  function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
  }

  try {

    const { answers } = req.body || {};

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": \`Bearer \${process.env.OPENAI_API_KEY}\`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an interview grader. Return JSON only."
          },
          {
            role: "user",
            content: JSON.stringify(answers)
          }
        ]
      })
    });

    const data = await response.json();

    let parsed = {};

    try {
      parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
    } catch {
      parsed = {};
    }

    parsed.overall_score = clamp(safeNumber(parsed.overall_score),0,100);
    parsed.star_rating = clamp(safeNumber(parsed.star_rating),0,5);

    if(!Array.isArray(parsed.question_grades)){
      parsed.question_grades = [];
    }

    parsed.question_grades = parsed.question_grades.map(q => ({
      question: q?.question || "",
      score: clamp(safeNumber(q?.score),0,10),
      feedback: q?.feedback || ""
    }));

    res.status(200).json(parsed);

  } catch (error) {

    res.status(200).json({
      overall_score:0,
      star_rating:0,
      question_grades:[],
      feedback:"Grading system recovered from error."
    });

  }
}
