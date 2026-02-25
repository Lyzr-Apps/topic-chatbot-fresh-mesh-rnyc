'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { IoChatbubblesOutline, IoSend } from 'react-icons/io5'
import { RiRobot2Line } from 'react-icons/ri'
import { FiUser, FiInfo } from 'react-icons/fi'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'

const AGENT_ID = '699f1881d5b1b4a241025994'

const THEME_VARS = {
  '--background': '0 0% 100%',
  '--foreground': '0 0% 9%',
  '--card': '0 0% 99%',
  '--card-foreground': '0 0% 9%',
  '--primary': '0 0% 9%',
  '--primary-foreground': '0 0% 98%',
  '--secondary': '0 0% 96%',
  '--secondary-foreground': '0 0% 9%',
  '--muted': '0 0% 94%',
  '--muted-foreground': '0 0% 45%',
  '--border': '0 0% 90%',
  '--input': '0 0% 85%',
  '--ring': '0 0% 9%',
  '--radius': '0.875rem',
} as React.CSSProperties

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

const TOPIC_CHIPS = ['Space', 'History', 'Technology']

const SAMPLE_MESSAGES: Message[] = [
  { role: 'user', content: 'Tell me about Space', timestamp: 1 },
  {
    role: 'assistant',
    content:
      'Space is the vast, seemingly infinite expanse that exists beyond Earth\'s atmosphere. Here are some fascinating aspects:\n\n## Key Facts\n\n- **The Observable Universe** spans about 93 billion light-years in diameter\n- There are an estimated **2 trillion galaxies** in the observable universe\n- **Light from the Sun** takes about 8 minutes and 20 seconds to reach Earth\n\n## Recent Discoveries\n\nScientists have recently discovered exoplanets in habitable zones of distant stars, raising exciting possibilities about life beyond Earth. The James Webb Space Telescope has been providing unprecedented views of the early universe.\n\nWould you like to explore a specific aspect of space in more detail?',
    timestamp: 2,
  },
  { role: 'user', content: 'What are black holes?', timestamp: 3 },
  {
    role: 'assistant',
    content:
      '## Black Holes\n\nBlack holes are regions of spacetime where gravity is so intense that nothing -- not even light -- can escape once it crosses the **event horizon**.\n\n### Types of Black Holes\n\n1. **Stellar Black Holes** - Formed from the collapse of massive stars, typically 3-10 solar masses\n2. **Supermassive Black Holes** - Found at the centers of galaxies, millions to billions of solar masses\n3. **Intermediate Black Holes** - Between stellar and supermassive, still being studied\n\n### Interesting Properties\n\n- **Time Dilation**: Time slows down near a black hole due to extreme gravitational effects\n- **Spaghettification**: Objects are stretched into thin strands as they approach\n- **Hawking Radiation**: Stephen Hawking theorized that black holes slowly emit radiation and can eventually evaporate\n\nThe first image of a black hole was captured in 2019 by the Event Horizon Telescope, showing the supermassive black hole at the center of galaxy M87.',
    timestamp: 4,
  },
]

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-1.5">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return (
            <h4 key={i} className="font-semibold text-sm mt-3 mb-1 text-foreground">
              {line.slice(4)}
            </h4>
          )
        if (line.startsWith('## '))
          return (
            <h3 key={i} className="font-semibold text-[0.95rem] mt-3 mb-1 text-foreground">
              {line.slice(3)}
            </h3>
          )
        if (line.startsWith('# '))
          return (
            <h2 key={i} className="font-bold text-base mt-4 mb-2 text-foreground">
              {line.slice(2)}
            </h2>
          )
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <li key={i} className="ml-4 list-disc text-sm leading-relaxed text-foreground/90">
              {formatInline(line.slice(2))}
            </li>
          )
        if (/^\d+\.\s/.test(line))
          return (
            <li key={i} className="ml-4 list-decimal text-sm leading-relaxed text-foreground/90">
              {formatInline(line.replace(/^\d+\.\s/, ''))}
            </li>
          )
        if (!line.trim()) return <div key={i} className="h-1" />
        return (
          <p key={i} className="text-sm leading-relaxed text-foreground/90">
            {formatInline(line)}
          </p>
        )
      })}
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5 mb-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
        <RiRobot2Line className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white/75 backdrop-blur-[16px] border border-white/[0.18] shadow-md">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

