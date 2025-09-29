export const EMAIL_TEMPLATES = {
  // 1) Email verification (renamed/rebranded)
  EMAIL_VERIFICATION_OTP: {
    TemplateName: "EmailVerificationOTP-ATOMCLASS",
    SubjectPart: "Verify Your AtomClass Account",
    HtmlPart: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
      box-sizing: border-box;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #000000;
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
      font-weight: 300;
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
    .header .icon {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .content {
      padding: 40px 30px;
      line-height: 1.6;
    }
    .greeting {
      font-size: 20px;
      color: #333333;
      margin-bottom: 20px;
      font-weight: 500;
    }
    .otp-section {
      text-align: center;
      margin: 35px 0;
      padding: 20px;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-radius: 12px;
    }
    .otp-label {
      color: #000000;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }
    .otp-code {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #000000;
      padding: 20px 40px;
      border-radius: 12px;
      font-size: 36px;
      font-weight: bold;
      letter-spacing: 6px;
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
      margin: 10px 0;
    }
    .info-box {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 20px;
      border-radius: 8px;
      margin: 25px 0;
    }
    .info-title {
      color: #856404;
      font-weight: bold;
      margin-bottom: 12px;
      font-size: 16px;
    }
    .info-list {
      margin: 0;
      padding-left: 20px;
      color: #856404;
    }
    .info-list li {
      margin: 8px 0;
    }
    .footer {
      text-align: center;
      padding: 30px 20px;
      color: #6c757d;
      font-size: 14px;
      border-top: 1px solid #e9ecef;
      background: #f8f9fa;
    }
    .brand {
      color: #667eea;
      font-weight: bold;
      font-size: 18px;
    }
    .social-links {
      margin: 20px 0;
    }
    .social-links a {
      display: inline-block;
      margin: 0 10px;
      color: #667eea;
      text-decoration: none;
    }
    .cta-btn {
      display: inline-block;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 10px;
      background: #667eea;
      color: #000000;
      font-weight: 600;
      box-shadow: 0 6px 20px rgba(102,126,234,0.4);
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="icon">📚</div>
      <h1>AtomClass</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Your Learning Journey Starts Here</p>
    </div>

    <div class="content">
      <div class="greeting">Hello {{name}}!</div>

      <p class="welcome-text" style="color:#000000; font-size:16px; margin:20px 0;">
        Welcome to <strong>AtomClass</strong>! To complete your registration and unlock access to our programs,
        please verify your email address using the code below.
      </p>

      <div class="otp-section">
        <div class="otp-label">Your Verification Code</div>
        <div class="otp-code">{{otp}}</div>
        <p style="margin: 15px 0 0 0; color: #6c757d; font-size: 14px;">
          Enter this code in the verification form
        </p>
      </div>

      <div class="info-box">
        <div class="info-title">⏰ Important Security Information</div>
        <ul class="info-list">
          <li>This verification code expires in <strong>{{expiryMinutes}} minutes</strong></li>
          <li>You have <strong>5 attempts</strong> to enter the correct code</li>
          <li>Keep this code private and never share it with anyone</li>
          <li>If you didn't create this account, please ignore this email</li>
        </ul>
      </div>

      <p style="color: #495057; margin-top: 30px;">
        Best regards,<br>
        <span class="brand">The AtomClass Team</span>
      </p>
    </div>

    <div class="footer">
      <div class="social-links">
        <a href="https://www.atomclass.com">🌐 Website</a>
        <a href="mailto:support@atomclass.com">✉️ Support</a>
      </div>
      <p>This is an automated message, please do not reply to this email.</p>
      <p>&copy; 2025 AtomClass. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
    TextPart: `
Hello {{name}}!

Welcome to AtomClass! To complete your registration, please verify your email address.

Your verification code: {{otp}}

Important Information:
- This code expires in {{expiryMinutes}} minutes
- You have 5 attempts to enter the correct code
- Keep this code private
- If you didn't create this account, please ignore this email

Best regards,
The AtomClass Team

This is an automated message, please do not reply.
© 2025 AtomClass. All rights reserved.
`,
  },

  // 2) Password reset (token-based)
  PASSWORD_RESET_REQUEST_TOKEN: {
    TemplateName: "PasswordResetToken-ATOMCLASS",
    SubjectPart: "Reset Your AtomClass Password",
    HtmlPart: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Password Reset</title>
  <style>
    body{margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;
      background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;padding:20px;box-sizing:border-box;}
    .wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.2)}
    .hdr{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#000;padding:36px 20px;text-align:center}
    .hdr h1{margin:0;font-weight:300;font-size:28px}
    .cnt{padding:32px 28px;line-height:1.6;color:#333}
    .token-box{background:#f8f9fa;border-radius:12px;padding:20px;text-align:center;margin:24px 0}
    .token{display:inline-block;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#000;padding:16px 28px;border-radius:12px;
      font-weight:700;letter-spacing:3px;box-shadow:0 6px 20px rgba(102,126,234,.4)}
    .btn{display:inline-block;text-decoration:none;padding:12px 20px;border-radius:10px;background:#667eea;color:#000;font-weight:600;
      box-shadow:0 6px 20px rgba(102,126,234,.4)}
    .note{background:#fff3cd;border-left:4px solid #ffc107;border-radius:8px;padding:16px;margin-top:16px;color:#856404}
    .ftr{text-align:center;padding:24px 20px;color:#6c757d;font-size:14px;border-top:1px solid #e9ecef;background:#f8f9fa}
    .links a{color:#667eea;text-decoration:none;margin:0 8px}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hdr">
      <h1>AtomClass</h1>
      <p style="margin:8px 0 0 0;opacity:.9">Password Reset Request</p>
    </div>
    <div class="cnt">
      <p>Hi {{name}},</p>
      <p>We received a request to reset your AtomClass password. You can either use the button below or copy the token to reset your password.</p>

      <!-- Button path if you prefer link-based flow -->
      <p style="text-align:center;margin:20px 0;">
        <a class="btn" href="{{resetLink}}" target="_blank" rel="noopener">Reset Password</a>
      </p>

      <div class="note">
        <ul style="margin:0 0 0 18px;padding:0;">
          <li>This token/link expires in <strong>{{expiryMinutes}} minutes</strong>.</li>
          <li>For your security, do not share this token with anyone.</li>
          <li>If you didn't request a password reset, you can safely ignore this email.</li>
        </ul>
      </div>

      <p style="margin-top:24px">Thanks,<br/>The AtomClass Team</p>
    </div>
    <div class="ftr">
      <div class="links">
        <a href="https://www.atomclass.com">🌐 Website</a>
        <a href="mailto:support@atomclass.com">✉️ Support</a>
      </div>
      <p>This is an automated message, please do not reply.</p>
      <p>&copy; 2025 AtomClass. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
    TextPart: `
Hi {{name}},

We received a request to reset your AtomClass password.

Use this link: {{resetLink}}
Or use this token: {{token}}

Notes:
- The token/link expires in {{expiryMinutes}} minutes.
- Do not share this token with anyone.
- If you didn't request this, ignore this message.

Thanks,
The AtomClass Team

This is an automated message, please do not reply.
© 2025 AtomClass. All rights reserved.
`,
  },

  // 3) Password reset success
  PASSWORD_RESET_SUCCESS: {
    TemplateName: "PasswordResetSuccess-ATOMCLASS",
    SubjectPart: "Your AtomClass Password Was Reset Successfully",
    HtmlPart: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Password Reset Successful</title>
  <style>
    body{margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;
      background:linear-gradient(135deg,#22c55e 0%,#86efac 100%);min-height:100vh;padding:20px;box-sizing:border-box;}
    .wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.2)}
    .hdr{background:linear-gradient(135deg,#22c55e 0%,#86efac 100%);color:#0a0a0a;padding:36px 20px;text-align:center}
    .hdr h1{margin:0;font-weight:300;font-size:28px}
    .cnt{padding:32px 28px;line-height:1.6;color:#333}
    .check{font-size:44px}
    .tip{background:#f8f9fa;border-radius:12px;padding:16px;margin-top:16px;color:#334155}
    .ftr{text-align:center;padding:24px 20px;color:#6c757d;font-size:14px;border-top:1px solid #e9ecef;background:#f8f9fa}
    .links a{color:#667eea;text-decoration:none;margin:0 8px}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="hdr">
      <div class="check">✅</div>
      <h1>Password Reset Successful</h1>
      <p style="margin:8px 0 0 0;opacity:.9">AtomClass</p>
    </div>
    <div class="cnt">
      <p>Hi {{name}},</p>
      <p>Your AtomClass password was reset successfully. If this was you, no further action is needed.</p>
      <div class="tip">
        <strong>Security tips:</strong>
        <ul style="margin:8px 0 0 18px;padding:0;">
          <li>If you didn’t initiate this change, <a href="mailto:support@atomclass.com">contact support</a> immediately.</li>
          <li>Consider enabling 2FA (if available) and using a unique password.</li>
          <li>Review recent logins from your account settings.</li>
        </ul>
      </div>
      <p style="margin-top:24px">Stay safe,<br/>The AtomClass Team</p>
    </div>
    <div class="ftr">
      <div class="links">
        <a href="https://www.atomclass.com">🌐 Website</a>
        <a href="mailto:support@atomclass.com">✉️ Support</a>
      </div>
      <p>This is an automated message, please do not reply.</p>
      <p>&copy; 2025 AtomClass. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
    TextPart: `
Hi {{name}},

Your AtomClass password was reset successfully.
If you did not make this change, contact support immediately: support@atomclass.com.

Security tips:
- Enable 2FA (if available)
- Use a unique, strong password
- Review recent account logins

Stay safe,
The AtomClass Team

This is an automated message, please do not reply.
© 2025 AtomClass. All rights reserved.
`,
  },
};
