// Vercel Serverless Function — /api/parse-cv
// Accepts extracted CV text, calls DeepSeek to return structured profile JSON.
// PDF text extraction is done client-side via PDF.js to avoid server-side deps.

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-fc9834f46cb04c19ad686778570464b9'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { text } = req.body || {}
  if (!text || text.trim().length < 50) {
    return res.status(400).json({ error: 'CV text is too short or empty. Make sure the PDF contains selectable text (not a scanned image).' })
  }

  const prompt = `You are a CV parser. Extract structured profile information from the CV text below and return ONLY a valid JSON object — no markdown, no explanation.

Required JSON schema:
{
  "name": "full legal name",
  "email": "email address or empty string",
  "phone": "phone number or empty string",
  "location": "current city and country",
  "headline": "concise professional headline, e.g. 'Data Analyst & IT Specialist | BI, Automation & Infrastructure'",
  "targetRoles": "comma-separated list of 3-5 job titles this person would be well-suited for, inferred from their experience",
  "narrative": "2-3 sentence professional summary that would work in a cover letter",
  "superpowers": ["specific skill or achievement 1", "specific skill or achievement 2", "specific skill or achievement 3", "specific skill or achievement 4", "specific skill or achievement 5"],
  "linkedin": "LinkedIn URL if present, otherwise empty string",
  "visaStatus": "visa or work authorisation status if mentioned, otherwise empty string"
}

CV text:
${text.slice(0, 10000)}`

  try {
    const aiRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 1200,
        temperature: 0.1,
      }),
    })

    if (!aiRes.ok) {
      const err = await aiRes.text()
      return res.status(502).json({ error: `DeepSeek API error ${aiRes.status}: ${err.slice(0, 200)}` })
    }

    const aiData = await aiRes.json()
    const content = aiData.choices?.[0]?.message?.content
    if (!content) return res.status(502).json({ error: 'Empty response from AI' })

    const profile = JSON.parse(content)
    return res.json({ profile })
  } catch (e) {
    return res.status(500).json({ error: 'Failed to parse CV: ' + e.message })
  }
}
