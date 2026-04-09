import React, { useState, useRef, useEffect, useCallback } from 'react';
import { t, type LangCode } from '../data/languages';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

interface AIChatbotProps {
  lang: LangCode;
  cityContext?: string;
}

const AIChatbot: React.FC<AIChatbotProps> = ({ lang, cityContext }) => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef(window.speechSynthesis);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const streamChat = useCallback(async (allMessages: Msg[]) => {
    setIsLoading(true);
    let assistantSoFar = '';

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed: ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: 'assistant', content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Speak the response
      if (assistantSoFar) speakText(assistantSoFar);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${e.message}` }]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const contextPrefix = cityContext ? `[User is viewing data for ${cityContext}] ` : '';
    const userMsg: Msg = { role: 'user', content: text };
    const contextMsg: Msg = { role: 'user', content: contextPrefix + text };

    setInput('');
    setMessages(prev => [...prev, userMsg]);
    await streamChat([...messages, contextMsg]);
  }, [input, isLoading, messages, cityContext, streamChat]);

  // Voice input using Web Speech API
  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = lang === 'ta' ? 'ta-IN' : lang === 'te' ? 'te-IN' : lang === 'kn' ? 'kn-IN' : lang === 'ml' ? 'ml-IN' : 'en-IN';

    recognition.onresult = (e: any) => {
      const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join('');
      setInput(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, lang]);

  // Text-to-speech
  const speakText = useCallback((text: string) => {
    synthRef.current.cancel();
    const cleaned = text.replace(/[#*_`\[\]()]/g, '').slice(0, 500);
    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.lang = lang === 'ta' ? 'ta-IN' : lang === 'te' ? 'te-IN' : lang === 'kn' ? 'kn-IN' : lang === 'ml' ? 'ml-IN' : 'en-IN';
    utterance.rate = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
  }, [lang]);

  const stopSpeaking = useCallback(() => {
    synthRef.current.cancel();
    setIsSpeaking(false);
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] md:h-[calc(100vh-160px)]">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 p-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            <p className="text-4xl mb-4">🤖</p>
            <p className="text-lg font-semibold">ENVIQ AI Assistant</p>
            <p className="text-sm mt-2">Ask about environmental data, trends, or get sustainability advice</p>
            <div className="flex flex-wrap gap-2 justify-center mt-6">
              {[
                "What's the air quality in Chennai?",
                "Compare Bangalore vs Hyderabad",
                "Cooling strategies for hot cities",
                "Which city has the best green cover?"
              ].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="text-xs bg-secondary hover:bg-secondary/80 text-foreground px-3 py-2 rounded-xl border border-border transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-foreground'
            }`}>
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm prose-invert max-w-none">
                  {msg.content.split('\n').map((line, li) => (
                    <p key={li} className="mb-1">{line}</p>
                  ))}
                </div>
              ) : msg.content}
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-2xl px-4 py-3 text-sm text-muted-foreground animate-pulse">
              Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3">
        <div className="flex gap-2 items-end">
          <button
            onClick={toggleListening}
            className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-colors ${
              isListening ? 'bg-destructive text-destructive-foreground animate-pulse' : 'bg-secondary text-foreground hover:bg-secondary/80'
            }`}
            title="Voice input"
          >
            🎙️
          </button>
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-accent text-accent-foreground animate-pulse"
              title="Stop speaking"
            >
              🔊
            </button>
          )}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={isListening ? 'Listening...' : 'Ask ENVIQ AI anything...'}
            className="flex-1 bg-secondary text-foreground rounded-xl px-4 py-2.5 text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="shrink-0 w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-lg disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatbot;
