# AI Resume Builder

A modern web application that analyzes job descriptions and helps you create customized resumes that match job requirements. The application extracts skills, keywords, and requirements from job descriptions and generates professional PDF resumes.

## Features

- 🔍 **Job Description Analysis**: Paste a job description and automatically extract:
  - Required skills and keywords
  - Education requirements
  - Experience requirements
  - Recommendations for your resume

- ✏️ **Customizable Resume Builder**:
  - Add/remove sections (Profile, Skills, Education, Experience)
  - Dynamic form fields for multiple entries
  - Toggle sections on/off
  - Real-time editing

- 📄 **PDF Generation**: Generate professional PDF resumes with:
  - Clean, modern layout
  - Proper formatting
  - All your customized content

## Installation

1. **Install Node.js** (if not already installed)
   - Download from [nodejs.org](https://nodejs.org/)

2. **Install Dependencies**
   ```bash
   npm install
   ```

## Usage

1. **Start the Server**
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

### Environment variables (recommended for deployment)

Do **not** commit secrets to git. Instead, set these env vars on your machine / hosting provider:

- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `STRIPE_SECRET_KEY`

For local development, copy `.env.example` to `.env` and fill in values (the `.env` file is ignored by git).

2. **Open in Browser**
   - Navigate to `http://localhost:3000`

3. **Build Your Resume**:
   - **Step 1**: Paste a job description and click "Analyze Job Description"
   - **Step 2**: Fill in your information in the resume builder
   - Use the toggle switches to enable/disable sections
   - Add multiple education entries, work experiences, and skills
   - Click "Generate PDF Resume" to download your customized resume

## Project Structure

```
cvmakeing/
├── server.js          # Express server and API endpoints
├── package.json       # Dependencies and scripts
├── public/           # Frontend files
│   ├── index.html    # Main HTML file
│   ├── styles.css    # Styling
│   └── script.js     # Frontend JavaScript
└── generated-pdfs/   # Generated PDF files (created automatically)
```

## API Endpoints

- `POST /api/analyze-job` - Analyzes job description and extracts keywords
- `POST /api/generate-pdf` - Generates PDF resume from resume data
- `GET /api/download-pdf/:filename` - Downloads generated PDF

## Technologies Used

- **Backend**: Node.js, Express.js
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **PDF Generation**: PDFKit
- **Natural Language Processing**: Natural.js (for keyword extraction)

## Customization

You can customize the resume template by modifying the PDF generation code in `server.js`. The styling can be adjusted in `public/styles.css`.

## License

MIT
