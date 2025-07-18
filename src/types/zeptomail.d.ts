declare module 'zeptomail' {
    export class SendMailClient {
        constructor(config: { url: string; token: string });
        sendMail(params: {
            from: { address: string; name: string };
            to: Array<{ email_address: { address: string; name: string } }>;
            subject: string;
            htmlbody: string;
        }): Promise<unknown>;
    }
} 