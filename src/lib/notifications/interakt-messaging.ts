const INTERAKT_API_KEY = process.env.INTERAKT_API_KEY!;
const INTERAKT_BASE_URL = process.env.INTERAKT_BASE_URL!;

export const sendWhatsAppMessage = async (to: string, messageArr: string[] = [], templateName: string) => {
    console.log("messageArr:", messageArr);
    try {
        // Use developer phone in development mode
        const phoneNumber = process.env.NODE_ENV === 'development' ? process.env.DEVELOPER_PHONE! : to;

        const requestBody = {
            countryCode: '+91',
            phoneNumber,
            type: 'Template',
            template: {
                name: templateName,
                languageCode: 'en',
                headerValues: ['Alert'],
                bodyValues: messageArr,
            },
            data: {
                message: '',
            },
        };
        // 
        const response = await fetch(INTERAKT_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${INTERAKT_API_KEY}`,
            },
            body: JSON.stringify(requestBody)
        });

        console.log('Response Status:', response.status);
        console.log('Response Headers:', [...response.headers.entries()]);

        if (!response.ok) {
            const errorResponse = await response.json(); // Log the error response
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${JSON.stringify(errorResponse)}`);
        }

        const { result, message } = await response.json()
        console.log(result, message)

        return { result, message };

    } catch (error) {
        console.error(error);
        // throw error
        return { result: false, message: "Error sending WhatsApp message" };
    }
}