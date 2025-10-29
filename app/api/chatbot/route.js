export async function POST(request) {
  try {
    const body = await request.json();
    
    // For now, just return "hi"
    // In the future, this will handle the actual chatbot logic
    return new Response(
      JSON.stringify({ 
        message: "hi",
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
