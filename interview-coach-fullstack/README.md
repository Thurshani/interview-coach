# Interview Coach

An AI-powered mock interview application built with React, Node.js, Express, and Google Gemini API.

## Features

- Job role and experience level selection
- Five questions per interview
- Resume upload or copy-paste
- English or Tanglish feedback
- Scores, strengths, and improvement tips
- Downloadable HTML report
- Mobile-responsive interface

## Requirements

- Node.js 22 LTS
- A Google Gemini API key

## Setup

Install dependencies from the project root:

```bash
npm ci
```

Create `server/.env` using `server/.env.example`. Add your API key and model:

```env
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
```

Keep the other settings from `.env.example`.

Start the application:

```bash
npm run dev
```

Open http://127.0.0.1:5173 in your browser.

## Notes

No login or database is required. Interview sessions are temporary. Download your report before leaving the session.

Do not upload your `.env` file or API key to GitHub.