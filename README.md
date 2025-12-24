# TrueLensAI 🔍

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Chrome Extension](https://img.shields.io/badge/Chrome%20Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![Webpack](https://img.shields.io/badge/Webpack-8DD6F9?style=for-the-badge&logo=webpack&logoColor=black)](https://webpack.js.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

**AI-Powered Article Analysis Tool** – Verify facts, detect bias, and get insights with TrueLensAI's backend API and Chrome extension.

## 🚀 Features

- **Article Analysis**: Extract and analyze web content using Google Gemini AI
- **Fact-Checking**: Optional integration with Serper.dev for real-time verification
- **Chrome Extension**: Seamless browser integration with MV3 manifest
- **User Authentication**: Secure Firebase-based auth and user profiles
- **Chat Interface**: Interactive AI conversations about analyzed content
- **Inaccuracy Reporting**: Community-driven content moderation
- **Responsive UI**: Built with Tailwind CSS for modern design

## 🛠️ Tech Stack

### Backend
- **Node.js** – Runtime environment
- **Express.js** – Web framework for API
- **Firebase Admin SDK** – Authentication and database
- **Google Generative AI** – AI-powered content analysis
- **Serper.dev** – Fact-checking API (optional)

### Frontend (Extension)
- **TypeScript** – Type-safe JavaScript
- **Chrome Extension API** – Browser integration
- **Webpack** – Module bundler
- **Tailwind CSS** – Utility-first CSS framework

### Development Tools
- **ESLint** – Code linting
- **Stylelint** – CSS linting
- **Prettier** – Code formatting

## 📦 Installation & Setup

### Prerequisites
- Node.js (v16+)
- npm or yarn
- Google Chrome browser
- Firebase project
- Google Cloud API key

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/sohamm-76/TrueLensAI.git
   cd TrueLensAI
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd backend && npm install
   cd ../extension && npm install
   ```

3. **Configure environment**
   - Copy `backend/env.example` to `backend/.env`
   - Fill in your API keys:
     - `FIREBASE_PROJECT_ID`
     - `GOOGLE_GENERATIVE_AI_API_KEY`
     - `SERPER_API_KEY` (optional)

4. **Add Firebase credentials**
   - Place your Firebase service account JSON at `backend/firebase-key.json`
   - Or set `FIREBASE_SERVICE_ACCOUNT_PATH` in `.env`

5. **Start the backend**
   ```bash
   npm run backend:start
   ```
   Server runs at `http://localhost:5000`

### Extension Setup

1. **Build the extension**
   ```bash
   npm run build
   ```

2. **Load in Chrome**
   - Open `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `extension/dist`

3. **Configure OAuth**
   - In `extension/dist/manifest.json`, replace `oauth2.client_id` with your Google OAuth client ID

4. **Update Firebase config** (optional)
   - Edit `extension/dist/firebase-config.json` for your Firebase project

## 🔧 API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Health check | No |
| POST | `/api/analyze` | Analyze article content | Yes |
| POST | `/api/chat` | AI chat about content | Yes |
| POST | `/api/report-inaccuracy` | Report content issues | Yes |
| GET | `/api/user/history` | User analysis history | Yes |
| GET | `/api/user/profile` | User profile data | Yes |

## 🔒 Security

- **Never commit secrets**: `.env` files and `firebase-key.json` are gitignored
- **Regenerate keys**: If exposed, immediately revoke and regenerate API keys
- **Environment variables**: Use production-grade secret management
- **HTTPS**: Always use secure connections in production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Gemini for AI capabilities
- Firebase for backend infrastructure
- Chrome Extension community for best practices

---

**Made with ❤️ for transparent and accurate information**

