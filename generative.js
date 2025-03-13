import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export const summarizeText = async (longText) => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

  const prompt = `Generate a concise and precise title from the given text.
    The title should not contain special characters and should be in sentence case, with only the first letter capitalized.
    If workspace name given use the name. "
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
