<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Automated Notification Mailable
 * * This class handles the construction and configuration of system-generated emails,
 * such as OTP verification codes, account status updates, and general notifications
 * for the LegalEase platform.
 */
class AutomatedNotificationMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * The data payload to be injected into the email template.
     *
     * @var array
     */
    public $mailData;

    /**
     * Create a new message instance.
     *
     * @param array $data Contains notification details: 'subject', 'title', 'content', 'otp', etc.
     */
    public function __construct($data)
    {
        $this->mailData = $data;
    }

    /**
     * Get the message envelope.
     * * Defines the email subject and other header-related information.
     *
     * @return Envelope
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            // Uses the provided subject from data payload or falls back to a default system title.
            subject: $this->mailData['subject'] ?? 'LegalEase System Notification',
        );
    }

    /**
     * Get the message content definition.
     * * Points to the Blade template responsible for rendering the email HTML.
     *
     * @return Content
     */
    public function content(): Content
    {
        return new Content(
            // Path to the template: resources/views/emails/automated.blade.php
            view: 'emails.automated',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}