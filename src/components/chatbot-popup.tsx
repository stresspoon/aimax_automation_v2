"use client"

import { useEffect, useRef, useState } from "react"
import { X, MessageCircle, Send } from "lucide-react"
import { cn } from "@/lib/utils"

export function ChatbotPopup() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState([
    { role: "bot", content: "안녕하세요! AIMAX 상담원입니다. 궁금하신 점을 물어보세요." }
  ])
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  // 스크롤을 항상 최신 메시지로 이동
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    // 부드럽게 맨 아래로 스크롤
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, loading, isOpen])

  const handleSend = async () => {
    if (!message.trim()) return
    
    // Add user message
    const userText = message
    setMessages(prev => [...prev, { role: "user", content: userText }])
    setMessage("")
    setLoading(true)

    try {
      // Build history for API (only user/assistant roles)
      const history = messages
        .filter(m => m.role === 'user' || m.role === 'bot')
        .map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.content }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, history })
      })

      const data = await res.json()
      const reply = data?.reply || data?.error || '잠시 후 다시 시도해주세요.'
      setMessages(prev => [...prev, { role: 'bot', content: String(reply) }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'bot', content: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg transition-all duration-300 flex items-center justify-center",
          isOpen && "scale-0 opacity-0"
        )}
        aria-label="채팅 열기"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat Window */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 w-[380px] h-[500px] bg-card rounded-2xl shadow-2xl border transition-all duration-300 flex flex-col",
          isOpen ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">AIMAX 상담</h3>
              <p className="text-xs text-muted-foreground">무엇을 도와드릴까요?</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition"
            aria-label="채팅 닫기"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Messages */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[70%] px-4 py-2 rounded-2xl",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[70%] px-4 py-2 rounded-2xl bg-muted text-foreground">
                <p className="text-sm">입력하신 내용을 확인하고 있어요…</p>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="메시지를 입력하세요..."
              className="flex-1 px-4 py-2 rounded-full border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
            <button
              onClick={handleSend}
              disabled={loading || !message.trim()}
              className={cn(
                "w-10 h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full flex items-center justify-center transition",
                (loading || !message.trim()) && "opacity-60 cursor-not-allowed hover:bg-primary"
              )}
              aria-label="메시지 전송"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Enter를 눌러 전송
          </p>
        </div>
      </div>
    </>
  )
}
