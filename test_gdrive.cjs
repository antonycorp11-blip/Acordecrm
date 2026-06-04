require('dotenv').config();
const { google } = require('googleapis');

async function testDrive() {
  try {
    const creds = JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS || '{}');
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: creds.client_email,
        private_key: creds.private_key,
      },
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });
    const drive = google.drive({ version: 'v3', auth });
    
    const res = await drive.files.list({ pageSize: 1 });
    console.log("Drive OK, found files:", res.data.files.length);
  } catch (err) {
    console.error("Drive Error:", err.message);
  }
}
testDrive();
