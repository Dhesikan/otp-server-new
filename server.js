const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));
app.options('*', cors());
app.use(express.json());

const otpStore = new Map();

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

console.log('========================================');
console.log('🚀 OTP Server Starting...');
console.log('========================================');
console.log(`📧 Email: ${EMAIL_USER || 'NOT SET'}`);
console.log(`🔑 Password: ${EMAIL_PASS ? 'SET ✓' : 'NOT SET'}`);
console.log('========================================');

// Simple email template
const getEmailTemplate = (otp) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background: #0a0f1c; padding: 40px;">
    <div style="max-width: 500px; margin: 0 auto; background: #1e293b; border-radius: 16px; padding: 30px; border: 1px solid #38bdf8;">
        <h1 style="color: #38bdf8; text-align: center;">Secure Portal</h1>
        <h2 style="color: white; text-align: center;">Your OTP Code</h2>
        <div style="background: #0f172a; padding: 20px; text-align: center; border-radius: 12px; margin: 20px 0;">
            <span style="font-size: 48px; font-weight: bold; letter-spacing: 8px; color: #38bdf8;">${otp}</span>
        </div>
        <p style="color: #94a3b8; text-align: center;">This code expires in 10 minutes.</p>
        <p style="color: #ef4444; text-align: center; font-size: 12px;">Never share this code with anyone.</p>
    </div>
</body>
</html>
`;

// SEND OTP API - FIXED VERSION
app.post('/api/send-otp', async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.json({ success: false, message: 'Email is required' });
    }
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { otp, expires: Date.now() + 10 * 60 * 1000 });
    
    console.log(`📧 OTP for ${email}: ${otp}`);
    
    // Try to send real email
    if (EMAIL_USER && EMAIL_PASS) {
        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: { user: EMAIL_USER, pass: EMAIL_PASS },
                tls: { rejectUnauthorized: false }
            });
            
            const info = await transporter.sendMail({
                from: `"Secure Portal" <${EMAIL_USER}>`,
                to: email,
                subject: 'Your OTP Code',
                html: getEmailTemplate(otp)
            });
            
            console.log(`✅ Email SENT! Message ID: ${info.messageId}`);
            return res.json({ success: true, message: 'OTP sent to your email' });
            
        } catch (error) {
            console.error(`❌ Email FAILED: ${error.message}`);
            // Fall through to demo mode
        }
    }
    
    // Demo mode fallback
    console.log(`⚠️ DEMO MODE: Use OTP ${otp}`);
    return res.json({ 
        success: true, 
        message: `Demo Mode - Use OTP: ${otp}`,
        demoOtp: otp
    });
});

// VERIFY OTP API
app.post('/api/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
        return res.json({ success: false, message: 'Email and OTP are required' });
    }
    
    const record = otpStore.get(email);
    
    if (!record) {
        return res.json({ success: false, message: 'No OTP found. Request a new one.' });
    }
    
    if (record.expires < Date.now()) {
        otpStore.delete(email);
        return res.json({ success: false, message: 'OTP expired. Request a new one.' });
    }
    
    if (record.otp === otp) {
        otpStore.delete(email);
        console.log(`✅ OTP verified for ${email}`);
        return res.json({ success: true, message: 'OTP verified successfully' });
    }
    
    console.log(`❌ Invalid OTP for ${email}`);
    return res.json({ success: false, message: 'Invalid OTP' });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
    res.json({ status: 'OTP Server Running', endpoints: { send: 'POST /api/send-otp', verify: 'POST /api/verify-otp' } });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});
