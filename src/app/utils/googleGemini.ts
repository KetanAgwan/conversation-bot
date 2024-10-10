import { useState, useCallback } from "react";
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

// Ensure you have the API key in your environment variables
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("Missing Gemini API Key");
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model: GenerativeModel = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

interface UseGeminiAPIResult {
  generateContent: (prompt: string) => Promise<string>;
  response: string | null;
  isLoading: boolean;
  error: Error | null;
}

export function useGeminiAPI(): UseGeminiAPIResult {
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const generateContent = useCallback(
    async (prompt: string): Promise<string> => {
      setIsLoading(true);
      setError(null);
      setResponse(null);

      try {
        const result = await model.generateContent(
          prompt + "you can say in it 2 to 3 sentences only yu don thave to generate a huge response for this."
        );
        const generatedText = result.response.text();
        setResponse(generatedText);
        return generatedText;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("An unknown error occurred");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { generateContent, response, isLoading, error };
}
