import type { MailerConfig, EmailOptions } from "../types/mailerConfig.types";

class Mailer {
  // 1. In TS, you must explicitly declare class properties
  private config: MailerConfig;

  // 2. Use 'private' or 'readonly' to encapsulate the config data
  public constructor(mailerConfig: MailerConfig) {
    this.config = mailerConfig;
  }

  // 3. Defined the sendMail method with parameters and proper return type
  async sendMail(options: EmailOptions): Promise<boolean> {
    const { to, subject, body } = options;

    console.log(`Sending email via ${this.config.smtpProvider}...`);
    console.log(`From: "${this.config.brandName}" <${this.config.fromEmail}>`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${body}`);

    try {
      const response = await this.config.smtpProvider.emails.send({
        from: `${this.config.brandName} <${this.config.fromEmail}>`,
        to: [to],
        subject: subject,
        html: body, // or 'text: body' depending on your needs
      });

      console.log("SMTP Response:", response);
      if (response.error) {
        console.error("SMTP API error:", response.error);
        return false;
      }
      return true;
    } catch (error) {
      if (error instanceof Error) {
        console.error("SMTP error:", error.message);
      } else {
        console.error("SMTP error:", error);
      }
      return false;
    }
  }
}


export default Mailer