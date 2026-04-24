const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Store OTPs temporarily (in production use Redis or database)
const otpStore = new Map();

// ============ GLOW EMAIL TEMPLATE ============
const getGlowEmailTemplate = (otp) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Secure Portal | OTP Verification</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
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
        
        /* Glow animations */
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
        
        @keyframes borderGlow {
            0% { border-color: rgba(56, 189, 248, 0.3); }
            50% { border-color: rgba(56, 189, 248, 0.8); }
            100% { border-color: rgba(56, 189, 248, 0.3); }
        }
        
        @keyframes timerCountdown {
            from { width: 100%; }
            to { width: 0%; }
        }
        
        @keyframes floatParticle {
            0% { transform: translateY(100vh) translateX(0); opacity: 0; }
            10% { opacity: 0.5; }
            90% { opacity: 0.5; }
            100% { transform: translateY(-100vh) translateX(100px); opacity: 0; }
        }
        
        .container {
            max-width: 520px;
            margin: 20px;
            width: 100%;
        }
        
        .card {
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%);
            backdrop-filter: blur(12px);
            border-radius: 32px;
            padding: 45px 35px;
            border: 1px solid rgba(56, 189, 248, 0.3);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 20px rgba(56, 189, 248, 0.1);
            animation: glowPulse 3s ease-in-out infinite;
            transition: all 0.3s ease;
        }
        
        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.6), 0 0 30px rgba(56, 189, 248, 0.3);
        }
        
        .logo { text-align: center; margin-bottom: 30px; }
        .logo-icon { font-size: 60px; margin-bottom: 10px; animation: textGlow 2s ease-in-out infinite; display: inline-block; }
        .logo-text { font-size: 32px; font-weight: 800; background: linear-gradient(135deg, #38bdf8, #a78bfa, #c084fc); -webkit-background-clip: text; background-clip: text; color: transparent; letter-spacing: 2px; animation: textGlow 2s ease-in-out infinite; }
        .logo-badge { font-size: 11px; background: linear-gradient(135deg, #38bdf820, #a78bfa20); display: inline-block; padding: 4px 12px; border-radius: 20px; color: #38bdf8; margin-top: 8px; letter-spacing: 2px; border: 1px solid rgba(56, 189, 248, 0.3); }
        
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
            backdrop-filter: blur(4px);
        }
        
        h2 { color: #ffffff; font-size: 26px; text-align: center; margin-bottom: 10px; font-weight: 700; letter-spacing: -0.5px; }
        .subtitle { color: #94a3b8; text-align: center; font-size: 14px; margin-bottom: 35px; line-height: 1.5; }
        
        .otp-box {
            background: linear-gradient(135deg, #0f172a, #020617);
            border-radius: 24px;
            padding: 35px 25px;
            text-align: center;
            border: 2px solid rgba(56, 189, 248, 0.3);
            margin: 25px 0;
            position: relative;
            overflow: hidden;
            animation: borderGlow 2s ease-in-out infinite;
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
        .timer-bar { width: 100%; height: 4px; background: #334155; border-radius: 2px; margin-top: 15px; overflow: hidden; }
        .timer-progress { width: 100%; height: 100%; background: linear-gradient(90deg, #38bdf8, #a78bfa); border-radius: 2px; animation: timerCountdown 600s linear forwards; }
        
        .message { color: #cbd5e1; font-size: 14px; line-height: 1.6; text-align: center; margin: 25px 0; }
        
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6, #2563eb, #1d4ed8);
            color: white;
            padding: 14px 35px;
            border-radius: 50px;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            transition: left 0.5s ease;
        }
        
        .button:hover { transform: translateY(-2px); box-shadow: 0 8px 25px -5px #3b82f6; }
        .button:hover::before { left: 100%; }
        
        .footer { text-align: center; color: #5b6e8c; font-size: 11px; margin-top: 35px; padding-top: 25px; border-top: 1px solid rgba(56, 189, 248, 0.1); }
        .footer a { color: #38bdf8; text-decoration: none; }
        
        /* Floating particles */
        .particle {
            position: fixed;
            width: 2px;
            height: 2px;
            background: #38bdf8;
            border-radius: 50%;
            opacity: 0.3;
            pointer-events: none;
            animation: floatParticle 20s linear infinite;
        }
        
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
                <div class="logo-icon">🩻</div>
                <div class="logo-text">SECURE PORTAL</div>
                <div class="logo-badge">3-LAYER AUTHENTICATION</div>
            </div>
            
            <div style="text-align: center;">
                <div class="security-badge">
                    ✨ One-Time Password ✨
                </div>
            </div>
            
            <h2>Your Verification Code</h2>
            <div class="subtitle">Use the following OTP to complete your secure login</div>
            
            <div class="otp-box">
                <div class="otp-code">${otp}</div>
                <div class="expiry">
                    <span>⏰</span> This code expires in 10 minutes
                </div>
                <div class="timer-bar">
                    <div class="timer-progress"></div>
                </div>
            </div>
            
            <div class="message">
                <span style="color: #38bdf8;">🔒</span> This is a one-time password for your secure login.<br>
                <strong style="color: #ef4444;">Never share this code</strong> with anyone, not even our support team.
            </div>
            
            
            <div class="footer">
                <p>If you didn't request this code, please ignore this email.</p>
                <p style="margin-top: 10px;">
                    <span style="color: #38bdf8;">⚡</span> Powered by Secure Portal • End-to-End Encrypted <span style="color: #38bdf8;">⚡</span>
                </p>
                <p style="margin-top: 8px;">© 2026 Secure Portal • All Rights Reserved</p>
            </div>
        </div>
    </div>
    
    <script>
        // Create floating particles
        for(let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 20 + 's';
            particle.style.animationDuration = 15 + Math.random() * 10 + 's';
            particle.style.width = Math.random() * 3 + 1 + 'px';
            particle.style.height = particle.style.width;
            document.body.appendChild(particle);
        }
    </script>
</body>
</html>
`;

// ============ SEND OTP API ============
app.post('/api/send-otp', async (req, res) => {
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
    
    // Email configuration (Update with your email credentials)
    const transporter = nodemailer.createTransport({
        service: 'gmail', // or 'hotmail', 'outlook', 'yahoo'
        auth: {
            user: 'emptyadmins@gmail.com',     // <-- UPDATE THIS
            pass: 'nwty nuow emzj wzwz'          // <-- UPDATE THIS
        }
    });
    
    const mailOptions = {
        from: '"Secure Portal" <noreply@secureportal.com>',
        to: email,
        subject: '🔐 Your OTP Verification Code - Secure Portal',
        html: getGlowEmailTemplate(otp)
    };
    
    try {
        await transporter.sendMail(mailOptions);
        console.log(`OTP sent to ${email}: ${otp}`);
        res.json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Email error:', error);
        res.json({ success: false, message: 'Failed to send OTP. Please try again.' });
    }
});

// ============ VERIFY OTP API ============
app.post('/api/verify-otp', (req, res) => {
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
        return res.json({ success: true, message: 'OTP verified successfully' });
    } else {
        return res.json({ success: false, message: 'Invalid OTP. Please try again.' });
    }
});

// ============ HEALTH CHECK API ============
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ============ START SERVER ============
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ OTP Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
});
