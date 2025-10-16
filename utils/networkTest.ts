export async function testNetworkConnectivity() {
  const tests = [
    { name: 'Google', url: 'https://www.google.com' },
    { name: 'API Health', url: 'https://api.ozzu.world/healthz' },
    { name: 'IDP', url: 'https://idp.ozzu.world' },
  ];

  console.log('🌐 Testing network connectivity...');

  for (const test of tests) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(test.url, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log(`✅ ${test.name}: OK (${response.status})`);
    } catch (error: any) {
      console.log(`❌ ${test.name}: FAILED - ${error.message}`);
    }
  }
}