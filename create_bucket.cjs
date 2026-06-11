const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
    // We need service_role key to create public buckets, but let's try with anon key if RLS allows it, or we'll just ask the user to create it if it fails.
    // Actually, VITE_SUPABASE_ANON_KEY cannot create buckets. We need the service role key.
    // Let's check if the user has the service role key in .env
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const adminSupabase = createClient(process.env.VITE_SUPABASE_URL, serviceKey);
    
    const { data, error } = await adminSupabase.storage.createBucket('videos', {
        public: true,
        allowedMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
        fileSizeLimit: 52428800 // 50MB
    });
    console.log("Bucket creation result:", data, error);
}
run();
