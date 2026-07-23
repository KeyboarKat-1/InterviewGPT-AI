"""
Gemini Interview Routes
Handles interview session initialization, message exchange, and evaluation.
"""
from flask import Blueprint, request, jsonify
from services.gemini_service import init_interview_session, send_message, evaluate_interview, evaluate_coach

gemini_bp = Blueprint('gemini', __name__, url_prefix='/api/gemini')


@gemini_bp.route('/init', methods=['POST'])
def init_session():
    """Initialize a new interview session."""
    try:
        data = request.get_json()
        interview_type = data.get('interviewType', 'HR')
        resume_text = data.get('resumeText', None)
        question_count = data.get('questionCount', 5)
        difficulty = data.get('difficulty', 'Medium')

        result = init_interview_session(
            interview_type=interview_type,
            resume_text=resume_text,
            question_count=question_count,
            difficulty=difficulty
        )
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e), "success": False}), 500


@gemini_bp.route('/message', methods=['POST'])
def handle_message():
    """Process a user message and return the AI's next question."""
    try:
        data = request.get_json()
        interview_type = data.get('interviewType', 'HR')
        history = data.get('history', [])
        message = data.get('message', '')
        question_number = data.get('questionNumber', 1)
        total_questions = data.get('totalQuestions', 5)
        resume_text = data.get('resumeText', None)

        result = send_message(
            interview_type=interview_type,
            history=history,
            user_message=message,
            question_number=question_number,
            total_questions=total_questions,
            resume_text=resume_text
        )
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e), "success": False}), 500


@gemini_bp.route('/evaluate', methods=['POST'])
def evaluate():
    """Evaluate the completed interview and return scores."""
    try:
        data = request.get_json()
        interview_type = data.get('interviewType', 'HR')
        history = data.get('history', [])

        result = evaluate_interview(
            interview_type=interview_type,
            history=history
        )
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e), "success": False}), 500


@gemini_bp.route('/evaluate-coach', methods=['POST'])
def evaluate_coach_session():
    """
    Enhanced evaluation endpoint that incorporates real-time speech and facial analytics.
    Returns 8-dimension coach scores for a comprehensive interview report.
    """
    try:
        data = request.get_json()
        interview_type = data.get('interviewType', 'HR')
        history = data.get('history', [])
        speech_metrics = data.get('speechMetrics', None)
        facial_analytics = data.get('facialAnalytics', None)

        result = evaluate_coach(
            interview_type=interview_type,
            history=history,
            speech_metrics=speech_metrics,
            facial_analytics=facial_analytics
        )
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e), "success": False}), 500
