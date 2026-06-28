import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { FiCheckCircle, FiAlertCircle, FiDownload, FiTrendingUp } from 'react-icons/fi';
import './Results.css';

const Results = () => {
  const { id } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const q = query(collection(db, "interviews"), where("sessionId", "==", id));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const data = querySnapshot.docs[0].data();
          setResult(data);
        } else {
          // If no result found (like in guest mode or demo), show mock data
          setResult({
            score: 85,
            type: 'Demo',
            strengths: ["Clear communication", "Good problem solving approach", "Confidence"],
            weaknesses: ["Technical depth on certain topics", "Could provide more examples"],
            improvement: "Try to structure your answers using the STAR method for behavioral questions."
          });
        }
      } catch (error) {
        console.error("Error fetching results:", error);
      }
      setLoading(false);
    };

    fetchResults();
  }, [id]);

  if (loading) {
    return <div className="results-loading">Analyzing your performance...</div>;
  }

  if (!result) {
    return <div className="results-error">Results not found.</div>;
  }

  const scoreClass = result.score >= 80 ? 'excellent' : result.score >= 60 ? 'good' : 'needs-improvement';

  return (
    <div className="results-container">
      <div className="results-header text-center">
        <h1>Interview Report</h1>
        <p className="subtitle">Here is a detailed analysis of your {result.type} interview performance</p>
      </div>

      <div className="score-section glass-panel">
        <div className={`score-circle ${scoreClass}`}>
          <span className="score-number">{result.score}</span>
          <span className="score-label">out of 100</span>
        </div>
        <div className="score-feedback">
          <h2>
            {result.score >= 80 ? 'Excellent work!' : 
             result.score >= 60 ? 'Good effort!' : 'Keep practicing!'}
          </h2>
          <p>You demonstrated a solid understanding of the core concepts, but there is always room for growth.</p>
        </div>
      </div>

      <div className="analysis-grid">
        <div className="analysis-card glass-panel">
          <h3><FiCheckCircle className="icon-success" /> Strengths</h3>
          <ul className="feedback-list">
            {result.strengths?.map((strength, idx) => (
              <li key={idx}>{strength}</li>
            ))}
          </ul>
        </div>

        <div className="analysis-card glass-panel">
          <h3><FiAlertCircle className="icon-warning" /> Areas to Improve</h3>
          <ul className="feedback-list">
            {result.weaknesses?.map((weakness, idx) => (
              <li key={idx}>{weakness}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="improvement-section glass-panel">
        <h3><FiTrendingUp className="icon-primary" /> Recommended Next Steps</h3>
        <p>{result.improvement || "Review the technical concepts you struggled with and practice answering questions aloud using the STAR format."}</p>
      </div>

      <div className="results-actions text-center">
        <button className="btn-secondary" onClick={() => window.print()}>
          <FiDownload /> Download PDF Report
        </button>
        <Link to="/dashboard" className="btn-primary">Return to Dashboard</Link>
      </div>
    </div>
  );
};

export default Results;
