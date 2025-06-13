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

    const cleanSiteName = siteName.trim();
    const cleanUsername = username.trim();
    
    console.log('Checking for duplicate site name:', cleanSiteName);

    // Check if this site name already exists (case-insensitive)
    const filterFormula = `LOWER({siteName})=LOWER('${cleanSiteName.replace(/'/g, "\\'")}')`;
    console.log('Using filter formula:', filterFormula);
    
    const existingSubmissionsResponse = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/submissions?filterByFormula=${encodeURIComponent(filterFormula)}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_TOKEN}`,
        }
      }
    );

    if (!existingSubmissionsResponse.ok) {
      const errorText = await existingSubmissionsResponse.text();
      console.log('Error checking existing submissions:', errorText);
      // Continue without duplicate check if this fails
    } else {
      const existingSubmissions = await existingSubmissionsResponse.json();
      console.log('Found', existingSubmissions.records.length, 'existing submissions with this name');
      
      if (existingSubmissions.records.length > 0) {
        const existingSubmission = existingSubmissions.records[0];
        console.log('Blocking duplicate submission:', cleanSiteName);
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
          body: JSON.stringify({
            error: `This site name "${cleanSiteName}" has already been submitted by ${existingSubmission.fields.username}!`,
            success: false
          }),
        };
      }
    }

    // Create the submission in Airtable
    console.log('Creating new submission:', cleanSiteName, 'by', cleanUsername);
    const response = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/submissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.AIRTABLE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          username: cleanUsername,
          siteName: cleanSiteName,
          approved: true,
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Airtable submission error:', error);
      throw new Error(`Airtable error: ${error.error?.message || 'Unknown error'}`);
    }

    const result = await response.json();
    console.log('Submission created successfully:', result.id);

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