require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { GoogleAuth } = require('google-auth-library');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  try {
    console.log('Fetching creds from DB...');
    const { data: config, error } = await supabase.from('system_config').select('key_value').eq('key_name', 'GOOGLE_CREDENTIALS').maybeSingle();
    if (error) throw error;
    
    console.log('Got config:', !!config);
    const credsStr = config?.key_value || process.env.GOOGLE_CREDENTIALS;
    
    let authOptions = { scopes: ['https://www.googleapis.com/auth/drive.file'] };
    if (credsStr) {
        authOptions.credentials = typeof credsStr === 'string' ? JSON.parse(credsStr) : credsStr;
        console.log('Parsed credentials, client_email:', authOptions.credentials.client_email);
    } else {
        throw new Error('NO CREDENTIALS FOUND');
    }
    
    const auth = new GoogleAuth(authOptions);
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    console.log('Got access token:', !!token.token);
    
    // Also test the fetch
    const metadata = {
        name: "test.mp4",
        parents: ['1EHXi800HrwkDWOgd-l0lXKtQZkMlSFyV']
    };

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token.token}`,
            'Content-Type': 'application/json',
            'X-Upload-Content-Type': 'video/mp4'
        },
        body: JSON.stringify(metadata)
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error('Google Drive Error: ' + text);
    }

    const resumableUrl = response.headers.get('Location');
    console.log('Success, url:', resumableUrl);
  } catch(e) {
    console.error('ERROR:', e.message);
  }
}
test();
