import { Resend } from "resend";
export interface MailerConfig {
    brandName: string;
    smtpProvider: Resend;
    fromEmail: string;
}

// Interface for the structure of an actual email message
export interface EmailOptions {
    to: string;
    subject: string;
    body: string;
}