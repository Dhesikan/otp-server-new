const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const app = express();

// ============ CORS CONFIGURATION (FIXED) ============
app.use(cors({
    origin: '*',  // Allow all origins (Netlify, Vercel, localhost)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json());

// Store OTPs temporarily
const otpStore = new Map();

// ============ READ ENVIRONMENT VARIABLES ============
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

console.log('========================================');
console.log('🚀 OTP Server Starting...');
console.log('========================================');
console.log(`📧 Email configured: ${EMAIL_USER ? 'YES' : 'NO'}`);
console.log(`🔑 Password configured: ${EMAIL_PASS ? 'YES' : 'NO'}`);
console.log(`🌐 CORS enabled for all origins`);
console.log('========================================');

// ============ GLOW EMAIL TEMPLATE ============
const getGlowEmailTemplate = (otp) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Secure Portal | OTP Verification</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            margin: 0;
            padding: 0;
            background: radial-gradient(circle at 20% 30%, #0a0f1c, #020617);
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        @keyframes glowPulse {
            0% { box-shadow: 0 0 5px rgba(56, 189, 248, 0.3), 0 0 10px rgba(56, 189, 248, 0.2); }
            50% { box-shadow: 0 0 20px rgba(56, 189, 248, 0.6), 0 0 30px rgba(168, 85, 247, 0.4); }
            100% { box-shadow: 0 0 5px rgba(56, 189, 248, 0.3), 0 0 10px rgba(56, 189, 248, 0.2); }
        }
        @keyframes textGlow {
            0% { text-shadow: 0 0 5px #38bdf8, 0 0 10px #38bdf8; }
            50% { text-shadow: 0 0 15px #38bdf8, 0 0 25px #a78bfa, 0 0 35px #a78bfa; }
            100% { text-shadow: 0 0 5px #38bdf8, 0 0 10px #38bdf8; }
        }
        .container { max-width: 520px; margin: 20px; width: 100%; }
        .card {
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%);
            backdrop-filter: blur(12px);
            border-radius: 32px;
            padding: 45px 35px;
            border: 1px solid rgba(56, 189, 248, 0.3);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 20px rgba(56, 189, 248, 0.1);
            animation: glowPulse 3s ease-in-out infinite;
        }
        .logo { text-align: center; margin-bottom: 30px; }
        .logo-text { font-size: 32px; font-weight: 800; background: linear-gradient(135deg, #38bdf8, #a78bfa, #c084fc); -webkit-background-clip: text; background-clip: text; color: transparent; letter-spacing: 2px; animation: textGlow 2s ease-in-out infinite; }
        .security-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: linear-gradient(135deg, #10b98120, #05966920);
            padding: 8px 16px;
            border-radius: 40px;
            font-size: 12px;
            color: #10b981;
            margin-bottom: 25px;
            border: 1px solid rgba(16, 185, 129, 0.3);
        }
        h2 { color: #ffffff; font-size: 26px; text-align: center; margin-bottom: 10px; font-weight: 700; }
        .subtitle { color: #94a3b8; text-align: center; font-size: 14px; margin-bottom: 35px; }
        .otp-box {
            background: linear-gradient(135deg, #0f172a, #020617);
            border-radius: 24px;
            padding: 35px 25px;
            text-align: center;
            border: 2px solid rgba(56, 189, 248, 0.3);
            margin: 25px 0;
            animation: glowPulse 2s ease-in-out infinite;
        }
        .otp-code {
            font-size: 56px;
            font-weight: 800;
            letter-spacing: 12px;
            font-family: 'Courier New', 'Fira Code', monospace;
            background: linear-gradient(135deg, #38bdf8, #a78bfa);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            animation: textGlow 1.5s ease-in-out infinite;
        }
        .expiry { color: #f59e0b; font-size: 13px; margin-top: 18px; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .message { color: #cbd5e1; font-size: 14px; line-height: 1.6; text-align: center; margin: 25px 0; }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6, #2563eb, #1d4ed8);
            color: white;
            padding: 14px 35px;
            border-radius: 50px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.3s;
        }
        .button:hover { transform: translateY(-2px); box-shadow: 0 8px 25px -5px #3b82f6; }
        .footer { text-align: center; color: #5b6e8c; font-size: 11px; margin-top: 35px; padding-top: 25px; border-top: 1px solid rgba(56, 189, 248, 0.1); }
        @media (max-width: 550px) {
            .card { padding: 30px 20px; }
            .otp-code { font-size: 38px; letter-spacing: 8px; }
            .logo-text { font-size: 24px; }
            h2 { font-size: 22px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="logo">
                <div class="logo-text">SECURE PORTAL</div>
            </div>
            <div style="text-align: center;">
                <div class="security-badge">✨ One-Time Password ✨</div>
            </div>
            <h2>Your Verification Code</h2>
            <div class="subtitle">Use the following OTP to complete your secure login</div>
            <div class="otp-box">
                <div class="otp-code">${otp}</div>
                <div class="expiry"><span>⏰</span> This code expires in 10 minutes</div>
            </div>
            <div class="message">
                <span style="color: #38bdf8;">🔒</span> This is a one-time password for your secure login.<br>
                <strong style="color: #ef4444;">Never share this code</strong> with anyone.
            </div>
            <div style="text-align: center;">
                <a href="#" class="button">🔓 Return to Login →</a>
            </div>
            <div class="footer">
                <p>If you didn't request this code, please ignore this email.</p>
                <p>© 2025 Secure Portal • All Rights Reserved</p>
            </div>
        </div>
    </div>
</body>
</html>
`;

// ============ SEND OTP API ============
app.post('/api/send-otp', async (req, res) => {
    // Set CORS headers
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    const { email } = req.body;
    
    if (!email) {
        return res.json({ success: false, message: 'Email is required' });
    }
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP with expiry (10 minutes)
    otpStore.set(email, {
        otp: otp,
        expires: Date.now() + 10 * 60 * 1000
    });
    
    console.log(`📧 OTP generated for ${email}: ${otp}`);
    
    // Try to send email if credentials are configured
    if (EMAIL_USER && EMAIL_PASS) {
        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: EMAIL_USER,
                    pass: EMAIL_PASS
                }
            });
            
            const mailOptions = {
                from: `"Secure Portal" <${EMAIL_USER}>`,
                to: email,
                subject: '🔐 Your OTP Verification Code - Secure Portal',
                html: getGlowEmailTemplate(otp)
            };
            
            await transporter.sendMail(mailOptions);
            console.log(`✅ Email sent to ${email}`);
            return res.json({ success: true, message: 'OTP sent to your email' });
        } catch (error) {
            console.error('❌ Email error:', error.message);
            // Fall through to demo mode
        }
    }
    
    // Demo mode fallback (when email not configured or fails)
    console.log(`⚠️ Using demo mode for ${email}`);
    return res.json({ 
        success: true, 
        message: 'Demo OTP: ' + otp,
        demoOtp: otp
    });
});

// ============ VERIFY OTP API ============
app.post('/api/verify-otp', (req, res) => {
    // Set CORS headers
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    const { email, otp } = req.body;
    
    if (!email || !otp) {
        return res.json({ success: false, message: 'Email and OTP are required' });
    }
    
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
    } else {
        console.log(`❌ Invalid OTP attempt for ${email}`);
        return res.json({ success: false, message: 'Invalid OTP. Please try again.' });
    }
});

// ============ HEALTH CHECK API ============
app.get('/api/health', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        emailConfigured: !!(EMAIL_USER && EMAIL_PASS)
    });
});

// ============ ROOT ROUTE ============
app.get('/', (req, res) => {
    res.json({ 
        status: 'OTP Server Running',
        version: '2.0.0',
        endpoints: {
            send: '/api/send-otp (POST)',
            verify: '/api/verify-otp (POST)',
            health: '/api/health (GET)'
        },
        emailConfigured: !!(EMAIL_USER && EMAIL_PASS)
    });
});

// ============ START SERVER ============
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n✅ OTP Server running on port ${PORT}`);
    console.log(`🌐 CORS enabled - Accepting requests from any origin`);
    console.log(`📧 Email Service: ${EMAIL_USER && EMAIL_PASS ? 'CONFIGURED ✅' : 'DEMO MODE ONLY ⚠️'}`);
    console.log(`\n📍 Health Check: http://localhost:${PORT}/api/health\n`);
});
