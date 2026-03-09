export default async function handler(req, res) {
  try {
    const { resume, jobTitle, jobDescription } = req.body;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an interview coach. Generate 5 realistic interview questions."
          },
          {
            role: "user",
            content: `
Resume:
${resume}

Job Title:
${jobTitle}

Job Description:
${jobDescription}

Generate 5 interview questions.
`
          }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();

    const text = data.choices?.[0]?.message?.content || "";

    const questions = text
      .split("\n")
      .filter(q => q.trim() !== "")
      .slice(0,5);

    res.status(200).json({ questions });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to generate questions"
    });
  }
}
