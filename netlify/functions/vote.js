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

    // Get the user's IP address
    const userIP = event.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                   event.headers['x-real-ip'] || 
                   event.headers['cf-connecting-ip'] || 
                   'unknown';
    
    console.log('Vote attempt from IP:', userIP, 'for submission:', submissionId);

    // Check if this IP already voted for this submission
    const filterFormula = `AND({voterIP}='${userIP}',{submissionId}='${submissionId}')`;
    console.log('Checking for existing votes with filter:', filterFormula);
    
    const existingVotesResponse = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/votes?filterByFormula=${encodeURIComponent(filterFormula)}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_TOKEN}`,
        }
      }
    );

    if (!existingVotesResponse.ok) {
      const errorText = await existingVotesResponse.text();
      console.log('Error checking existing votes:', errorText);
      // Continue without duplicate check if this fails
    } else {
      const existingVotes = await existingVotesResponse.json();
      console.log('Found', existingVotes.records.length, 'existing votes from this IP for this submission');
      
      if (existingVotes.records.length > 0) {
        console.log('Blocking duplicate vote from IP:', userIP);
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
          body: JSON.stringify({
            error: 'You have already voted for this submission!',
            success: false
          }),
        };
      }
    }

    // Create the vote in Airtable
    console.log('Creating new vote for IP:', userIP);
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
          voterIP: userIP,
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Airtable error:', error);
      throw new Error(`Airtable error: ${error.error?.message || 'Unknown error'}`);
    }

    console.log('Vote recorded successfully for IP:', userIP);
    
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
