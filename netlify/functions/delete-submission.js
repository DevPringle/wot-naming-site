// netlify/functions/delete-submission.js
exports.handler = async (event, context) => {
  // Only allow DELETE requests
  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse the request data
    const data = JSON.parse(event.body);
    const { submissionId, adminPassword } = data;

    // Check admin password
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Invalid admin password' }),
      };
    }

    // Basic validation
    if (!submissionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Submission ID is required' }),
      };
    }

    // Delete the submission from Airtable
    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/submissions/${submissionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_API_TOKEN}`,
      }
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
        message: 'Submission deleted successfully!',
      }),
    };
  } catch (error) {
    console.error('Error deleting submission:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to delete submission',
        details: error.message,
      }),
    };
  }
};