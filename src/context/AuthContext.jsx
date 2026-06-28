import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile as firebaseUpdateProfile
} from 'firebase/auth';
import { auth, googleProvider, db } from '../config/firebase';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sign up with email
  const signup = async (email, password, displayName) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Create user profile in Firestore
    await setDoc(doc(db, "users", userCredential.user.uid), {
      uid: userCredential.user.uid,
      email,
      displayName,
      createdAt: new Date(),
      lastLogin: new Date(),
      totalInterviews: 0,
      averageScore: 0,
      theme_preference: 'dark'
    });
    return userCredential;
  };

  // Log in with email
  const login = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await updateDoc(doc(db, "users", userCredential.user.uid), {
      lastLogin: new Date()
    });
    return userCredential;
  };

  // Google Sign-In
  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    // Check if user exists in Firestore, if not create
    const userDocRef = doc(db, "users", result.user.uid);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        createdAt: new Date(),
        lastLogin: new Date(),
        totalInterviews: 0,
        averageScore: 0,
        theme_preference: 'dark'
      });
    } else {
      await updateDoc(userDocRef, {
        lastLogin: new Date()
      });
    }
    return result;
  };

  // Forgot Password
  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  // Update Profile
  const updateProfile = async (displayName, photoURL) => {
    if (!currentUser) return;
    
    // Update Firebase Auth profile
    await firebaseUpdateProfile(currentUser, { displayName, photoURL });
    
    // Update Firestore user document
    await updateDoc(doc(db, "users", currentUser.uid), {
      displayName,
      photoURL
    });
    
    // Manually trigger state update to reflect changes
    setCurrentUser({ ...currentUser, displayName, photoURL });
  };

  // Log out
  const logout = () => {
    return signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Optionally fetch extra user data from Firestore here and merge with currentUser
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
           setCurrentUser({ ...user, ...userDoc.data() });
        } else {
           setCurrentUser(user);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    signInWithGoogle,
    resetPassword,
    updateProfile,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
