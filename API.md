# CV Maker API Documentation

Base URL: `https://<your-app-name>.onrender.com` (or `http://localhost:3000` locally)

This API provides endpoints for analyzing job descriptions, regenerating resume sections, and generating PDF resumes with AI assistance.

## Authentication
Currently, the API uses header-based authentication for AI services.
-   `x-openai-key`: (Optional) Your OpenAI API Key.
-   `x-gemini-key`: (Optional) Your Google Gemini API Key.
-   `x-undetectable-key`: (Optional) Your Undetectable AI API Key.

If these headers are not provided, the server attempts to separate keys from its environment variables (`OPENAI_API_KEY`, `GEMINI_API_KEY`, etc.).

## Endpoints

### 1. Analyze Job Description
Analyzes a job description text to extract skills, keywords, and generate a summary/cover letter.

-   **URL**: `/api/analyze-job`
-   **Method**: `POST`
-   **Headers**: `Content-Type: application/json`
-   **Body**:
    ```json
    {
      "jobDescription": "Full text of the job description...",
      "userName": "John Doe"
    }
    ```
-   **Success Response** (200 OK):
    ```json
    {
      "extractedSkills": ["React", "Node.js"],
      "extractedKeywords": [{"skill": "React", "category": "technical"}],
      "suggestedTitle": "Frontend Developer",
      "professionalSummary": "...",
      "suggestedCoverLetter": "...",
      "recommendations": [...]
    }
    ```

### 2. Regenerate Section
Regenerates specific sections of the resume based on the job description and user context.

-   **URL**: `/api/regenerate-section`
-   **Method**: `POST`
-   **Body**:
    ```json
    {
      "jobDescription": "...",
      "userName": "John Doe",
      "sectionType": "summary" | "skills" | "experience" | "achievements" | "cover-letter",
      "userContext": {
        "title": "Current Role",
        "skills": ["Skill1", "Skill2"],
        "experience": [{ "company": "...", "position": "..." }]
      }
    }
    ```
-   **Success Response**:
    ```json
    {
      "content": "Regenerated content string or object..."
    }
    ```

### 3. Generate Summary (Legacy)
Simple endpoint to generate just a professional summary.

-   **URL**: `/api/generate-summary`
-   **Method**: `POST`
-   **Body**:
    ```json
    {
      "jobDescription": "...",
      "userName": "John Doe"
    }
    ```
-   **Success Response**:
    ```json
    {
      "summary": "Generated summary text..."
    }
    ```

### 4. Humanize Content
 attempts to rewrite content to bypass AI detection (requires `x-undetectable-key` or Gemini fallback).

-   **URL**: `/api/humanize`
-   **Method**: `POST`
-   **Body**:
    ```json
    {
      "content": "Text to humanize..."
    }
    ```
-   **Success Response**:
    ```json
    {
      "humanizedContent": "Humanized text..."
    }
    ```

### 5. Generate PDF
Generates a PDF resume based on the provided data.

-   **URL**: `/api/generate-pdf`
-   **Method**: `POST`
-   **Body**: Full resume object (contact info, skills, experience, education, etc.)
-   **Success Response**:
    ```json
    {
      "success": true,
      "filename": "resume_1234567890.pdf",
      "downloadUrl": "/api/download-pdf/resume_1234567890.pdf"
    }
    ```

## CORS
The API is configured to accept requests from any origin (`*`).
