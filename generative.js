import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export const summarizeText = async (longText) => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

  const prompt = `Generate a concise and precise title based on the following text.
      ${longText}
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const summary = response.text();
    return summary;
  } catch (error) {
    console.error("Error generating summary:", error);
    throw error;
  }
};
