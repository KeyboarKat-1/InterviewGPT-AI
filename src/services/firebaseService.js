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
  const docRef = await addDoc(collection(db, 'interviews'), {
    ...interviewData,
    userId: uid,
    createdAt: serverTimestamp(),
    status: 'in-progress'
  });
  return docRef.id;
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
