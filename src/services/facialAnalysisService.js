/**
 * facialAnalysisService.js
 * Browser-side face detection using MediaPipe Face Mesh (loaded via CDN).
 * Tracks eye contact, facial expressions, and head pose.
 * Runs at ~10fps to minimize CPU usage.
 */

class FacialAnalysisService {
  constructor() {
    this.faceMesh = null;
    this.camera = null;
    this.videoElement = null;
    this.isRunning = false;
    this.frameInterval = null;
    this.lastResults = null;
    this.snapshots = [];
    this.expressionCounts = { calm: 0, focused: 0, nervous: 0, happy: 0 };
    this.eyeContactFrames = 0;
    this.totalFrames = 0;
    this.onUpdate = null;
  }

  async init(videoElement, onUpdate = null) {
    this.videoElement = videoElement;
    this.onUpdate = onUpdate;

    // Load MediaPipe dynamically from CDN
    if (!window.FaceMesh) {
      await this._loadMediaPipeScript(
        'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js'
      );
      await this._loadMediaPipeScript(
        'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js'
      );
    }

    if (!window.FaceMesh) {
      console.warn('MediaPipe FaceMesh not available. Facial analysis disabled.');
      return false;
    }

    try {
      this.faceMesh = new window.FaceMesh({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      });

      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      this.faceMesh.onResults((results) => this._processResults(results));
      return true;
    } catch (e) {
      console.warn('FaceMesh init failed:', e);
      return false;
    }
  }

  _loadMediaPipeScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  start() {
    if (!this.faceMesh || !this.videoElement || this.isRunning) return;
    this.isRunning = true;

    // Process frames at ~10fps
    this.frameInterval = setInterval(async () => {
      if (this.videoElement.readyState >= 2) {
        try {
          await this.faceMesh.send({ image: this.videoElement });
        } catch (e) {
          // Ignore frame errors
        }
      }
    }, 100);
  }

  stop() {
    this.isRunning = false;
    if (this.frameInterval) {
      clearInterval(this.frameInterval);
      this.frameInterval = null;
    }
  }

  _processResults(results) {
    this.totalFrames++;

    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      // No face detected
      if (this.onUpdate) {
        this.onUpdate({ faceDetected: false, eyeContact: false, expression: 'away' });
      }
      return;
    }

    const landmarks = results.multiFaceLandmarks[0];
    const eyeContact = this._detectEyeContact(landmarks);
    const expression = this._detectExpression(landmarks);
    const headPose = this._detectHeadPose(landmarks);

    if (eyeContact) this.eyeContactFrames++;
    this.expressionCounts[expression] = (this.expressionCounts[expression] || 0) + 1;

    const snapshot = { eyeContact, expression, headPose, timestamp: Date.now() };
    this.snapshots.push(snapshot);

    if (this.onUpdate) {
      this.onUpdate({
        faceDetected: true,
        eyeContact,
        expression,
        headPose,
        eyeContactPercent: Math.round((this.eyeContactFrames / this.totalFrames) * 100),
        dominantExpression: this._getDominantExpression()
      });
    }
  }

  _detectEyeContact(landmarks) {
    // Use iris landmarks (468-472 left iris, 473-477 right iris)
    // Check if iris centers are approximately aligned with face center
    try {
      const noseTip = landmarks[1];
      const leftIris = landmarks[468];
      const rightIris = landmarks[473];

      if (!leftIris || !rightIris || !noseTip) return true; // Assume contact if iris not tracked

      const irisCenter = {
        x: (leftIris.x + rightIris.x) / 2,
        y: (leftIris.y + rightIris.y) / 2
      };

      const faceCenter = { x: noseTip.x, y: noseTip.y };
      const dx = Math.abs(irisCenter.x - faceCenter.x);
      const dy = Math.abs(irisCenter.y - faceCenter.y);

      // Thresholds tuned for frontal camera
      return dx < 0.12 && dy < 0.08;
    } catch (e) {
      return true;
    }
  }

  _detectExpression(landmarks) {
    try {
      // Mouth openness (smile detection)
      const upperLip = landmarks[13];
      const lowerLip = landmarks[14];
      const leftMouth = landmarks[61];
      const rightMouth = landmarks[291];

      const mouthOpen = Math.abs(upperLip.y - lowerLip.y);
      const mouthWidth = Math.abs(leftMouth.x - rightMouth.x);
      const smileRatio = mouthWidth / (mouthOpen + 0.001);

      // Eyebrow raise (stress indicator)
      const leftBrow = landmarks[107];
      const leftEye = landmarks[159];
      const browRaise = Math.abs(leftBrow.y - leftEye.y);

      if (smileRatio > 3.5) return 'happy';
      if (browRaise > 0.05) return 'nervous';
      if (mouthOpen > 0.02) return 'focused';
      return 'calm';
    } catch (e) {
      return 'calm';
    }
  }

  _detectHeadPose(landmarks) {
    try {
      const nose = landmarks[1];
      const leftEar = landmarks[234];
      const rightEar = landmarks[454];

      const tilt = Math.abs(leftEar.y - rightEar.y);
      const turn = nose.x - 0.5; // Negative = looking left, positive = right

      if (Math.abs(turn) > 0.1) return turn < 0 ? 'left' : 'right';
      if (tilt > 0.05) return 'tilted';
      return 'forward';
    } catch (e) {
      return 'forward';
    }
  }

  _getDominantExpression() {
    return Object.entries(this.expressionCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'calm';
  }

  getAnalyticsSummary() {
    const total = Object.values(this.expressionCounts).reduce((a, b) => a + b, 0) || 1;
    const breakdown = {};
    Object.entries(this.expressionCounts).forEach(([k, v]) => {
      breakdown[k] = Math.round((v / total) * 100);
    });

    const eyeContactPercent = this.totalFrames > 0
      ? Math.round((this.eyeContactFrames / this.totalFrames) * 100)
      : 75;

    return {
      eyeContactPercent,
      dominantExpression: this._getDominantExpression(),
      expressionBreakdown: breakdown,
      totalFramesAnalyzed: this.totalFrames,
      // Confidence score derived from eye contact + calm expression
      confidenceScore: Math.round(
        eyeContactPercent * 0.6 +
        ((breakdown.calm || 0) + (breakdown.focused || 0)) * 0.4
      )
    };
  }

  reset() {
    this.snapshots = [];
    this.expressionCounts = { calm: 0, focused: 0, nervous: 0, happy: 0 };
    this.eyeContactFrames = 0;
    this.totalFrames = 0;
  }

  destroy() {
    this.stop();
    if (this.faceMesh) {
      try { this.faceMesh.close(); } catch (e) { /* ignore */ }
    }
  }
}

const facialAnalysisService = new FacialAnalysisService();
export default facialAnalysisService;
