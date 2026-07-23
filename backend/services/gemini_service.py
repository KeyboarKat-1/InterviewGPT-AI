"""
Gemini AI Service
Handles all interactions with the Google Gemini API for interview question generation,
answer evaluation, and scoring.
"""
import google.generativeai as genai
import json
import os

# Configure the Gemini API
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# Use gemini-2.0-flash for speed and cost-effectiveness
MODEL_NAME = "gemini-2.0-flash"

# System prompts for each interview type
SYSTEM_PROMPTS = {
    "HR": """You are an expert HR interviewer at a top tech company. Your role is to:
- Ask professional HR interview questions one at a time
- Cover topics like: introduction, motivation, teamwork, conflict resolution, career goals, company culture fit
- Be conversational but professional
- After the candidate answers, briefly acknowledge their response and ask the next question
- Do NOT repeat questions or ask multiple questions at once
- Keep questions clear and concise""",

    "Technical": """You are a senior technical interviewer at a leading tech company. Your role is to:
- Ask technical interview questions one at a time
- Cover topics like: data structures, algorithms, system design, OOP concepts, databases, web technologies
- Start with moderate difficulty and adjust based on answers
- After the candidate answers, briefly evaluate and ask the next question
- Do NOT give away answers; probe deeper if the answer is incomplete
- Keep questions focused and specific""",

    "Behavioral": """You are a behavioral interview specialist. Your role is to:
- Ask behavioral interview questions using the STAR method framework one at a time
- Cover topics like: leadership, teamwork, problem-solving, adaptability, communication, time management
- Ask follow-up questions to get specific examples
- After the candidate answers, acknowledge and ask the next question
- Focus on past experiences and situational judgment
- Encourage candidates to provide concrete examples""",

    "Aptitude": """You are an aptitude test interviewer. Your role is to:
- Ask logical reasoning and problem-solving questions one at a time
- Cover topics like: pattern recognition, mathematical reasoning, verbal reasoning, analytical thinking
- Present clear, well-defined problems
- After the candidate answers, confirm correctness briefly and move to the next question
- Vary difficulty levels throughout the session
- Include both quantitative and qualitative reasoning questions""",

    "Resume": """You are an expert interviewer who specializes in resume-based interviews. Your role is to:
- Ask questions directly based on the candidate's resume content provided below
- Probe into specific projects, skills, and experiences mentioned in their resume
- Ask about gaps, transitions, and achievements
- Be thorough but fair in exploring their claimed competencies
- After the candidate answers, follow up on interesting details and then ask the next question
- Tailor difficulty to the candidate's experience level as shown in their resume""",

    "Coding": """You are a coding interview expert at a top tech company. Your role is to:
- Present coding problems one at a time
- Cover topics like: arrays, strings, linked lists, trees, graphs, dynamic programming, sorting
- Clearly describe the problem with examples and constraints
- After the candidate provides their solution, evaluate it and ask the next problem
- Focus on problem-solving approach, not just correct code
- Ask about time and space complexity"""
}


def get_model():
    """Get a configured Gemini model instance."""
    return genai.GenerativeModel(MODEL_NAME)


def init_interview_session(interview_type, resume_text=None, question_count=5, difficulty="Medium"):
    """
    Initialize a new interview session and generate the first message.
    
    Args:
        interview_type: Type of interview (HR, Technical, Behavioral, Aptitude, Resume, Coding)
        resume_text: Optional resume text for resume-based interviews
        question_count: Number of questions for the session
        difficulty: Difficulty level (Easy, Medium, Hard)
    
    Returns:
        dict with 'message' key containing the AI's opening message
    """
    model = get_model()
    
    system_prompt = SYSTEM_PROMPTS.get(interview_type, SYSTEM_PROMPTS["HR"])
    
    # Add resume context if provided
    if interview_type == "Resume" and resume_text:
        system_prompt += f"\n\nCandidate's Resume:\n{resume_text}"
    
    prompt = f"""{system_prompt}

Interview Configuration:
- Total questions to ask: {question_count}
- Difficulty level: {difficulty}
- Interview type: {interview_type}

Start the interview now. Greet the candidate warmly, briefly introduce yourself and the interview format, 
then ask your FIRST question. Remember, ask only ONE question at a time."""

    try:
        response = model.generate_content(prompt)
        return {
            "message": response.text,
            "success": True
        }
    except Exception as e:
        return {
            "message": f"Hello! I'm your AI interviewer for today's {interview_type} interview. Let's get started. Could you please introduce yourself and tell me about your background?",
            "success": True,
            "fallback": True,
            "error": str(e)
        }


