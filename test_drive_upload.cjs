const { GoogleAuth } = require('google-auth-library');
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function upload() {
    try {
        const { data: config } = await supabase.from('system_config').select('key_value').eq('key_name', 'GOOGLE_CREDENTIALS').maybeSingle();
        const credsStr = config?.key_value || process.env.GOOGLE_CREDENTIALS;
        
        const auth = new GoogleAuth({
            credentials: JSON.parse(credsStr),
            scopes: ['https://www.googleapis.com/auth/drive.file']
        });
        const client = await auth.getClient();
        const token = await client.getAccessToken();

        const metadata = {
            name: 'test_upload_node.txt',
            parents: ['1EHXi800HrwkDWOgd-l0lXKtQZkMlSFyV']
        };

        const initRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token.token}`,
                'Content-Type': 'application/json',
                'X-Upload-Content-Type': 'text/plain'
            },
            body: JSON.stringify(metadata)
        });

        if (!initRes.ok) {
            console.error("Init failed:", await initRes.text());
            return;
        }
        
        const uploadUrl = initRes.headers.get('Location');
        console.log("Got uploadUrl:", uploadUrl);

        // Upload Data (with auth)
        const putRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'text/plain',
                'Authorization': `Bearer ${token.token}`
            },
            body: 'Hello World from Node with Auth'
        });

        if (!putRes.ok) {
            console.error("PUT failed (with auth):", putRes.status, await putRes.text());
        } else {
            console.log("PUT succeeded (with auth)!");
        }

        // Try without auth on a new URL
        const initRes2 = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token.token}`,
                'Content-Type': 'application/json',
                'X-Upload-Content-Type': 'text/plain'
            },
            body: JSON.stringify(metadata)
        });
        const uploadUrl2 = initRes2.headers.get('Location');
        
        const putRes2 = await fetch(uploadUrl2, {
            method: 'PUT',
            headers: {
                'Content-Type': 'text/plain'
            },
            body: 'Hello World from Node without auth'
        });

        if (!putRes2.ok) {
            console.error("PUT failed (without auth):", putRes2.status, await putRes2.text());
        } else {
            console.log("PUT succeeded (without auth)!");
        }

    } catch (e) {
        console.error("Error:", e.message);
    }
}
upload();
