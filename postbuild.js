const axios = require('axios');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function postBuildTask() {
  console.log("Waiting for 5 seconds...");
  await sleep(5000);

  console.log("Making POST request to notifier.js...");
  try {
    const response = await axios.post(`https://${process.env.DOMAIN}/api/notifier/run`, {
      // Add any data you need to send in the POST request here
      key: 'value'
    });
    console.log(`Response status: ${response.status}`);
    console.log(`Response data: ${response.data}`);
  } catch (error) {
    console.error(`There was an error making the POST request: ${error}`);
  }
}

postBuildTask();
