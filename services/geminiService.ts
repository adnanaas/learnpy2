
import { GoogleGenAI, Type } from "@google/genai";
import { ChatMessage } from "../types";

// وظيفة لإنشاء نسخة من AI باستخدام المفتاح المخزن في Vercel
const createAIInstance = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }
  return new GoogleGenAI({ apiKey });
};

export const getTutorResponse = async (
  lessonTitle: string,
  lessonContent: string,
  userCode: string,
  userMessage: string,
  history: ChatMessage[]
) => {
  try {
    const ai = createAIInstance();
    const systemInstruction = `أنت "المعلم الذكي" في أكاديمية بايثون. اشرح بأسلوب تعليمي مشجع. 
    الدرس الحالي: ${lessonTitle}. كود الطالب الحالي: ${userCode}.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        ...history.filter(m => m.role !== 'system').map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }]
        })),
        { role: 'user', parts: [{ text: userMessage }] }
      ],
      config: { systemInstruction }
    });

    return response.text || "لم أستطع معالجة الرد.";
  } catch (error: any) {
    if (error.message === "API_KEY_MISSING") return "يرجى إضافة مفتاح API_KEY في إعدادات Vercel.";
    return "حدث خطأ في الاتصال بالمعلم الذكي.";
  }
};

export const getCodeExecutionFeedback = async (userCode: string, lessonTitle: string) => {
  try {
    const ai = createAIInstance();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: `حلل هذا الكود لدرس ${lessonTitle}:\n${userCode}` }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCorrect: { type: Type.BOOLEAN },
            output: { type: Type.STRING },
            feedback: { type: Type.STRING },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            fixedCode: { type: Type.STRING }
          },
          required: ["isCorrect", "output", "feedback", "suggestions", "fixedCode"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) {
    return { isCorrect: false, output: "خطأ في الاتصال", feedback: "تأكد من إعدادات المفتاح", suggestions: [], fixedCode: userCode };
  }
};
