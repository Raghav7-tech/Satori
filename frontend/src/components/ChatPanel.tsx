import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { X, Send, AlertCircle, MessageSquare } from 'lucide-react';
import type { GraphResponse } from '../api/client';

export const ChatPanel: React.FC<{ state: string, data: GraphResponse | null, currentJobId: string | null }> = ({ state, data, currentJobId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (state !== 'success' || !data || !currentJobId) {
    return null;
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const response = await axios.post(`http://localhost:8000/repos/${currentJobId}/chat`, {
        messages: newMessages
      }, { timeout: 20000 });
      setMessages([...newMessages, { role: 'assistant', content: response.data.reply }]);
    } catch (err: any) {
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setErrorMsg("Request timed out. The AI took too long to respond.");
      } else if (err.response?.status === 429) {
        setErrorMsg(err.response.data?.detail || "Rate limit reached. Please try again in a moment.");
      } else if (err.response?.status === 404) {
        setErrorMsg(err.response.data?.detail || "Chat context not found for this repository.");
      } else {
        setErrorMsg(`Failed to connect to the chat service. ${err.response?.data?.detail || err.message}`);
      }
      setMessages(newMessages);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button 
        className="chat-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--primary)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 30px rgba(124,127,242,0.4)',
          border: '1px solid rgba(255,255,255,0.1)',
          cursor: 'pointer',
          zIndex: 100,
          transition: 'all 0.2s',
          transform: isOpen ? 'scale(0.8)' : 'scale(1)',
          opacity: isOpen ? 0 : 1,
          pointerEvents: isOpen ? 'none' : 'auto'
        }}
      >
        <MessageSquare size={24} />
      </button>

      <div 
        className="chat-panel"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '380px',
          height: '600px',
          maxHeight: 'calc(100vh - 120px)',
          background: 'rgba(19,21,27,0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--border-strong)',
          borderRadius: '16px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 101,
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none'
        }}
      >
        <div className="chat-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-bright)', boxShadow: '0 0 10px var(--primary-glow)' }}></div>
            <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Satori AI Advisor</h3>
          </div>
          <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', marginTop: '40px', fontSize: '13.5px' }}>
              <MessageSquare size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <p>Ask about the risk, health, and architecture of this repository.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '24px' }}>
                <button onClick={() => setInput("What should I look at first if I'm onboarding?")} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', color: 'var(--text)', cursor: 'pointer', textAlign: 'left' }}>"What should I look at first if I'm onboarding?"</button>
                <button onClick={() => setInput("Why is the repo health grade what it is?")} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', color: 'var(--text)', cursor: 'pointer', textAlign: 'left' }}>"Why is the repo health grade what it is?"</button>
              </div>
            </div>
          )}
          
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ 
                maxWidth: '85%', 
                padding: '10px 14px', 
                borderRadius: '12px',
                borderBottomRightRadius: m.role === 'user' ? '4px' : '12px',
                borderBottomLeftRadius: m.role === 'assistant' ? '4px' : '12px',
                background: m.role === 'user' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                color: m.role === 'user' ? '#fff' : 'var(--text)',
                fontSize: '13.5px',
                lineHeight: 1.5,
                border: m.role === 'assistant' ? '1px solid var(--border)' : 'none'
              }}>
                {m.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <div style={{ 
                padding: '10px 14px', 
                borderRadius: '12px', 
                background: 'rgba(255,255,255,0.05)', 
                border: '1px solid var(--border)',
                display: 'flex',
                gap: '4px',
                alignItems: 'center',
                height: '40px'
              }}>
                <span className="dot-flashing" style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--muted)', animation: 'pulse 1s infinite alternate' }}></span>
                <span className="dot-flashing" style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--muted)', animation: 'pulse 1s infinite alternate 0.2s' }}></span>
                <span className="dot-flashing" style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--muted)', animation: 'pulse 1s infinite alternate 0.4s' }}></span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--risk-high)', fontSize: '12.5px', padding: '12px', background: 'rgba(242,96,107,0.1)', borderRadius: '8px', border: '1px solid rgba(242,96,107,0.2)' }}>
              <AlertCircle size={16} />
              {errorMsg}
            </div>
          )}

          <div ref={endOfMessagesRef} />
        </div>

        <div className="chat-input-area" style={{ padding: '16px', borderTop: '1px solid var(--border)', background: 'rgba(14,15,19,0.5)' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask a question..."
              style={{
                width: '100%',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '12px 40px 12px 14px',
                color: 'var(--text)',
                fontSize: '13.5px',
                outline: 'none'
              }}
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              style={{
                position: 'absolute',
                right: '8px',
                background: 'transparent',
                border: 'none',
                color: (isLoading || !input.trim()) ? 'var(--border)' : 'var(--primary)',
                cursor: (isLoading || !input.trim()) ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px'
              }}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