function WelcomeCard({ onTopicClick }: { onTopicClick: (topic: string) => void }) {
  return (
    <div className="flex items-center justify-center flex-1 px-4">
      <div className="w-full max-w-md p-6 rounded-2xl bg-white/75 backdrop-blur-[16px] border border-white/[0.18] shadow-lg text-center">
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
          <RiRobot2Line className="w-6 h-6 text-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-1.5 tracking-[-0.01em]">
          Hi! Give me a topic and I will answer your questions.
        </h2>
        <p className="text-sm text-muted-foreground mb-5 leading-[1.55]">
          Ask about anything -- I will do my best to provide a helpful and detailed answer. You can also try one of these topics to get started:
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {TOPIC_CHIPS.map((topic) => (
            <button
              key={topic}
              onClick={() => onTopicClick(topic)}
              className="px-4 py-2 rounded-full bg-secondary text-foreground text-sm font-medium hover:bg-muted transition-all duration-200 hover:shadow-md active:scale-95 border border-border"
            >
              {topic}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex items-start justify-end gap-2.5 mb-4">
        <div className="max-w-[75%] px-4 py-3 rounded-2xl rounded-tr-sm bg-primary text-primary-foreground shadow-md">
          <p className="text-sm leading-[1.55]">{message.content}</p>
        </div>
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <FiUser className="w-4 h-4 text-primary-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2.5 mb-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
        <RiRobot2Line className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="max-w-[75%] px-4 py-3 rounded-2xl rounded-tl-sm bg-white/75 backdrop-blur-[16px] border border-white/[0.18] shadow-md">
        {renderMarkdown(message.content)}
      </div>
    </div>
  )
}

function AgentStatusSection({ isActive, hasError }: { isActive: boolean; hasError: boolean }) {
  return (
    <div className="px-4 py-3 border-t border-border bg-white/50 backdrop-blur-[16px]">
      <div className="max-w-3xl mx-auto flex items-center gap-3">
        <FiInfo className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">Topic Q&A Agent</span>
          <span className="text-border">|</span>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-amber-400 animate-pulse' : hasError ? 'bg-red-400' : 'bg-emerald-400'}`} />
            <span>{isActive ? 'Processing...' : hasError ? 'Error' : 'Ready'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [showSampleData, setShowSampleData] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const displayMessages = showSampleData && messages.length === 0 ? SAMPLE_MESSAGES : messages

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [displayMessages, loading, scrollToBottom])

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || loading) return

      setHasError(false)
      setInputValue('')

      const userMsg: Message = {
        role: 'user',
        content: trimmed,
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, userMsg])
      setLoading(true)

      try {
        const allMessages = [...messages, userMsg]
        const conversationHistory = allMessages
          .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
          .join('\n')
        const fullPrompt = conversationHistory

        const result = await callAIAgent(fullPrompt, AGENT_ID)

        let agentResponse = ''
        try {
          if (result?.response?.result?.response) {
            agentResponse = result.response.result.response
          } else if (result?.response?.message) {
            agentResponse = result.response.message
          } else if (typeof result?.response?.result === 'string') {
            agentResponse = result.response.result
          } else if (typeof result?.response === 'string') {
            agentResponse = result.response
          } else {
            agentResponse = "I couldn't generate a response. Please try again."
            setHasError(true)
          }
        } catch {
          agentResponse = 'Something went wrong. Please try again.'
          setHasError(true)
        }

        const assistantMsg: Message = {
          role: 'assistant',
          content: agentResponse,
          timestamp: Date.now(),
        }

        setMessages((prev) => [...prev, assistantMsg])
      } catch {
        setHasError(true)
        const errorMsg: Message = {
          role: 'assistant',
          content: 'I encountered an error processing your request. Please try again.',
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, errorMsg])
      } finally {
        setLoading(false)
        inputRef.current?.focus()
      }
    },
    [loading, messages]
  )

  const handleTopicClick = useCallback(
    (topic: string) => {
      if (showSampleData && messages.length === 0) {
        setShowSampleData(false)
      }
      sendMessage(`Tell me about ${topic}`)
    },
    [sendMessage, showSampleData, messages.length]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage(inputValue)
      }
    },
    [inputValue, sendMessage]
  )

  const handleSendClick = useCallback(() => {
    sendMessage(inputValue)
  }, [inputValue, sendMessage])

  return (
    <ErrorBoundary>
      <div
        style={THEME_VARS}
        className="min-h-screen flex flex-col bg-background text-foreground font-sans"
      >
        {/* Gradient Background Layer */}
        <div className="fixed inset-0 -z-10" style={{ background: 'linear-gradient(135deg, hsl(0 0% 99%) 0%, hsl(210 10% 98%) 35%, hsl(0 0% 98%) 70%, hsl(220 8% 99%) 100%)' }} />

        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-border bg-white/70 backdrop-blur-[16px]">
          <div className="max-w-3xl mx-auto flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-2.5">
              <IoChatbubblesOutline className="w-5 h-5 text-foreground" />
              <h1 className="text-base font-semibold tracking-[-0.01em] text-foreground">
                TopicBot
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Sample Data</span>
              <Switch
                checked={showSampleData}
                onCheckedChange={(checked) => {
                  setShowSampleData(checked)
                }}
              />
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
          {displayMessages.length === 0 ? (
            <WelcomeCard onTopicClick={handleTopicClick} />
          ) : (
            <ScrollArea className="flex-1 px-4 pt-4">
              <div className="pb-4">
                {displayMessages.map((msg, index) => (
                  <MessageBubble key={`${msg.timestamp}-${index}`} message={msg} />
                ))}
                {loading && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          )}
        </main>

        {/* Input Bar */}
        <div className="sticky bottom-0 z-20 border-t border-border bg-white/70 backdrop-blur-[16px]">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="flex items-center gap-2 bg-white/75 backdrop-blur-[16px] border border-border rounded-2xl px-4 py-1 shadow-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 transition-shadow duration-200">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about any topic..."
                disabled={loading}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none py-2.5 leading-[1.55] tracking-[-0.01em] disabled:opacity-50"
              />
              <button
                onClick={handleSendClick}
                disabled={loading || !inputValue.trim()}
                className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center transition-all duration-200 hover:opacity-80 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                <IoSend className="w-4 h-4" />
              </button>
            </div>
            {displayMessages.length === 0 && (
              <p className="text-center text-xs text-muted-foreground mt-2 tracking-[-0.01em]">
                Type a message or click a topic chip above to get started
              </p>
            )}
          </div>
        </div>

        {/* Agent Status */}
        <AgentStatusSection isActive={loading} hasError={hasError} />
      </div>
    </ErrorBoundary>
  )
}
