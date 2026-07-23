"""
Resume Analysis Routes
Handles resume PDF upload and AI-powered analysis.
"""
from flask import Blueprint, request, jsonify
from services.resume_service import extract_text_from_pdf, analyze_resume

resume_bp = Blueprint('resume', __name__, url_prefix='/api/resume')


@resume_bp.route('/analyze', methods=['POST'])
def analyze():
    """
    Upload and analyze a resume PDF.
    Accepts multipart/form-data with a 'file' field.
    """
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded", "success": False}), 400

        file = request.files['file']
        
        if file.filename == '':
            return jsonify({"error": "No file selected", "success": False}), 400

        # Validate file type
        allowed_extensions = {'.pdf'}
        import os
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in allowed_extensions:
            return jsonify({"error": "Only PDF files are supported", "success": False}), 400

        # Validate file size (max 5MB)
        file_bytes = file.read()
        if len(file_bytes) > 5 * 1024 * 1024:
            return jsonify({"error": "File size exceeds 5MB limit", "success": False}), 400

        # Extract text from PDF
        resume_text = extract_text_from_pdf(file_bytes)
        
        if not resume_text.strip():
            return jsonify({
                "error": "Could not extract text from the PDF. Please ensure it is not a scanned image.",
                "success": False
            }), 400

        # Analyze the resume
        result = analyze_resume(resume_text)
        result["fullResumeText"] = resume_text
        return jsonify(result), 200

    except ValueError as ve:
        return jsonify({"error": str(ve), "success": False}), 400
    except Exception as e:
        return jsonify({"error": f"Analysis failed: {str(e)}", "success": False}), 500
