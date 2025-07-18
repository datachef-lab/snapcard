import { SendMailClient } from "zeptomail";

console.log("ZeptoMail URL:", process.env.ZEPTO_URL);
console.log("ZeptoMail FROM:", process.env.ZEPTO_FROM);
console.log(`Zoho-enczapikey ${process.env.ZEPTO_TOKEN!}`);

const client = new SendMailClient({
    url: process.env.ZEPTO_URL!,
    token: `Zoho-enczapikey ${process.env.ZEPTO_TOKEN!}`,
});

export async function sendZeptoMail(
    to: string,
    subject: string,
    htmlBody: string,
    name?: string
) {
    try {
        // Use developer email in development mode
        const recipientEmail = process.env.NODE_ENV === 'development' ? process.env.DEVELOPER_EMAIL! : to;

        console.log("sending email to:", recipientEmail);
        console.log("email subject:", subject);
        console.log("email body:", htmlBody);
        console.log("email name:", name);
        const response = await client.sendMail({
            from: {
                address: process.env.ZEPTO_FROM!,
                name: "BESC Admission Communication",
            },
            to: [
                {
                    email_address: {
                        address: recipientEmail,
                        name: name || "User",
                    },
                },
            ],
            subject,
            htmlbody: htmlBody,
        });

        console.log("✅ Email sent via ZeptoMail:", response);
        return response;
    } catch (error) {
        console.error("❌ ZeptoMail send error:", error);
        throw error;
    }
}