"""
Coding Interview Routes
Handles code review, complexity analysis, and problem generation.
"""
from flask import Blueprint, request, jsonify
from services.coding_service import review_code, generate_coding_problem

coding_bp = Blueprint('coding', __name__, url_prefix='/api/coding')


@coding_bp.route('/review', methods=['POST'])
def review():
    """Review submitted code and provide feedback."""
    try:
        data = request.get_json()
        code = data.get('code', '')
        language = data.get('language', 'Python')
        problem_description = data.get('problemDescription', None)

        if not code.strip():
            return jsonify({"error": "No code provided", "success": False}), 400

        result = review_code(
            code=code,
            language=language,
            problem_description=problem_description
        )
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e), "success": False}), 500


@coding_bp.route('/problem', methods=['GET'])
def get_problem():
    """Generate a new coding problem."""
    try:
        difficulty = request.args.get('difficulty', 'Medium')
        topic = request.args.get('topic', None)

        result = generate_coding_problem(
            difficulty=difficulty,
            topic=topic
        )
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e), "success": False}), 500
