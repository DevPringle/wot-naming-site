// netlify/functions/get-submissions.js
exports.handler = async (event, context) => {
  // Allow GET requests only
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Get all approved submissions from Airtable
    const submissionsResponse = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/submissions?filterByFormula={approved}=TRUE()`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_TOKEN}`,
        }
      }
    );

    if (!submissionsResponse.ok) {
      throw new Error(`Failed to fetch submissions: ${submissionsResponse.statusText}`);
    }

    const submissionsData = await submissionsResponse.json();

    // Get all votes from Airtable
    const votesResponse = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/votes`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_TOKEN}`,
        }
      }
    );

    if (!votesResponse.ok) {
      throw new Error(`Failed to fetch votes: ${votesResponse.statusText}`);
    }

    const votesData = await votesResponse.json();

    // Calculate vote counts per submission
    const voteCounts = {};
    votesData.records.forEach(vote => {
      const submissionId = vote.fields.submissionId;
      voteCounts[submissionId] = (voteCounts[submissionId] || 0) + 1;
    });

    // Add vote counts to submissions
    const submissionsWithVotes = submissionsData.records.map(record => ({
      id: record.id,
      username: record.fields.username,
      siteName: record.fields.siteName,
      createdAt: record.fields.createdAt,
      voteCount: voteCounts[record.id] || 0
    }));

    const totalVotes = Object.values(voteCounts).reduce((sum, count) => sum + count, 0);
    const topVotes = Math.max(...Object.values(voteCounts), 0);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({
        submissions: submissionsWithVotes,
        totalVotes: totalVotes,
        topVotes: topVotes
      }),
    };
  } catch (error) {
    console.error('Error getting submissions:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to get submissions',
        details: error.message,
      }),
    };
  }
};