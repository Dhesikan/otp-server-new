const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

// ==================== GMAIL SMTP CONFIGURATION ====================
const GMAIL_USER = 'emptyadmins@gmail.com';
const GMAIL_APP_PASSWORD = 'nwty nuow emzj wzwz'; // 👈 REPLACE THIS

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD
    }
});

const otpStore = new Map();

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP Email using Gmail
async function sendOTPEmail(to, otp) {
    const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Your OTP Code</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background: linear-gradient(135deg, #0a0f1c 0%, #030614 100%);
                    margin: 0;
                    padding: 20px;
                }
                .container {
                    max-width: 500px;
                    margin: 0 auto;
                    background: #1e293b;
                    border-radius: 24px;
                    overflow: hidden;
                    border: 1px solid rgba(56, 189, 248, 0.3);
                }
                .header {
                    background: linear-gradient(135deg, #1e5f7a, #2c9baf);
                    padding: 30px;
                    text-align: center;
                }
                .logo {
                    font-size: 42px;
                    font-weight: 800;
                    color: white;
                }
                .content {
                    padding: 40px 30px;
                    text-align: center;
                }
                .otp-code {
                    font-size: 52px;
                    font-weight: 800;
                    letter-spacing: 10px;
                    color: #38bdf8;
                    background: #0f172a;
                    padding: 20px;
                    border-radius: 16px;
                    display: inline-block;
                    margin: 20px 0;
                    font-family: monospace;
                }
                .message {
                    color: #cbd5e1;
                    font-size: 16px;
                }
                .footer {
                    background: #0f172a;
                    padding: 20px;
                    text-align: center;
                }
                .footer p {
                    color: #64748b;
                    font-size: 12px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🔐 SECURE PORTAL</div>
                </div>
                <div class="content">
                    <h2 style="color: #f1f5f9;">Your OTP Code</h2>
                    <p class="message">Use the following One-Time Password to complete your login.</p>
                    <div class="otp-code">${otp}</div>
                    <p class="message">This OTP is valid for <strong style="color: #38bdf8;">5 minutes</strong>.</p>
                </div>
                <div class="footer">
                    <p>Secure Client Portal • 3-Layer Authentication</p>
                    <p>If you didn't request this, please ignore this email.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    const info = await transporter.sendMail({
        from: `"Secure Portal" <${GMAIL_USER}>`,
        to: to,
        subject: '🔐 Your OTP Code - Secure Portal',
        html: emailHtml
    });
    
    console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    return info;
}

// Send OTP endpoint
app.post('/api/send-otp', async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const otp = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000;
    
    otpStore.set(email, { otp, expiresAt });
    
    try {
        await sendOTPEmail(email, otp);
        console.log(`✅ OTP sent to ${email}: ${otp}`);
        res.json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to send OTP' });
    }
});

// Verify OTP endpoint
app.post('/api/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
        return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }
    
    const stored = otpStore.get(email);
    
    if (!stored) {
        return res.json({ success: false, message: 'No OTP requested for this email' });
    }
    
    if (Date.now() > stored.expiresAt) {
        otpStore.delete(email);
        return res.json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }
    
    if (stored.otp === otp) {
        otpStore.delete(email);
        return res.json({ success: true, message: 'OTP verified successfully' });
    }
    
    res.json({ success: false, message: 'Invalid OTP. Please try again.' });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║     🚀 OTP Server is Running!                       ║
║                                                      ║
║     📧 Service: Gmail SMTP                          ║
║     📨 From: emptyadmins@gmail.com                  ║
║     🌐 Port: ${PORT}                                    ║
║                                                      ║
║     ✅ POST /api/send-otp                           ║
║     ✅ POST /api/verify-otp                         ║
║     ✅ GET  /api/health                             ║
║                                                      ║
║     📨 Can send to ANY email address!               ║
╚══════════════════════════════════════════════════════╝
    `);
});