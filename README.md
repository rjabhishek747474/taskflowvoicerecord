# TaskFlow AI 🤖✅

TaskFlow AI is a next-generation voice-first productivity assistant powered by Google's Gemini models. It seamlessly captures your thoughts, organizes your tasks, and provides a real-time conversational interface.

![TaskFlow AI Demo](https://via.placeholder.com/800x400?text=TaskFlow+AI+Dashboard)

## 🚀 Features

### 1. 🎙️ Smart Task Listener
- **Record & Transcribe**: Uses **Gemini 2.5 Flash** for ultra-fast, accurate speech-to-text.
- **Intelligent Extraction**: Uses **Gemini 3.0 Pro** with "Thinking" capabilities to analyze transcripts, extract actionable tasks, and assign priority (Critical, High, Medium, Low) based on context.
- **Auto-Prioritization**: Detects urgency and importance automatically.

### 2. ⚡ Live Voice Assistant
- **Real-time Conversation**: Experience low-latency, natural voice interactions using the **Gemini Multimodal Live API**.
- **Hands-free**: Talk to your assistant naturally without typing.

### 3. 💬 Contextual ChatBot
- **Grounded Responses**: Integrated with **Google Search** and **Google Maps** for factual, real-world information.
- **Markdown Support**: Rich text rendering for clear, structured responses.

---

## 🛠️ Tech Stack

- **Frontend**: React, Vite, TypeScript, Tailwind CSS
- **AI Models**:
  - **Gemini 2.5 Flash**: Transcription & Text-to-Speech
  - **Gemini 3.0 Pro**: Task Reasoning & Chat
  - **Gemini Multimodal Live API**: Real-time Voice
- **Testing**: Vitest, React Testing Library
- **Security**: DOMPurify, Input Sanitization, Rate Limiting

---

## 🔐 Security Measures

We take security seriously. This project includes:

- **API Key Validation**: Strict validation ensures no requests are made without proper configuration.
- **Input Sanitization**: All user inputs and AI responses are sanitized (using `DOMPurify`) to prevent XSS attacks.
- **Rate Limiting**: Client-side rate limiting prevents API abuse.
- **Data Validation**: strict type checking and validation for all audio and text inputs.
- **Secure Error Handling**: Internal error details are masked to prevent information leakage.

---

## 🚦 Getting Started

### Prerequisites
- Node.js (v18+)
- Google Gemini API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/rjabhishek747474/taskflowvoicerecord.git
   cd taskflowvoicerecord
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env.local` file in the root directory:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   ```
   *Note: `.env.local` is git-ignored for security.*

4. **Run Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

---

## 🧪 Testing

Run the comprehensive test suite (46+ test cases):

```bash
npm test
```

## 📄 License
MIT
