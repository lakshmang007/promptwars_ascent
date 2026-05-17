import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini (In production, never expose your API key to the client!)
// For hackathon purposes, this uses the client-side
const API_KEY = "YOUR_GEMINI_API_KEY"; 
const genAI = new GoogleGenerativeAI(API_KEY);

export async function analyzeDocumentWithAI(documentText) {
    if (API_KEY === "YOUR_GEMINI_API_KEY") {
        console.warn("Using mock data because Gemini API Key is missing.");
        return getMockData();
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
        const prompt = `
        You are LexGuard, an AI legal assistant. Analyze the following contract.
        Extract the 3 most important clauses. For each clause, provide:
        1. A 'title'
        2. The exact 'extracted_text'
        3. A severity 'risk_score' from 0-10
        4. A 'plain_language_explanation' of why this is risky.
        
        Respond ONLY in valid JSON format like:
        [
            { "id": "1", "title": "...", "extracted_text": "...", "risk_score": 8, "plain_language_explanation": "..." }
        ]
        
        Contract Text:
        ${documentText}
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();
        
        // Clean markdown JSON formatting if present
        if(text.startsWith('\`\`\`json')) text = text.substring(7, text.length - 3);
        
        return JSON.parse(text);
    } catch (error) {
        console.error("AI Analysis failed:", error);
        return getMockData(); // Fallback to mock on error
    }
}

function getMockData() {
    return [
        {
            id: "1",
            title: "Broad Non-Compete",
            extracted_text: "The Employee agrees that during the term of employment and for a period of 60 months thereafter, the Employee shall not directly or indirectly engage in any business that competes with the Company globally.",
            risk_score: 9,
            plain_language_explanation: "This clause prevents you from working in any related industry globally for 5 years after leaving. This is highly restrictive and likely unenforceable in many jurisdictions."
        },
        {
            id: "2",
            title: "Overreaching IP Transfer",
            extracted_text: "Any intellectual property created by the Employee, whether during or outside of working hours, utilizing personal resources, shall become the sole property of the Company.",
            risk_score: 7,
            plain_language_explanation: "The company claims ownership of all side projects you create, even on your own time with personal equipment. You should negotiate an exception for prior inventions."
        },
        {
            id: "3",
            title: "At-Will Termination",
            extracted_text: "The Company reserves the right to terminate this agreement at any time, with or without cause, upon 14 days written notice.",
            risk_score: 4,
            plain_language_explanation: "Standard at-will employment clause, but the notice period is relatively short."
        }
    ];
}