def send_message(interview_type, history, user_message, question_number, total_questions, resume_text=None):
    """
    Process a user's answer and generate the next question.
    
    Args:
        interview_type: Type of interview
        history: List of {role, content} dicts representing conversation history
        user_message: The user's latest answer
        question_number: Current question number
        total_questions: Total questions in the session
        resume_text: Optional resume text for context
    
    Returns:
        dict with 'message' key containing the AI's next question
    """
    model = get_model()
    
    system_prompt = SYSTEM_PROMPTS.get(interview_type, SYSTEM_PROMPTS["HR"])
    
    if interview_type == "Resume" and resume_text:
        system_prompt += f"\n\nCandidate's Resume:\n{resume_text}"

    # Build conversation context
    conversation = f"""{system_prompt}

You are currently on question {question_number} of {total_questions}.
"""
    
    if question_number >= total_questions:
        conversation += "\nThis is the LAST question. After acknowledging the answer, thank the candidate and let them know the interview is complete. They can now finish the session to see their results."
    else:
        conversation += "\nAfter acknowledging the candidate's answer, ask the NEXT question. Remember: ONE question at a time."

    conversation += "\n\nConversation so far:\n"
    
    for msg in history:
        role = "Interviewer" if msg.get("role") == "ai" else "Candidate"
        conversation += f"{role}: {msg.get('content', '')}\n"
    
    conversation += f"Candidate: {user_message}\n"
    conversation += "Interviewer: "

    try:
        response = model.generate_content(conversation)
        return {
            "message": response.text,
            "success": True
        }
    except Exception as e:
        if question_number < total_questions:
            fallback = f"Thank you for that answer. Here's question {question_number + 1}: Can you describe a challenging situation you faced and how you handled it?"
        else:
            fallback = "Thank you for all your answers. The interview is now complete. You can finish the session to view your detailed results and feedback."
        
        return {
            "message": fallback,
            "success": True,
            "fallback": True,
            "error": str(e)
        }


def evaluate_interview(interview_type, history):
    """
    Evaluate the entire interview and generate scores, strengths, weaknesses, and suggestions.
    
    Args:
        interview_type: Type of interview
        history: Complete conversation history
    
    Returns:
        dict with score, strengths, weaknesses, suggestions, and metrics
    """
    model = get_model()
    
    conversation_text = ""
    for msg in history:
        role = "Interviewer" if msg.get("role") == "ai" else "Candidate"
        conversation_text += f"{role}: {msg.get('content', '')}\n"

    evaluation_prompt = f"""You are an expert interview evaluator. Analyze the following {interview_type} interview conversation and provide a detailed evaluation.

Interview Conversation:
{conversation_text}

Provide your evaluation in STRICT JSON format with NO additional text, markdown, or code blocks. Just raw JSON:
{{
    "score": <number between 0-100>,
    "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
    "weaknesses": ["<weakness 1>", "<weakness 2>"],
    "suggestions": ["<suggestion 1>", "<suggestion 2>", "<suggestion 3>"],
    "metrics": {{
        "confidence": <number 0-100>,
        "clarity": <number 0-100>,
        "technicalAccuracy": <number 0-100>,
        "communication": <number 0-100>,
        "problemSolving": <number 0-100>
    }},
    "summary": "<2-3 sentence overall summary>"
}}

Be fair, balanced, and constructive in your evaluation. Score based on the quality and depth of answers."""

    try:
        response = model.generate_content(evaluation_prompt)
        response_text = response.text.strip()
        
        # Clean up any markdown formatting
        if response_text.startswith("```"):
            response_text = response_text.split("\n", 1)[1]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()
        
        result = json.loads(response_text)
        result["success"] = True
        return result
    except (json.JSONDecodeError, Exception) as e:
        # Return sensible defaults if parsing fails
        return {
            "score": 70,
            "strengths": ["Good communication skills", "Showed enthusiasm", "Answered all questions"],
            "weaknesses": ["Could provide more specific examples", "Some answers lacked depth"],
            "suggestions": [
                "Practice the STAR method for behavioral questions",
                "Prepare specific examples from past experiences",
                "Research the company and role before interviews"
            ],
            "metrics": {
                "confidence": 72,
                "clarity": 75,
                "technicalAccuracy": 68,
                "communication": 78,
                "problemSolving": 70
            },
            "summary": "The candidate showed good potential but could improve with more practice and preparation.",
            "success": True,
            "fallback": True,
            "error": str(e)
        }


