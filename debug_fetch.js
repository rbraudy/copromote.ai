
(async () => {
    try {
        const res = await fetch("https://tikocqefwifjcfhgqdyj.supabase.co/functions/v1/debug-logs", {
            headers: {
                "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpa29jcWVmd2lmamNmaGdxZHlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMzY2NTIsImV4cCI6MjA3OTkxMjY1Mn0.6kJFZwE5JlYLAgZF00olzz1iHlC_kVFeASwLTlJRT-A"
            }
        });
        console.log(await res.text());
    } catch (e) {
        console.error(e);
    }
})();
