import api from './api';

/**
 * Gemini AI Service
 * Provides methods to start a session, send user answers, and evaluate the interview.
 */
const geminiService = {
  /**
   * Initialize a new interview session with Gemini backend.
   * @param {Object} payload - { userId, interviewType }
   * @returns {Promise<Object>} - Initial AI message and sessionId
   */
  initSession: async (payload) => {
    const response = await api.post('/gemini/init', payload);
    return response;
  },

  /**
   * Send a user answer to Gemini and receive the next question.
   * @param {Object} payload - { sessionId, userId, interviewType, message, history }
   * @returns {Promise<Object>} - AI response containing next question.
   */
  sendMessage: async (payload) => {
    const response = await api.post('/gemini/message', payload);
    return response;
  },

  /**
   * Evaluate the completed interview and get score, strengths, weaknesses, and suggestions.
   * @param {Object} payload - { sessionId, userId, interviewType, history }
   * @returns {Promise<Object>} - Evaluation result.
   */
  evaluate: async (payload) => {
    const response = await api.post('/gemini/evaluate', payload);
    return response;
  }
};

export default geminiService;
