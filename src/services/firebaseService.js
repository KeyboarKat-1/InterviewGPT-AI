import { db } from '../config/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp
} from 'firebase/firestore';

// ==========================================
// User Profile Service
// ==========================================
export const getUserProfile = async (uid) => {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
};

// ==========================================
// Interview Sessions Service
// ==========================================
export const createInterviewSession = async (uid, interviewData) => {
  // interviewData can include a 'mode' field (e.g., 'voice')
  const docRef = await addDoc(collection(db, 'interviews'), {
    ...interviewData,
    userId: uid,
    createdAt: serverTimestamp(),
    status: 'in-progress'
  });
  return docRef.id;
};

// Save full transcript for voice interviews
export const saveVoiceTranscript = async (sessionId, transcript) => {
  const transcriptRef = collection(db, 'interviews', sessionId, 'transcripts');
  await addDoc(transcriptRef, {
    transcript,
    createdAt: serverTimestamp()
  });
};

export const updateInterviewSession = async (sessionId, data) => {
  const sessionRef = doc(db, 'interviews', sessionId);
  await updateDoc(sessionRef, data);
};

export const getUserInterviews = async (uid) => {
  const q = query(
    collection(db, 'interviews'), 
    where('userId', '==', uid),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// ==========================================
// Scores and Analytics Service
// ==========================================
export const saveInterviewScore = async (uid, sessionId, scoreData) => {
  const docRef = await addDoc(collection(db, 'scores'), {
    ...scoreData,
    userId: uid,
    sessionId: sessionId,
    createdAt: serverTimestamp()
  });
  
  // Also update user's total interviews and average score
  // This would ideally be a Cloud Function or a transaction in a real app
  const userProfile = await getUserProfile(uid);
  if (userProfile) {
    const newTotal = (userProfile.totalInterviews || 0) + 1;
    const currentTotalScore = (userProfile.averageScore || 0) * (userProfile.totalInterviews || 0);
    const newAverage = (currentTotalScore + scoreData.overallScore) / newTotal;
    
    await updateDoc(doc(db, 'users', uid), {
      totalInterviews: newTotal,
      averageScore: newAverage
    });
  }
  
  return docRef.id;
};

export const getUserScores = async (uid) => {
  const q = query(
    collection(db, 'scores'), 
    where('userId', '==', uid),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// ==========================================
// Resume Intelligence Service
// ==========================================
export const saveResumeAnalysis = async (uid, analysisData) => {
  const docRef = await addDoc(collection(db, 'resume_analyses'), {
    ...analysisData,
    userId: uid,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getUserResumeAnalyses = async (uid) => {
  const q = query(
    collection(db, 'resume_analyses'), 
    where('userId', '==', uid),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// ==========================================
// Coach Session — Full Analytics Save
// ==========================================
/**
 * Save a completed coach interview session with all 8-dimension analytics.
 * Writes to: interviews (full data), scores (quick lookup), analytics (metrics only).
 *
 * @param {string} uid - Firebase user UID
 * @param {Object} sessionData - Full session payload
 * @param {string} sessionData.sessionId
 * @param {string} sessionData.type - Interview type
 * @param {Object[]} sessionData.messages - Chat history
 * @param {Object} sessionData.geminiEvaluation - From /evaluate-coach endpoint
 * @param {Object} sessionData.coachMetrics - 8-dimension computed scores
 * @param {Object} sessionData.speechAnalytics - voiceService.getSpeechMetrics()
 * @param {Object} sessionData.facialAnalytics - facialAnalysisService.getAnalyticsSummary()
 * @returns {Promise<string>} - Firestore document ID
 */
export const saveCoachSession = async (uid, sessionData) => {
  const {
    sessionId,
    type,
    messages,
    geminiEvaluation,
    coachMetrics,
    speechAnalytics,
    facialAnalytics
  } = sessionData;

  const overallScore = coachMetrics?.overallPerformance ?? geminiEvaluation?.score ?? 70;

  // Main interview document — full coach data
  const interviewPayload = {
    userId: uid,
    sessionId,
    type,
    score: overallScore,
    strengths: geminiEvaluation?.strengths ?? [],
    weaknesses: geminiEvaluation?.weaknesses ?? [],
    suggestions: geminiEvaluation?.suggestions ?? [],
    summary: geminiEvaluation?.summary ?? '',
    speechFeedback: geminiEvaluation?.speechFeedback ?? '',
    facialFeedback: geminiEvaluation?.facialFeedback ?? '',
    contentFeedback: geminiEvaluation?.contentFeedback ?? '',
    messages: (messages || []).map(m => ({ sender: m.sender, text: m.text })),
    coachMetrics: coachMetrics ?? {},
    speechAnalytics: speechAnalytics ?? {},
    facialAnalytics: facialAnalytics ?? {},
    // Legacy metrics field for backward compatibility with Analytics page
    metrics: {
      confidence: coachMetrics?.confidence ?? 70,
      clarity: coachMetrics?.communication ?? 70,
      technicalAccuracy: coachMetrics?.technicalKnowledge ?? 70,
      communication: coachMetrics?.communication ?? 70,
      problemSolving: coachMetrics?.technicalKnowledge ?? 70,
      eyeContact: coachMetrics?.eyeContact ?? 70,
      speechFluency: coachMetrics?.speechFluency ?? 70,
      facialExpressions: coachMetrics?.facialExpressions ?? 70,
      professionalism: coachMetrics?.professionalism ?? 70,
      overallPerformance: overallScore
    },
    date: serverTimestamp(),
    completedAt: serverTimestamp()
  };

  const interviewRef = await addDoc(collection(db, 'interviews'), interviewPayload);

  // Quick-lookup scores document
  await addDoc(collection(db, 'scores'), {
    userId: uid,
    interviewId: interviewRef.id,
    sessionId,
    score: overallScore,
    type,
    date: serverTimestamp()
  });

  // Dedicated analytics document for charts / trend analysis
  await addDoc(collection(db, 'analytics'), {
    userId: uid,
    interviewId: interviewRef.id,
    sessionId,
    type,
    coachMetrics: coachMetrics ?? {},
    speechAnalytics: speechAnalytics ?? {},
    facialAnalytics: facialAnalytics ?? {},
    date: serverTimestamp()
  });

  return interviewRef.id;
};
