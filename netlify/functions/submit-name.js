// netlify/functions/submit-name.js
exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse the form data
    const data = JSON.parse(event.body);
    const { username, siteName } = data;

    // Basic validation
    if (!username || !siteName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Username and site name are required' }),
      };
    }

    // Create the submission in Airtable
    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/submissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          username: username.trim(),
          siteName: siteName.trim(),
          approved: true,
          // Remove createdAt - let Airtable handle it automatically
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Airtable error: ${error.error?.message || 'Unknown error'}`);
    }

    const result = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({
        success: true,
        id: result.id,
        message: 'Name submitted successfully!',
      }),
    };
  } catch (error) {
    console.error('Error submitting name:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to submit name',
        details: error.message,
      }),
    };
  }
};