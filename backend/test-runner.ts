const BASE_URL = 'http://localhost:3000/api/test';

async function runTests() {
  const tests = ['auth', 'planner', 'depth', 'codegen', 'validator', 'pipeline'];
  
  for (const test of tests) {
    console.log(`\n--- Running test: ${test} ---`);
    try {
      const response = await fetch(`${BASE_URL}/${test}`, { method: 'POST' });
      const data: any = await response.json();
      
      if (response.ok) {
        console.log(`✅ Success:`, data.message);
        if (test === 'validator') {
          console.log(`Validator correct files success:`, data.data.correctResult.success);
          console.log(`Validator error files success:`, data.data.errorResult.success);
        }
      } else {
        console.error(`❌ Failed:`, data);
      }
    } catch (error: any) {
      console.error(`❌ Failed:`, error.message);
    }
  }
}

runTests();
