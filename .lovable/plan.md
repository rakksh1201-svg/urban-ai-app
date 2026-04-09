## Plan: 4 Major Features for ENVIQ AI

### 1. AI Chatbot (Environmental Q&A + General Assistant + Data Analysis)
- Create an edge function using Lovable AI (Gemini) with environmental context
- Build a chat UI component with streaming responses and markdown rendering
- System prompt includes app data context (predictions, scores, city info)

### 2. Voice Assistant (Full Voice Chat)
- This requires ElevenLabs integration which needs an API key from you
- Alternative: We can use browser's built-in Web Speech API for speech-to-text input and text-to-speech output (free, no API key needed)
- **Recommendation**: Start with Web Speech API (free) - upgrade to ElevenLabs later if needed

### 3. Push Notifications
- Use browser's native Push API + Notification API
- Create a notification preferences system
- Alert users when environmental scores cross critical thresholds
- Edge function to check thresholds and trigger notifications

### 4. Offline Support (Service Worker + Caching)
- Add vite-plugin-pwa for service worker
- Cache environmental data locally for offline viewing
- Sync when back online

### Implementation Order
1. AI Chatbot edge function + UI
2. Voice assistant (Web Speech API integration into chatbot)
3. Offline support (PWA service worker)
4. Push notifications (browser Notification API)

### New tabs/UI
- Add a new "🤖 AI" tab in the navigation for the chatbot + voice assistant