def evaluate_coach(interview_type, history, speech_metrics=None, facial_analytics=None):
    """
    Enhanced evaluation combining conversation analysis with real-time speech and facial data.
    Returns 8-dimension coach scores for a comprehensive interview report.
    
    Args:
        interview_type: Type of interview
        history: Complete conversation history
        speech_metrics: Dict with wpm, fillerWordCount, fillerWords, totalWords, fluencyScore
        facial_analytics: Dict with eyeContactPercent, dominantExpression, expressionBreakdown, confidenceScore
    
    Returns:
        dict with extended metrics, scores, and rich qualitative feedback
    """
    model = get_model()
    
    conversation_text = ""
    for msg in history:
        role = "Interviewer" if msg.get("role") == "ai" else "Candidate"
        conversation_text += f"{role}: {msg.get('content', '')}\n"

    # Format speech context
    sm = speech_metrics or {}
    wpm = sm.get("wordsPerMinute", 0)
    filler_count = sm.get("fillerWordCount", 0)
    filler_words = sm.get("fillerWords", [])
    total_words = sm.get("totalWords", 0)
    fluency = sm.get("fluencyScore", 75)

    # Format facial context
    fa = facial_analytics or {}
    eye_contact_pct = fa.get("eyeContactPercent", 70)
    dominant_expr = fa.get("dominantExpression", "calm")
    expr_breakdown = fa.get("expressionBreakdown", {})
    facial_confidence = fa.get("confidenceScore", 70)

    speech_context = f"""
Real-Time Speech Analytics (measured during interview):
- Words per Minute: {wpm} WPM (ideal: 120-160 WPM for interviews)
- Total Words Spoken: {total_words}
- Filler Word Count: {filler_count} (words like um, uh, like, you know)
- Filler Words Detected: {', '.join(filler_words) if filler_words else 'None'}
- Speech Fluency Score: {fluency}/100

Real-Time Facial & Eye Contact Analytics (measured via webcam):
- Eye Contact Maintained: {eye_contact_pct}% of the interview
- Dominant Expression: {dominant_expr}
- Expression Breakdown: {json.dumps(expr_breakdown)}
- Facial Confidence Score: {facial_confidence}/100
"""

    evaluation_prompt = f"""You are an expert AI Interview Coach. Analyze this {interview_type} interview with both conversation quality AND real-time behavioral metrics.

Interview Conversation:
{conversation_text}

{speech_context}

Provide a comprehensive 8-dimension coaching evaluation in STRICT JSON format. No markdown, no code blocks — raw JSON only:
{{
    "score": <overall number 0-100>,
    "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
    "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
    "suggestions": ["<actionable suggestion 1>", "<actionable suggestion 2>", "<actionable suggestion 3>"],
    "summary": "<3-4 sentence comprehensive summary referencing both content quality and behavioral metrics>",
    "metrics": {{
        "technicalKnowledge": <0-100, based on depth and accuracy of answers>,
        "communication": <0-100, based on clarity, structure, and articulation>,
        "confidence": <0-100, weighted combination of content confidence and facial confidence score ({facial_confidence})>,
        "facialExpressions": <0-100, based on expression breakdown — calm/focused/happy are positive>,
        "eyeContact": <0-100, directly derived from eye contact percentage {eye_contact_pct}%>,
        "speechFluency": <0-100, based on WPM {wpm} and filler count {filler_count} — penalize heavy fillers>,
        "professionalism": <0-100, overall professional demeanor combining content and behavioral signals>,
        "overallPerformance": <0-100, weighted average of all dimensions>
    }},
    "speechFeedback": "<1-2 specific sentences about speaking pace and filler word usage>",
    "facialFeedback": "<1-2 specific sentences about eye contact and expression observed>",
    "contentFeedback": "<2-3 sentences about answer quality and technical depth>"
}}

Guidelines:
- eyeContact score should closely reflect the {eye_contact_pct}% measurement
- speechFluency should factor in WPM of {wpm} and {filler_count} filler words
- confidence should blend content-based signals with the facial confidence score of {facial_confidence}
- Be fair, specific, and constructive. Reference the actual measured values in feedback."""

    try:
        response = model.generate_content(evaluation_prompt)
        response_text = response.text.strip()
        
        # Clean up any markdown formatting
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:])
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()
        
        result = json.loads(response_text)
        result["success"] = True
        return result

    except (json.JSONDecodeError, Exception) as e:
        # Compute realistic fallback scores from the real analytics data
        eye_score = min(100, max(0, eye_contact_pct))
        fluency_score = min(100, max(0, fluency))
        tech_score = 70
        comm_score = max(50, 80 - filler_count * 2)
        conf_score = min(100, (eye_score * 0.5 + facial_confidence * 0.5))
        expr_positive = (expr_breakdown.get("calm", 0) + expr_breakdown.get("focused", 0) + expr_breakdown.get("happy", 0))
        expr_score = min(100, 50 + expr_positive * 0.5)
        prof_score = min(100, (comm_score * 0.4 + conf_score * 0.3 + eye_score * 0.3))
        overall = min(100, (tech_score * 0.25 + comm_score * 0.20 + conf_score * 0.15 + fluency_score * 0.15 + eye_score * 0.10 + expr_score * 0.08 + prof_score * 0.07))

        return {
            "score": round(overall),
            "strengths": ["Good communication skills", "Maintained composure during interview", "Answered all questions thoughtfully"],
            "weaknesses": ["Could reduce filler words for cleaner delivery", "Aim for more consistent eye contact", "Provide more specific examples"],
            "suggestions": [
                "Practice speaking without filler words using mirror exercises",
                "Maintain eye contact with the camera as you would in a real interview",
                "Structure answers with the STAR method for greater clarity"
            ],
            "summary": f"The candidate completed the {interview_type} interview showing reasonable competency. Speech analysis recorded {wpm} WPM with {filler_count} filler words, and eye contact was maintained {eye_contact_pct}% of the time. With practice on delivery and specificity of examples, performance can improve significantly.",
            "metrics": {
                "technicalKnowledge": round(tech_score),
                "communication": round(comm_score),
                "confidence": round(conf_score),
                "facialExpressions": round(expr_score),
                "eyeContact": round(eye_score),
                "speechFluency": round(fluency_score),
                "professionalism": round(prof_score),
                "overallPerformance": round(overall)
            },
            "speechFeedback": f"You spoke at {wpm} WPM {'which is a good pace' if 100 <= wpm <= 170 else 'which could be adjusted for a more comfortable delivery'}. {f'Detected {filler_count} filler words — try to replace them with brief pauses.' if filler_count > 2 else 'Great job minimizing filler words!'}",
            "facialFeedback": f"Eye contact was maintained {eye_contact_pct}% of the interview {'— excellent engagement!' if eye_contact_pct >= 70 else '— try to look directly at the camera more consistently'}. Your dominant expression was {dominant_expr}.",
            "contentFeedback": "Focus on providing concrete, specific examples in your answers to demonstrate real experience and depth of knowledge.",
            "success": True,
            "fallback": True,
            "error": str(e)
        }
