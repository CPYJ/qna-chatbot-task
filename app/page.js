'use client';
import { useState, useRef, useEffect } from 'react';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function ask() {
    if (!q.trim()) return;
    const userMsg = { role: 'user', text: q };
    setMessages(prev => [...prev, userMsg]);
    setQ('');
    setLoading(true);

    const res = await fetch('/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: userMsg.text }),
    });
    
    if (!res.ok) {
      setMessages(prev => [...prev, { role: 'bot', text: '서버에서 오류가 발생했어요.' }]);
      setLoading(false);
      return;
    }

    const data = await res.json();

    const botMsg = { role: 'bot', text: data.answer || data.error || '오류 발생' };
    setMessages(prev => [...prev, botMsg]);
    setLoading(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ask();
    }
  }

  // 🔹 body / html의 기본 여백을 강제로 제거
  useEffect(() => {
    document.documentElement.style.height = '100%';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.height = '100%';
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';
  }, []);

  return (
    <main style={{
      width: '100vw',
      height: '100vh',
      background: '#e5e7eb', 
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#1f2937',
      overflow: 'hidden', 
    }}>
      <div style={{
        width: '95%',
        maxWidth: 700,
        height: '90vh', 
        background: '#f3f4f6',
        borderRadius: '16px',
        boxShadow: '0 6px 16px rgba(0,0,0,0.1)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <h1 style={{
          textAlign: 'center',
          fontSize: '1.6rem',
          fontWeight: 600,
          marginBottom: '12px',
          color: '#111827'
        }}>
          💭 Gemini + Qdrant 챗봇
        </h1>

        {/* 대화창 */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          background: '#d1d5db',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '12px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              margin: '8px 0'
            }}>
              <div style={{
                background: m.role === 'user' ? '#2563eb' : '#f9fafb',
                color: m.role === 'user' ? 'white' : '#111827',
                padding: '10px 14px',
                borderRadius: '16px',
                maxWidth: '75%',
                lineHeight: 1.5,
                wordBreak: 'break-word',
                boxShadow: m.role === 'user'
                  ? '0 2px 6px rgba(37,99,235,0.3)'
                  : '0 2px 6px rgba(0,0,0,0.1)'
              }}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <p style={{
              textAlign: 'center',
              color: '#4b5563',
              fontStyle: 'italic',
              marginTop: '8px'
            }}>🤖 답변 생성 중...</p>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* 입력창 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          border: '1px solid #9ca3af',
          borderRadius: '12px',
          background: '#f9fafb',
          padding: '8px 10px',
          flexShrink: 0 
        }}>
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="질문을 입력하고 Enter를 누르거나 버튼을 클릭해주세요"
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              outline: 'none',
              fontSize: '15px',
              background: 'transparent',
              color: '#1f2937'
            }}
          />
          <button
            onClick={ask}
            disabled={loading}
            style={{
              borderRadius: '8px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              padding: '8px 14px',
              cursor: 'pointer',
              fontSize: '18px',
              transition: 'background 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseOver={e => e.currentTarget.style.background = '#1d4ed8'}
            onMouseOut={e => e.currentTarget.style.background = '#2563eb'}
          >
            💬
          </button>
        </div>
      </div>
    </main>
  );
}
