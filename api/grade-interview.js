export default async function handler(req, res) {
  try {
    const { text } = req.body;

    function safeNumber(value, fallback = 0) {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
      return fallback;
    }

    function clamp(n, min, max) {
      return Math.min(Math.max(n, min), max);
    }

    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {};
    }

    parsed.overall_score = clamp(safeNumber(parsed.overall_score, 0), 0, 100);
    parsed.star_rating = clamp(safeNumber(parsed.star_rating, 0), 0, 5);

    if (!Array.isArray(parsed.question_grades)) {
      parsed.question_grades = [];
    }

    parsed.question_grades = parsed.question_grades.map((q) => ({
      question: q?.question || "",
      score: clamp(safeNumber(q?.score, 0), 0, 10),
      feedback: q?.feedback || "No feedback provided"
    }));

    res.status(200).json(parsed);

  } catch (error) {
    console.error("Grading error:", error);

    res.status(200).json({
      overall_score: 0,
      star_rating: 0,
      question_grades: [],
      feedback: "Grading failed but system recovered safely."
    });
  }
}
