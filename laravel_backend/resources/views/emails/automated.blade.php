<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>LegalEase Notification</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
        <h2 style="color: #1c357e;">{{ $mailData['title'] }}</h2>
        <p>Hello,</p>
        <p>{{ $mailData['content'] }}</p>

        @if(isset($mailData['otp']))
            <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1c357e; background: #f4f4f4; padding: 10px 20px; border-radius: 5px;">
                    {{ $mailData['otp'] }}
                </span>
                <p style="font-size: 12px; color: #777;">This code will expire in 10 minutes.</p>
            </div>
        @endif

        <p>Best regards,<br><strong>LegalEase Team</strong></p>
    </div>
</body>
</html>