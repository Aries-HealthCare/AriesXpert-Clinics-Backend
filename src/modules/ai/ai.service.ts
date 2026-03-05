import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiKey: string;
  private readonly apiUrl =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>("GEMINI_API_KEY");
  }

  async chat(prompt: string, context: string = "general") {
    if (!this.apiKey) {
      this.logger.warn(
        "GEMINI_API_KEY not found. Using fallback rule-based response.",
      );
      return this.fallbackResponse(prompt, context);
    }

    try {
      const response = await axios.post(
        `${this.apiUrl}?key=${this.apiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
        },
        {
          headers: { "Content-Type": "application/json" },
        },
      );

      const generatedText =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return generatedText || "I am processing your request...";
    } catch (error) {
      this.logger.error(`AI Service Error: ${error.message}`);
      return this.fallbackResponse(prompt, context);
    }
  }

  async scoreTherapistMatch(lead: any, therapist: any): Promise<number> {
    // Simple heuristic match if API fails or for speed
    let score = 0;

    // Location Match (Primary)
    if (therapist.areaPreferences?.includes(lead.area)) {
      score += 50;
    }

    // Specialization Match
    const condition = (lead.condition || "").toLowerCase();
    const specs = (therapist.specializations || []).map((s) => s.toLowerCase());

    // Basic keyword matching
    if (condition.includes("pain") && specs.some((s) => s.includes("physio")))
      score += 30;
    if (condition.includes("stroke") && specs.some((s) => s.includes("neuro")))
      score += 30;
    if (
      condition.includes("fracture") &&
      specs.some((s) => s.includes("ortho"))
    )
      score += 30;

    // Fallback: Use LLM if condition is complex
    if (score === 50 && this.apiKey) {
      // Only location matched so far
      const prompt = `
            Rate the match between this patient condition and therapist specialization on a scale of 0 to 50.
            Patient Condition: "${lead.condition}"
            Therapist Specializations: "${specs.join(", ")}"
            Return ONLY the number.
         `;
      try {
        const aiScore = await this.chat(prompt);
        const parsed = parseInt(aiScore.trim(), 10);
        if (!isNaN(parsed)) score += parsed;
      } catch (e) {
        // Ignore AI error
      }
    }

    return Math.min(score, 100);
  }

  private fallbackResponse(prompt: string, context: string): string {
    const lowerPrompt = prompt.toLowerCase();

    if (context === "medical") {
      if (lowerPrompt.includes("pain"))
        return "For pain management, we typically recommend R.I.C.E (Rest, Ice, Compression, Elevation) for acute injuries. However, as an AI, I recommend booking a visit with one of our physiotherapists for a personalized assessment.";
      if (lowerPrompt.includes("appointment"))
        return "You can book an appointment directly through the 'Visits' tab in your app.";
      return "I am Aries Med AI. I can help with general medical questions, but for specific advice, please consult our specialists.";
    }

    return "I am Aries Intelligence. How can I assist you today?";
  }
}
