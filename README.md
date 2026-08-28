# EduBuddy AI

Create a full-stack AI Tutor Web Application designed for Indian students (Class 9th to 12th) covering all subjects (Science, Commerce, Humanities). The application should have a friendly, encouraging, and clean educational UI/UX.

Key Features to Implement:

1. Student Onboarding: A simple setup where a student can select their Class (9, 10, 11, or 12) and their Stream/Subject. This selection should contextualize all future AI responses.

2. Dual-Input Chat Interface:

   - Text Chat: A clean, modern chat interface to type doubts.

   - Voice Input: A microphone button that uses the Web Speech API (Speech-to-Text) so students can ask doubts by speaking in English, Hindi, or Hinglish.

3. Photo/Image Upload: A file upload button in the chat bar allowing students to upload images of textbook problems, math equations, or diagrams for the AI to analyze.

4. AI Response Layer:

   - Integrate the Gemini 1.5 Flash API (or a mock service if API keys are separate) with a strict system prompt: "Act as an expert, empathetic CBSE/JEE Mains & Advance/NEET tutor for classes 9-12. Explain complex concepts step-by-step using simple analogies, formatting answers with clear headings and bullet points. Match the student's language (English/Hinglish)."

   - Render mathematical equations beautifully using KaTeX/LaTeX formatting.

5. Voice Output (Text-to-Speech): A "Listen" speaker icon next to every AI response that reads the answer out loud using the browser's built-in Web Speech Synthesis or a standard TTS API.

6. History & Dashboard: A sidebar that saves recent conversations and lists upcoming study topics.

Design Requirements:

- Use a modern, accessible color palette (e.g., Indigo/Violet/Blue tones) that feels academic yet tech-forward.

- Fully responsive design (mobile-first, since many students study on phones).

- Clean code structure splitting UI components, voice utilities, and API call handlers.

-

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://thesis-learn.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b4f456c8-93be-4f82-b265-4e8ffc9eaf3b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
