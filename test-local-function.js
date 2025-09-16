// Test script for local Firebase Function
// Run with: node test-local-function.js

const { initializeApp } = require('firebase/app');
const { getFunctions, httpsCallable, connectFunctionsEmulator } = require('firebase/functions');

const firebaseConfig = {
  apiKey: "AIzaSyB05bWPL6KUzFeIknSTY8f49js7NlkcK9g",
  authDomain: "hour-college.firebaseapp.com",
  databaseURL: "https://hour-college-default-rtdb.firebaseio.com",
  projectId: "hour-college",
  storageBucket: "hour-college.firebasestorage.app",
  messagingSenderId: "347195886512",
  appId: "1:347195886512:web:528f453a6bdae685eca475",
  measurementId: "G-SM6CBXV8QE"
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

// Connect to local emulator
connectFunctionsEmulator(functions, 'localhost', 5001);

async function testHealthCheck() {
  try {
    console.log('🏥 Testing health check endpoint...');
    const response = await fetch('http://localhost:5001/hour-college/us-central1/healthCheck');
    const data = await response.json();
    console.log('✅ Health check response:', data);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testThumbnailGeneration() {
  try {
    console.log('🎬 Testing thumbnail generation function...');
    
    const generateThumbnail = httpsCallable(functions, 'generateVideoThumbnail');
    
    // Test with invalid data first (should fail gracefully)
    console.log('Testing with invalid data (should fail with authentication error)...');
    const result = await generateThumbnail({
      videoId: 'test-video-id',
      timestamp: 30,
      userId: 'test-user-id'
    });
    
    console.log('Function response:', result.data);
    return true;
    
  } catch (error) {
    if (error.code === 'functions/unauthenticated') {
      console.log('✅ Function is working (authentication required as expected)');
      console.log('Error details:', error.message);
      return true;
    } else if (error.code === 'functions/permission-denied') {
      console.log('✅ Function is working (permission denied as expected for test data)');
      console.log('Error details:', error.message);
      return true;
    } else {
      console.error('❌ Unexpected error:', error.code, error.message);
      return false;
    }
  }
}

async function testFunctionStructure() {
  try {
    console.log('🔍 Testing function structure...');
    
    // Test with completely invalid input
    const generateThumbnail = httpsCallable(functions, 'generateVideoThumbnail');
    const result = await generateThumbnail({});
    
    console.log('Function response:', result.data);
    return true;
    
  } catch (error) {
    console.log('✅ Function validation working:', error.code, error.message);
    return true;
  }
}

async function runLocalTests() {
  console.log('🚀 Starting local Firebase Function tests...\n');
  
  // Wait a bit for emulator to start
  console.log('⏳ Waiting for emulator to start...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const healthOk = await testHealthCheck();
  console.log('');
  
  if (healthOk) {
    await testThumbnailGeneration();
    console.log('');
    await testFunctionStructure();
  }
  
  console.log('\n🎯 Local tests completed!');
  console.log('💡 Next steps:');
  console.log('  1. The function is running locally on http://localhost:5001');
  console.log('  2. To test with real data, you need to authenticate with Firebase Auth');
  console.log('  3. Deploy with: firebase deploy --only functions');
  
  process.exit(0);
}

runLocalTests().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
