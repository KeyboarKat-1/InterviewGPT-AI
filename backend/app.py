"""
InterviewGPT AI - Flask Backend
Main application entry point with CORS configuration and blueprint registration.
"""
import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def create_app():
    """Application factory pattern."""
    app = Flask(__name__)
    
    # CORS configuration - allow frontend origin
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    CORS(app, resources={
        r"/api/*": {
            "origins": [frontend_url, "http://localhost:5173", "http://localhost:3000"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        }
    })

    # Register blueprints
    from routes.gemini_routes import gemini_bp
    from routes.resume_routes import resume_bp
    from routes.coding_routes import coding_bp
    
    app.register_blueprint(gemini_bp)
    app.register_blueprint(resume_bp)
    app.register_blueprint(coding_bp)

    # Health check endpoint
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            "status": "healthy",
            "service": "InterviewGPT AI Backend",
            "version": "1.0.0"
        }), 200

    # Global error handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Endpoint not found", "success": False}), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "Internal server error", "success": False}), 500

    return app


# Create the application instance
app = create_app()

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)
