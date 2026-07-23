# InterviewGPT AI — Real-Time AI Interview Coach 🎙️🤖

**InterviewGPT AI** is a state-of-the-art web application that simulates realistic technical and HR interviews using Google's Gemini AI. It acts as a real-time AI coach that conducts voice conversations while simultaneously monitoring your facial expressions, eye contact, speaking speed, and filler words to provide a comprehensive 8-dimension performance report.

🌍 **Live Demo:** [https://interviewgpt-ai-97518.web.app](https://interviewgpt-ai-97518.web.app)

---

## 🌟 Key Features

* **Real-time Voice Conversation:** Answers are transcribed using Speech-to-Text, and the AI speaks its questions aloud using Text-to-Speech.
* **Facial Analysis (MediaPipe):** Actively monitors your eye contact, head pose, and facial expressions (Calm, Focused, Nervous, Happy, Distracted) through your webcam.
* **Speech Analytics:** Tracks your Words Per Minute (WPM) and detects filler words (um, uh, like) in real-time.
* **Live Coach Indicators:** A dynamic sidebar gives you real-time feedback on your confidence, speaking speed, and eye contact during the interview.
* **8-Dimension Performance Report:** At the end of the session, the Gemini AI evaluates your performance across 8 dimensions: Technical Knowledge, Communication, Confidence, Facial Expressions, Eye Contact, Speech Fluency, Professionalism, and Overall Performance.
* **Rich Analytics Dashboard:** View your improvement over time with line charts, radar charts, and detailed session history.
* **PDF Report Export:** Download a complete, detailed evaluation report of your performance as a PDF.

## 🛠️ Tech Stack

* **Frontend:** React, Vite, Framer Motion (for animations), Recharts (for analytics), jsPDF (for reports).
* **Backend:** Flask (Python).
* **AI Model:** Google Gemini API.
* **Facial Tracking:** MediaPipe FaceMesh.
* **Database & Auth:** Firebase Firestore & Firebase Authentication.
* **Hosting:** Firebase Hosting (Frontend).

## 🚀 Running the Project Locally

### Prerequisites
* Node.js (v16+)
* Python (3.9+)
* A Firebase Project with Firestore and Authentication enabled
* A Google Gemini API Key

### 1. Frontend Setup
```bash
# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

### 2. Backend Setup
```bash
# Navigate to the backend directory
cd backend

# Create a virtual environment (optional but recommended)
python -m venv venv
# Activate it (Windows)
venv\Scripts\activate
# Activate it (Mac/Linux)
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Start the Flask server
python app.py
```

### 3. Environment Variables
Create a `.env` file in the root folder with your Firebase configuration:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
VITE_API_URL=http://localhost:5000/api
```

Create a `.env` file in the `backend` folder with your Gemini configuration:
```env
GEMINI_API_KEY=your_gemini_api_key
FLASK_ENV=development
```

## 📈 Deployment
The frontend of this project is fully configured for deployment on Firebase Hosting. 

To deploy:
```bash
# Build the frontend
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

*(Note: The backend Flask server must be deployed separately to a service like Render, Heroku, or Google Cloud Run).*
