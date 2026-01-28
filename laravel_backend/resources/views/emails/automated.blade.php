<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LegalEase Notification</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            margin: 0;
            padding: 0;
            background-color: #f4f7f9;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background: #ffffff;
            padding: 40px;
            border: 1px solid #e1e8ed;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
        }
        .header-title {
            color: #1c357e; 
            font-size: 26px;
            margin-bottom: 25px;
            border-bottom: 3px solid #f0f4f8;
            padding-bottom: 15px;
            font-weight: 800;
        }
        .content-text {
            font-size: 16px;
            color: #4a5568;
            margin-bottom: 30px;
            line-height: 1.8;
        }
        .otp-container {
            text-align: center;
            margin: 35px 0;
            padding: 30px;
            background-color: #f8fafc;
            border-radius: 10px;
            border: 2px dashed #cbd5e1;
        }
        .otp-code {
            font-size: 40px;
            font-weight: bold;
            letter-spacing: 10px;
            color: #1c357e;
            display: inline-block;
        }
        .otp-expiry {
            font-size: 13px;
            color: #64748b;
            margin-top: 12px;
        }
        .action-button {
            display: block;
            width: fit-content;
            margin: 30px auto;
            padding: 14px 28px;
            background-color: #1c357e;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            font-size: 16px;
        }
        .footer {
            margin-top: 40px;
            font-size: 14px;
            color: #718096;
            border-top: 1px solid #edf2f7;
            padding-top: 25px;
        }
        .brand {
            color: #1c357e;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2 class="header-title">{{ $mailData['title'] }}</h2>
        
        <p style="font-size: 16px; font-weight: bold; color: #1a202c;">Hello,</p>
        
        <div class="content-text">
            {!! nl2br(e($mailData['content'])) !!}
        </div>

        @if(isset($mailData['otp']))
            <div style="text-align: center;">
                <div class="otp-container">
                    <div class="otp-code">{{ $mailData['otp'] }}</div>
                    <p class="otp-expiry">This verification code will expire in 10 minutes.</p>
                </div>
            </div>
        @endif

        @if(isset($mailData['button_url']))
            <div style="text-align: center;">
                <a href="{{ $mailData['button_url'] }}" class="action-button">
                    {{ $mailData['button_text'] ?? 'View Details' }}
                </a>
            </div>
        @endif

        <div class="footer">
            <p>Best regards,<br>
            <span class="brand">LegalEase Team</span></p>
            <p style="font-size: 11px; color: #a0aec0; margin-top: 20px;">
                &copy; {{ date('Y') }} LegalEase Platform. Professional Legal Services.<br>
                This is an automated message, please do not reply.
            </p>
        </div>
    </div>
</body>
</html>