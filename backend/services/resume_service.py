"""
Resume Analysis Service
Handles PDF text extraction and AI-powered resume analysis with ATS scoring.
"""
import google.generativeai as genai
import json
import os
from PyPDF2 import PdfReader
import io

MODEL_NAME = "gemini-2.0-flash"


def extract_text_from_pdf(file_bytes):
    """
    Extract text content from a PDF file.
    
    Args:
        file_bytes: Raw bytes of the PDF file
    
    Returns:
        Extracted text as a string
    """
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return text.strip()
    except Exception as e:
        raise ValueError(f"Failed to extract text from PDF: {str(e)}")


def analyze_resume(resume_text):
    """
    Analyze a resume using Gemini AI and generate ATS score, skills extraction,
    and improvement suggestions.
    
    Args:
        resume_text: Extracted text from the resume
    
    Returns:
        dict with atsScore, skills, experience, suggestions, interviewQuestions
    """
    model = genai.GenerativeModel(MODEL_NAME)
    
    analysis_prompt = f"""You are an expert resume reviewer and ATS (Applicant Tracking System) specialist. 
Analyze the following resume and provide a comprehensive evaluation.

Resume Content:
{resume_text}

Provide your analysis in STRICT JSON format with NO additional text, markdown, or code blocks. Just raw JSON:
{{
    "atsScore": <number 0-100 representing ATS compatibility>,
    "overallRating": "<Excellent/Good/Average/Needs Improvement>",
    "skills": {{
        "technical": ["<skill 1>", "<skill 2>", ...],
        "soft": ["<skill 1>", "<skill 2>", ...],
        "tools": ["<tool 1>", "<tool 2>", ...]
    }},
    "experience": [
        {{
            "role": "<job title>",
            "company": "<company name>",
            "highlights": ["<highlight 1>", "<highlight 2>"]
        }}
    ],
    "education": [
        {{
            "degree": "<degree name>",
            "institution": "<institution name>"
        }}
    ],
    "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
    "improvements": [
        {{
            "area": "<area to improve>",
            "suggestion": "<specific suggestion>"
        }}
    ],
    "atsIssues": ["<issue 1>", "<issue 2>"],
    "interviewQuestions": [
        "<question based on resume 1>",
        "<question based on resume 2>",
        "<question based on resume 3>",
        "<question based on resume 4>",
        "<question based on resume 5>"
    ],
    "summary": "<2-3 sentence overall assessment>"
}}

Be thorough, fair, and constructive. Focus on actionable feedback."""

    try:
        response = model.generate_content(analysis_prompt)
        response_text = response.text.strip()
        
        # Clean up markdown formatting
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()
        
        result = json.loads(response_text)
        result["success"] = True
        result["resumeText"] = resume_text[:500] + "..." if len(resume_text) > 500 else resume_text
        return result
    except (json.JSONDecodeError, Exception) as e:
        return {
            "atsScore": 65,
            "overallRating": "Good",
            "skills": {
                "technical": ["Unable to parse - please try again"],
                "soft": [],
                "tools": []
            },
            "experience": [],
            "education": [],
            "strengths": ["Resume was submitted successfully"],
            "improvements": [{"area": "Analysis", "suggestion": "Please try uploading again for detailed analysis"}],
            "atsIssues": ["Could not fully analyze the document format"],
            "interviewQuestions": [
                "Tell me about yourself and your background",
                "What are your key technical skills?",
                "Describe a challenging project you worked on",
                "What are your career goals?",
                "Why are you interested in this role?"
            ],
            "summary": "Resume was received but could not be fully analyzed. Please try again.",
            "success": True,
            "fallback": True,
            "resumeText": resume_text[:500] if resume_text else "",
            "error": str(e)
        }
