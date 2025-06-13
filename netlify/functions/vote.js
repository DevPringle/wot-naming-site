// netlify/functions/vote.js
exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse the vote data
    const data = JSON.parse(event.body);
    const { voterUsername, submissionId } = data;

    // Basic validation
    if (!voterUsername || !submissionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Voter username and submission ID are required' }),
      };
    }

    // Create the vote in Airtable
    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/votes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          voterUsername: voterUsername.trim(),
          submissionId: submissionId,
          createdAt: new Date().toISOString(),
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Airtable error: ${error.error?.message || 'Unknown error'}`);
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({
        success: true,
        message: 'Vote cast successfully!',
      }),
    };
  } catch (error) {
    console.error('Error casting vote:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to cast vote',
        details: error.message,
      }),
    };
  }
};