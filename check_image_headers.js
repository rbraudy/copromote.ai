const url = "https://cdn.shopify.com/s/files/1/0533/4112/6832/files/ALF3206_98fc8d4a-5804-486e-a713-391cc2e8a730.jpg?v=1744123741";

async function check() {
    try {
        console.log(`Checking URL: ${url}`);
        const res = await fetch(url, {
            method: 'HEAD',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        console.log(`Status: ${res.status}`);
        console.log(`Content-Length: ${res.headers.get('content-length')}`);
        console.log(`Content-Type: ${res.headers.get('content-type')}`);
    } catch (e) {
        console.error("Error:", e);
    }
}

check();
