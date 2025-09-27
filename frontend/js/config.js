const getAPIURL = () => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }
  
  // Use your actual backend URL
  return 'https://rentrush2.vercel.app';
};

window.API_URL = getAPIURL();
console.log('API URL:', window.API_URL);