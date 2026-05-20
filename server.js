const express = require('express');
const cors = require('cors');
const https = require('https');
const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type'] }));
app.options('*', cors());
app.use(express.json());

const otpStore = new Map();
const RESEND_API_KEY = process.env.RESEND_API_KEY;

console.log('========================================');
console.log('🚀 OTP Server Starting...');
console.log('========================================');
console.log(`📧 Resend API Key: ${RESEND_API_KEY ? 'CONFIGURED ✅' : 'NOT SET ❌'}`);
console.log('========================================');

// Send OTP using Resend API
app.post('/api/send-otp', async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.json({ success: false, message: 'Email is required' });
    }
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { otp, expires: Date.now() + 10 * 60 * 1000 });
    
    console.log(`📧 OTP for ${email}: ${otp}`);
    
    if (!RESEND_API_KEY) {
        console.log('⚠️ No API key, using demo mode');
        return res.json({ success: true, message: `Demo OTP: ${otp}`, demoOtp: otp });
    }
    
    const postData = JSON.stringify({
        from: 'Secure Portal <onboarding@resend.dev>',
        to: [email],
        subject: '🔐 Your OTP Code - Secure Portal',
        html: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"></head>
            <body style="font-family: Arial, sans-serif; background: #0a0f1c; padding: 40px; margin: 0;">
                <div style="max-width: 550px; margin: 0 auto; background: linear-gradient(135deg, #1e293b, #0f172a); border-radius: 24px; padding: 40px; border: 1px solid rgba(56, 189, 248, 0.3);">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="font-size: 32px; font-weight: 800; background: linear-gradient(135deg, #38bdf8, #a78bfa); -webkit-background-clip: text; background-clip: text; color: transparent;">SECURE PORTAL</h1>
                    </div>
                    <div style="text-align: center;">
                        <span style="display: inline-flex; align-items: center; gap: 8px; background: rgba(16, 185, 129, 0.2); padding: 6px 14px; border-radius: 40px; font-size: 12px; color: #10b981; margin-bottom: 20px;">✨ One-Time Password ✨</span>
                    </div>
                    <h2 style="color: #ffffff; font-size: 24px; text-align: center; margin-bottom: 10px;">Your Verification Code</h2>
                    <p style="color: #94a3b8; text-align: center; font-size: 14px; margin-bottom: 30px;">Use the following OTP to complete your secure login</p>
                    <div style="background: #020617; border-radius: 20px; padding: 30px; text-align: center; border: 2px solid rgba(56, 189, 248, 0.3); margin: 20px 0;">
                        <span style="font-size: 52px; font-weight: 800; letter-spacing: 12px; font-family: monospace; background: linear-gradient(135deg, #38bdf8, #a78bfa); -webkit-background-clip: text; background-clip: text; color: transparent;">${otp}</span>
                    </div>
                    <div style="text-align: center; margin: 20px 0;">
                        <span style="color: #f59e0b; font-size: 13px;">⏰ This code expires in 10 minutes</span>
                    </div>
                    <div style="text-align: center; margin: 25px 0;">
                        <p style="color: #cbd5e1; font-size: 14px;"><span style="color: #38bdf8;">🔒</span> This is a one-time password for your secure login.<br><strong style="color: #ef4444;">Never share this code</strong> with anyone.</p>
                    </div>
                    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(56, 189, 248, 0.1);">
                        <p style="color: #5b6e8c; font-size: 11px;">Secure Portal • 3-Layer Authentication</p>
                    </div>
                </div>
            </body>
            </html>
        `
    });
    
    const options = {
        hostname: 'api.resend.com',
        path: '/v1/emails',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };
    
    const request = https.request(options, (response) => {
        let data = '';
        response.on('data', chunk => data += chunk);
        response.on('end', () => {
            if (response.statusCode === 200) {
                console.log(`✅ Email sent to ${email}`);
                res.json({ success: true, message: 'OTP sent to your email' });
            } else {
                console.error(`❌ Error: ${data}`);
                res.json({ success: false, message: 'Failed to send OTP' });
            }
        });
    });
    
    request.on('error', (error) => {
        console.error('❌ Request error:', error);
        res.json({ success: false, message: 'Failed to send OTP' });
    });
    
    request.write(postData);
    request.end();
});

// Verify OTP
app.post('/api/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    const record = otpStore.get(email);
    
    if (!record) {
        return res.json({ success: false, message: 'No OTP found. Please request a new one.' });
    }
    if (record.expires < Date.now()) {
        otpStore.delete(email);
        return res.json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }
    if (record.otp === otp) {
        otpStore.delete(email);
        console.log(`✅ OTP verified for ${email}`);
        return res.json({ success: true, message: 'OTP verified successfully' });
    }
    return res.json({ success: false, message: 'Invalid OTP. Please try again.' });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString(), resendConfigured: !!RESEND_API_KEY });
});

app.get('/', (req, res) => {
    res.json({ status: 'OTP Server Running', resendConfigured: !!RESEND_API_KEY });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📧 Resend: ${RESEND_API_KEY ? 'READY ✅' : 'NOT CONFIGURED ❌'}`);
});
