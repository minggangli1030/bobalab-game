// src/utils/codeVerification.js - Placeholder
export const codeVerification = {
  getCodeFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('code') || params.get('c') || null;
  }
};