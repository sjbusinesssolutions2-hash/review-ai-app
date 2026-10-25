// js/config.js
const CONFIG = {
  // Dynamically switch between local testing and production server
  API_BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://review-ai-backend-03sb.onrender.com',
  
  // Standardized Storage Keys (Single Source of Truth)
  STORAGE_KEYS: {
    USER_ID: 'sjbs_user_id',
    USER_NAME: 'sjbs_user_name',
    ACTIVE_BUSINESS_ID: 'sjbs_selected_business_id',
    BUSINESS_NAME: 'sjbs_business_name',
    BUSINESS_PLAN: 'sjbs_business_plan',
    USER_DATA: 'user'
  },

  // Support Email
  SUPPORT_EMAIL: 'sj.business.solutions.2@gmail.com'
};
