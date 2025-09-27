// API Configuration
   const getAPIURL = () => {
     // Check if we're running locally
     if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
       return 'http://localhost:3000';
     }
     
     // Production API URL
     return 'https://rentrush2.vercel.app';
   };

   window.API_URL = getAPIURL();
   console.log('API URL:', window.API_URL);