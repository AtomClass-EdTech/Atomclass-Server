export const EMAIL_TEMPLATES = {
  EMAIL_VERIFICATION_OTP: {
    TemplateName: "EmailVerificationOTP",
    SubjectPart: "Verify Your The School of Options Account",
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
            background: white; 
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
            color: #333; 
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
            color: #00000;
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
        .cta-section {
            text-align: center;
            margin: 30px 0;
        }
        .welcome-text {
            color: #000000;
            font-size: 16px;
            margin: 20px 0;
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
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="icon">🎓</div>
            <h1>The School of Options</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your Learning Journey Starts Here</p>
        </div>
        
        <div class="content">
            <div class="greeting">Hello {{name}}!</div>
            
            <p class="welcome-text">
                Welcome to <strong>The School of Options</strong>! We're excited to have you join our community. 
                To complete your registration and unlock access to our programs, please verify your email address.
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
                <span class="brand">The The School of Options Team</span>
            </p>
        </div>
        
        <div class="footer">
            <div class="social-links">
                <a href="https://www.theschoolofoptions.com">🌐 Website</a>
                <a href="mailto:support@schoolofoptions.com">✉️ Support</a>
            </div>
            <p>This is an automated message, please do not reply to this email.</p>
            <p>&copy; 2025 The School of Options. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`,
    TextPart: `
Hello {{name}}!

Welcome to The School of Options! To complete your registration, please verify your email address.

Your verification code: {{otp}}

Important Information:
- This code expires in {{expiryMinutes}} minutes
- You have 5 attempts to enter the correct code
- Keep this code private
- If you didn't create this account, please ignore this email

Best regards,
The The School of Options Team

This is an automated message, please do not reply.
© 2025 The School of Options. All rights reserved.
`,
  },
  COUNSELLOR_REQUEST: {
    TemplateName: "CounsellorRequest",
    SubjectPart: "New Counsellor Request - The School of Options",
    HtmlPart: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Counsellor Request</title>
  <style>
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f8f9fa;
      color: #333;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background: #fff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 6px 20px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 30px;
      line-height: 1.6;
    }
    .content p {
      margin: 10px 0;
    }
    .info-box {
      background: #f1f3f5;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      padding: 20px;
      font-size: 14px;
      color: #6c757d;
      background: #f8f9fa;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>New Counsellor Request</h1>
    </div>
    <div class="content">
      <p>Hello Team,</p>
      <p>A new user has requested to talk to a counsellor. Here are the details:</p>

      <div class="info-box">
        <p><strong>Full Name:</strong> {{fullName}}</p>
        <p><strong>Email Address:</strong> {{email}}</p>
        <p><strong>Phone Number:</strong> {{phone}}</p>
      </div>

      <p>Please follow up with the user within <strong>24 hours</strong> to discuss the mentorship program.</p>

      <p>Best regards,<br>
      <strong>The School of Options System</strong></p>
    </div>
    <div class="footer">
      <p>This is an automated notification. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`,
    TextPart: `
Hello Team,

A new user has requested to talk to a counsellor. Details below:

- Full Name: {{fullName}}
- Email Address: {{email}}
- Phone Number: {{phone}}

Please follow up within 24 hours to discuss the mentorship program.

Best regards,
The School of Options System
`,
  },
};