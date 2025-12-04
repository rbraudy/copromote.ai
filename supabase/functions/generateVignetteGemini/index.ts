import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { bundle, style = 'photorealistic product photography', setting = 'modern kitchen' } = await req.json()

        if (!bundle) throw new Error('Missing bundle data')

        // 1. Initialize Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, serviceKey)

        // 2. Fetch Product Details
        console.log(`Fetching details for Seller Product: ${bundle.seller_product_id} and Partner Product: ${bundle.customer_product_id}`)

        const { data: sellerProduct, error: sellerError } = await supabase
            .from('products')
            .select('*')
            .eq('id', bundle.seller_product_id)
            .single()

        if (sellerError) throw new Error(`Error fetching seller product: ${sellerError.message}`)

        const { data: customerProduct, error: customerError } = await supabase
            .from('external_products')
            .select('*')
            .eq('id', bundle.customer_product_id)
            .single()

        if (customerError) throw new Error(`Error fetching partner product: ${customerError.message}`)

        // 3. Fetch and Convert Images to Base64
        const fetchAndConvertImage = async (url: string) => {
            if (!url) return null;

            const fetchWithRetry = async (targetUrl: string, useProxy = false) => {
                const finalUrl = useProxy ? `https://corsproxy.io/?${encodeURIComponent(targetUrl)}` : targetUrl;
                try {
                    console.log(`Fetching: ${finalUrl} (Proxy: ${useProxy})`);
                    const response = await fetch(finalUrl, {
                        referrerPolicy: 'no-referrer',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
                        }
                    });

                    if (!response.ok) {
                        console.warn(`Failed to fetch ${finalUrl}: ${response.status}`);
                        if (!useProxy) return await fetchWithRetry(targetUrl, true); // Retry with proxy
                        throw new Error(`Failed to fetch image: ${response.status}`);
                    }

                    console.log(`Status: ${response.status}`);
                    // console.log(`Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);

                    const buffer = await response.arrayBuffer();
                    if (buffer.byteLength === 0) {
                        console.warn(`Empty buffer for ${finalUrl}`);
                        if (!useProxy) return await fetchWithRetry(targetUrl, true); // Retry with proxy
                        throw new Error("Empty image received");
                    }

                    const bytes = new Uint8Array(buffer);

                    // Chunking to avoid stack overflow
                    let binary = '';
                    const len = bytes.byteLength;
                    const chunkSize = 1024;

                    for (let i = 0; i < len; i += chunkSize) {
                        const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
                        binary += String.fromCharCode(...chunk);
                    }

                    return btoa(binary);
                } catch (e: any) {
                    console.error(`Error fetching ${finalUrl}:`, e);
                    if (!useProxy) return await fetchWithRetry(targetUrl, true); // Retry with proxy
                    return `ERROR: ${e.message}`;
                }
            };

            return await fetchWithRetry(url);
        };

        // Resolve Image URLs (DB > Bundle Fallback)
        const sellerImgUrl = sellerProduct.image_url || sellerProduct.imageUrl || bundle.seller_product_image;
        const partnerImgUrl = customerProduct.image_url || customerProduct.imageUrl || bundle.partner_product_image;

        console.log(`Resolved Seller Image URL: ${sellerImgUrl}`);
        console.log(`Resolved Partner Image URL: ${partnerImgUrl}`);

        const img1Base64 = await fetchAndConvertImage(sellerImgUrl);
        const img2Base64 = await fetchAndConvertImage(partnerImgUrl);

        console.log(`Image 1 Base64 Length: ${img1Base64?.length}, Starts with: ${img1Base64?.substring(0, 20)}`);
        console.log(`Image 2 Base64 Length: ${img2Base64?.length}, Starts with: ${img2Base64?.substring(0, 20)}`);

        if (!img1Base64 || img1Base64.startsWith('ERROR:') || !img2Base64 || img2Base64.startsWith('ERROR:')) {
            const getError = (base64: string | null, url: string | null) => {
                if (!url) return 'Missing URL in DB';
                if (!base64) return 'Empty Data Returned';
                if (base64.startsWith('ERROR:')) return base64;
                return 'Success';
            };

            const err1 = getError(img1Base64, sellerImgUrl);
            const err2 = getError(img2Base64, partnerImgUrl);

            throw new Error(`Failed to retrieve product images. Seller: ${err1}, Partner: ${err2}`);
        }

        // 4. Call Gemini API
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
        if (!geminiApiKey) throw new Error("Missing GEMINI_API_KEY");

        const prompt = `
Create a high-quality ${style} vignette image showing these two products together in a ${setting} setting:

Product 1: ${sellerProduct.name}
${sellerProduct.description?.substring(0, 200) || ''}

Product 2: ${customerProduct.title}
${customerProduct.original_data?.body_html?.replace(/<[^>]*>?/gm, '').substring(0, 200) || ''}

CRITICAL REQUIREMENTS:
- MUST use the two uploaded product images provided (one from seller, one from customer)
- Show both products EXACTLY as they appear in the reference images
- Maintain the exact appearance, colors, textures, and details from the uploaded images
- Professional product photography style
- Both products clearly visible and prominent in the scene
- Natural lighting with realistic shadows
- Contextually appropriate ${setting} environment
- Clean, uncluttered composition
- Products arranged naturally as they would be used together
- High resolution, sharp focus
- Warm, inviting atmosphere
- Realistic product representation based on the provided reference images
`;

        console.log("Calling Gemini API...");

        // Using the REST API directly for the preview model
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${geminiApiKey}`;

        const payload = {
            contents: [{
                parts: [
                    { text: prompt },
                    {
                        inline_data: {
                            mime_type: "image/jpeg", // Assuming JPEG, Gemini is usually flexible
                            data: img1Base64
                        }
                    },
                    {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: img2Base64
                        }
                    }
                ]
            }],
            generationConfig: {
                responseModalities: ["IMAGE"],
                // aspect_ratio: "4:3" // Not supported in all endpoints yet, relying on prompt/default
            }
        };

        const geminiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!geminiResponse.ok) {
            const errText = await geminiResponse.text();
            throw new Error(`Gemini API Error: ${geminiResponse.status} - ${errText}`);
        }

        const geminiData = await geminiResponse.json();
        console.log("Gemini Response:", JSON.stringify(geminiData, null, 2));

        // Extract Image
        // The structure for image response varies, checking for inline data
        const generatedPart = geminiData.candidates?.[0]?.content?.parts?.[0];

        if (!generatedPart || !generatedPart.inlineData) {
            // Fallback check for text if image failed
            const textPart = generatedPart?.text;
            if (textPart) throw new Error(`Gemini returned text instead of image: ${textPart}`);
            throw new Error(`Gemini did not return a valid image. Response: ${JSON.stringify(geminiData)}`);
        }

        const generatedImageBase64 = generatedPart.inlineData.data;
        const mimeType = generatedPart.inlineData.mimeType || 'image/png';

        console.log("Uploading generated image to Supabase Storage...");

        // Convert Base64 back to Blob
        const byteCharacters = atob(generatedImageBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const imageBlob = new Blob([byteArray], { type: mimeType });

        const fileName = `vignette_${bundle.seller_product_id}_${bundle.customer_product_id}_${Date.now()}.${mimeType.split('/')[1]}`;

        // Ensure bucket exists
        const { data: buckets, error: listBucketsError } = await supabase.storage.listBuckets();
        if (listBucketsError) console.error("Error listing buckets:", listBucketsError);

        const bucketExists = buckets?.find(b => b.name === 'vignettes');
        if (!bucketExists) {
            console.log("Creating 'vignettes' bucket...");
            const { error: createBucketError } = await supabase.storage.createBucket('vignettes', {
                public: true,
                fileSizeLimit: 10485760, // 10MB
                allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp']
            });
            if (createBucketError) console.error("Error creating bucket:", createBucketError);
        }

        const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from('vignettes') // Ensure this bucket exists!
            .upload(fileName, imageBlob, {
                contentType: mimeType,
                upsert: false
            });

        if (uploadError) throw new Error(`Storage Upload Error: ${uploadError.message}`);

        // Get Public URL
        const { data: { publicUrl } } = supabase
            .storage
            .from('vignettes')
            .getPublicUrl(fileName);

        console.log("Success! Image URL:", publicUrl);

        return new Response(
            JSON.stringify({
                imageUrl: publicUrl,
                promptUsed: prompt
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
