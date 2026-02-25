'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { IoChatbubblesOutline, IoSend } from 'react-icons/io5'
import { RiRobot2Line } from 'react-icons/ri'
import { FiUser, FiInfo, FiCheckCircle, FiShield } from 'react-icons/fi'
import { HiOutlineLightBulb } from 'react-icons/hi'
import { TbPuzzle, TbBrain } from 'react-icons/tb'
import { BiRefresh } from 'react-icons/bi'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'

const QA_AGENT_ID = '699f1881d5b1b4a241025994'
const PUZZLE_AGENT_ID = '699f1a8fd5b1b4a2410259f7'

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

type AppMode = 'qa' | 'puzzle'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface PuzzleResult {
  puzzle_restated: string
  reasoning: string
  solution: string
  verification: string
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

const SAMPLE_PUZZLE_RESULT: PuzzleResult = {
  puzzle_restated: 'A farmer needs to transport a fox, a chicken, and a bag of grain across a river using a boat that can carry only the farmer and one item at a time. The constraints are: the fox cannot be left alone with the chicken (the fox will eat it), and the chicken cannot be left alone with the grain (the chicken will eat it). Find a sequence of crossings that gets all three items safely across.',
  reasoning: '## Step-by-Step Analysis\n\n1. **Identify the constraints:**\n   - Fox + Chicken alone = chicken gets eaten\n   - Chicken + Grain alone = grain gets eaten\n   - Fox + Grain alone = safe\n\n2. **Key insight:** The chicken is the problematic item -- it conflicts with both the fox and the grain. The fox and grain can safely be left together.\n\n3. **Working through the crossings:**\n   - **Trip 1:** Farmer takes chicken across (fox and grain are safe together)\n   - **Trip 2:** Farmer returns alone\n   - **Trip 3:** Farmer takes fox across\n   - **Trip 4:** Farmer brings chicken back (to avoid fox eating chicken)\n   - **Trip 5:** Farmer takes grain across (fox and grain are safe together)\n   - **Trip 6:** Farmer returns alone\n   - **Trip 7:** Farmer takes chicken across\n\nAll items are now safely on the other side.',
  solution: '## Solution\n\nThe farmer should make **7 trips** in this order:\n\n1. Take the **chicken** across\n2. Return alone\n3. Take the **fox** across\n4. Bring the **chicken** back\n5. Take the **grain** across\n6. Return alone\n7. Take the **chicken** across\n\nAll three items (fox, chicken, grain) are now safely on the far side of the river.',
  verification: '## Verification\n\nLet us verify each state is safe:\n\n- **After Trip 1:** Near side: Fox, Grain (safe). Far side: Chicken (safe).\n- **After Trip 3:** Near side: Grain (safe). Far side: Fox, Chicken -- but farmer is present.\n- **After Trip 4:** Near side: Chicken, Grain -- but farmer takes grain next. Far side: Fox (safe).\n- **After Trip 5:** Near side: Chicken (safe). Far side: Fox, Grain (safe).\n- **After Trip 7:** Near side: Empty. Far side: Fox, Chicken, Grain with farmer (all safe).\n\nNo constraint is violated at any point. The solution is valid.',
}

const PUZZLE_EXAMPLES = [
  {
    label: 'Classic River Crossing',
    text: 'A farmer needs to cross a river with a fox, a chicken, and a bag of grain. The boat can only carry the farmer and one item at a time. If left alone, the fox will eat the chicken, and the chicken will eat the grain. How can the farmer get everything across safely?',
  },
  {
    label: 'Truth & Lies',
    text: 'You meet two guards. One always tells the truth, one always lies. One door leads to freedom, one to doom. You can ask one guard one question. What do you ask to find the door to freedom?',
  },
  {
    label: "Einstein's Riddle",
    text: "There are 5 houses in a row, each a different color. In each house lives a person of a different nationality. Each person drinks a different beverage, smokes a different brand of cigar, and keeps a different pet. The Brit lives in the red house. The Swede keeps dogs. The Dane drinks tea. The green house is to the left of the white house. The green house owner drinks coffee. The person who smokes Pall Mall keeps birds. The owner of the yellow house smokes Dunhill. The person in the center house drinks milk. The Norwegian lives in the first house. The person who smokes Blends lives next to the one who keeps cats. The person who keeps horses lives next to the one who smokes Dunhill. The person who smokes BlueMaster drinks beer. The German smokes Prince. The Norwegian lives next to the blue house. The person who smokes Blends has a neighbor who drinks water. Who keeps fish?",
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

function PuzzleSolvingIndicator() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
        <TbBrain className="w-8 h-8 text-foreground animate-pulse" />
      </div>
      <p className="text-base font-semibold text-foreground mb-2">Solving puzzle</p>
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <p className="text-xs text-muted-foreground mt-3">This may take a moment for complex puzzles</p>
    </div>
  )
}

function PuzzleResultCard({
  icon,
  title,
  content,
  accent,
}: {
  icon: React.ReactNode
  title: string
  content: string
  accent?: boolean
}) {
  return (
    <div className={`rounded-2xl p-5 ${accent ? 'bg-primary/[0.04] border-2 border-primary/10 shadow-lg' : 'bg-white/75 backdrop-blur-[16px] border border-white/[0.18] shadow-md'}`}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${accent ? 'bg-primary/10' : 'bg-secondary'}`}>
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="pl-[2.625rem]">
        {renderMarkdown(content)}
      </div>
    </div>
  )
}

function AgentStatusSection({
  isActive,
  hasError,
  mode,
}: {
  isActive: boolean
  hasError: boolean
  mode: AppMode
}) {
  const agentName = mode === 'qa' ? 'Topic Q&A Agent' : 'Logic Puzzle Solver'
  const agentId = mode === 'qa' ? QA_AGENT_ID : PUZZLE_AGENT_ID

  return (
    <div className="px-4 py-3 border-t border-border bg-white/50 backdrop-blur-[16px]">
      <div className="max-w-3xl mx-auto flex items-center gap-3">
        <FiInfo className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <span className="font-medium">{agentName}</span>
          <span className="text-border">|</span>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-amber-400 animate-pulse' : hasError ? 'bg-red-400' : 'bg-emerald-400'}`} />
            <span>{isActive ? 'Processing...' : hasError ? 'Error' : 'Ready'}</span>
          </div>
          <span className="text-border">|</span>
          <span className="font-mono text-[10px] opacity-60">{agentId}</span>
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
  // Mode state
  const [mode, setMode] = useState<AppMode>('qa')

  // Q&A state
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [qaLoading, setQaLoading] = useState(false)
  const [qaError, setQaError] = useState(false)
  const [showSampleData, setShowSampleData] = useState(false)

  // Puzzle state
  const [puzzleInput, setPuzzleInput] = useState('')
  const [puzzleResult, setPuzzleResult] = useState<PuzzleResult | null>(null)
  const [puzzleLoading, setPuzzleLoading] = useState(false)
  const [puzzleError, setPuzzleError] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const displayMessages = showSampleData && messages.length === 0 ? SAMPLE_MESSAGES : messages
  const displayPuzzleResult = showSampleData && !puzzleResult && !puzzleLoading ? SAMPLE_PUZZLE_RESULT : puzzleResult

  const isLoading = mode === 'qa' ? qaLoading : puzzleLoading
  const hasError = mode === 'qa' ? qaError : puzzleError

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [displayMessages, qaLoading, scrollToBottom])

  // Focus the appropriate input when mode changes
  useEffect(() => {
    if (mode === 'qa') {
      inputRef.current?.focus()
    } else {
      textareaRef.current?.focus()
    }
  }, [mode])

  // Q&A logic
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || qaLoading) return

      setQaError(false)
      setInputValue('')

      const userMsg: Message = {
        role: 'user',
        content: trimmed,
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, userMsg])
      setQaLoading(true)

      try {
        const allMessages = [...messages, userMsg]
        const conversationHistory = allMessages
          .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
          .join('\n')
        const fullPrompt = conversationHistory

        const result = await callAIAgent(fullPrompt, QA_AGENT_ID)

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
            setQaError(true)
          }
        } catch {
          agentResponse = 'Something went wrong. Please try again.'
          setQaError(true)
        }

        const assistantMsg: Message = {
          role: 'assistant',
          content: agentResponse,
          timestamp: Date.now(),
        }

        setMessages((prev) => [...prev, assistantMsg])
      } catch {
        setQaError(true)
        const errorMsg: Message = {
          role: 'assistant',
          content: 'I encountered an error processing your request. Please try again.',
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, errorMsg])
      } finally {
        setQaLoading(false)
        inputRef.current?.focus()
      }
    },
    [qaLoading, messages]
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

  // Puzzle logic
  const solvePuzzle = useCallback(async () => {
    const trimmed = puzzleInput.trim()
    if (!trimmed || puzzleLoading) return

    setPuzzleError(false)
    setPuzzleResult(null)
    setPuzzleLoading(true)

    try {
      const result = await callAIAgent(trimmed, PUZZLE_AGENT_ID)

      let parsed: PuzzleResult = { puzzle_restated: '', reasoning: '', solution: '', verification: '' }
      try {
        if (result?.response?.result) {
          const r = result.response.result
          parsed = {
            puzzle_restated: r.puzzle_restated || '',
            reasoning: r.reasoning || '',
            solution: r.solution || '',
            verification: r.verification || '',
          }
        } else if (result?.response?.message) {
          parsed.reasoning = result.response.message
        }
      } catch {
        parsed.reasoning = 'Something went wrong. Please try again.'
        setPuzzleError(true)
      }

      // If all fields are empty, try to extract something
      if (!parsed.puzzle_restated && !parsed.reasoning && !parsed.solution && !parsed.verification) {
        setPuzzleError(true)
        parsed.reasoning = 'Could not parse the puzzle solution. The agent may have returned an unexpected response format.'
      }

      setPuzzleResult(parsed)
    } catch {
      setPuzzleError(true)
      setPuzzleResult({
        puzzle_restated: '',
        reasoning: 'An error occurred while solving the puzzle. Please try again.',
        solution: '',
        verification: '',
      })
    } finally {
      setPuzzleLoading(false)
    }
  }, [puzzleInput, puzzleLoading])

  const handleSolveAnother = useCallback(() => {
    setPuzzleResult(null)
    setPuzzleInput('')
    setPuzzleError(false)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [])

  const handlePuzzleChipClick = useCallback((text: string) => {
    if (showSampleData) {
      setShowSampleData(false)
    }
    setPuzzleInput(text)
    setPuzzleResult(null)
    setPuzzleError(false)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [showSampleData])

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
              {mode === 'qa' ? (
                <IoChatbubblesOutline className="w-5 h-5 text-foreground" />
              ) : (
                <TbPuzzle className="w-5 h-5 text-foreground" />
              )}
              <h1 className="text-base font-semibold tracking-[-0.01em] text-foreground">
                {mode === 'qa' ? 'TopicBot' : 'Puzzle Solver'}
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

          {/* Mode Tabs */}
          <div className="max-w-3xl mx-auto px-4 pb-2">
            <div className="flex items-center gap-1 bg-secondary/60 rounded-xl p-1">
              <button
                onClick={() => setMode('qa')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${mode === 'qa' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <IoChatbubblesOutline className="w-4 h-4" />
                <span>Topic Q&A</span>
              </button>
              <button
                onClick={() => setMode('puzzle')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${mode === 'puzzle' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <TbPuzzle className="w-4 h-4" />
                <span>Puzzle Solver</span>
              </button>
            </div>
          </div>
        </header>

        {/* ===== Q&A Mode ===== */}
        {mode === 'qa' && (
          <>
            <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
              {displayMessages.length === 0 ? (
                <WelcomeCard onTopicClick={handleTopicClick} />
              ) : (
                <ScrollArea className="flex-1 px-4 pt-4">
                  <div className="pb-4">
                    {displayMessages.map((msg, index) => (
                      <MessageBubble key={`${msg.timestamp}-${index}`} message={msg} />
                    ))}
                    {qaLoading && <TypingIndicator />}
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
                    disabled={qaLoading}
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none py-2.5 leading-[1.55] tracking-[-0.01em] disabled:opacity-50"
                  />
                  <button
                    onClick={handleSendClick}
                    disabled={qaLoading || !inputValue.trim()}
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
          </>
        )}

        {/* ===== Puzzle Solver Mode ===== */}
        {mode === 'puzzle' && (
          <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4 py-6">
            {/* Show input section when no result and not loading */}
            {!displayPuzzleResult && !puzzleLoading && (
              <div className="flex flex-col gap-6 flex-1">
                {/* Puzzle Input Card */}
                <div className="rounded-2xl bg-white/75 backdrop-blur-[16px] border border-white/[0.18] shadow-lg p-6">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                      <TbPuzzle className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-foreground tracking-[-0.01em]">Enter Your Puzzle</h2>
                      <p className="text-xs text-muted-foreground">Paste or type any logic puzzle and get a step-by-step solution</p>
                    </div>
                  </div>

                  <textarea
                    ref={textareaRef}
                    value={puzzleInput}
                    onChange={(e) => setPuzzleInput(e.target.value)}
                    placeholder="Enter your logic puzzle here..."
                    rows={6}
                    disabled={puzzleLoading}
                    className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-y min-h-[120px] leading-relaxed tracking-[-0.01em] focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-shadow duration-200 disabled:opacity-50"
                  />

                  <button
                    onClick={solvePuzzle}
                    disabled={puzzleLoading || !puzzleInput.trim()}
                    className="w-full mt-4 py-3 px-6 bg-primary text-primary-foreground rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <HiOutlineLightBulb className="w-4.5 h-4.5" />
                    Solve Puzzle
                  </button>
                </div>

                {/* Example Chips */}
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-2.5 tracking-[-0.01em]">Try an example puzzle:</p>
                  <div className="flex flex-wrap gap-2">
                    {PUZZLE_EXAMPLES.map((example) => (
                      <button
                        key={example.label}
                        onClick={() => handlePuzzleChipClick(example.text)}
                        className="px-4 py-2 rounded-full bg-secondary text-foreground text-sm font-medium hover:bg-muted transition-all duration-200 hover:shadow-md active:scale-95 border border-border"
                      >
                        {example.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Loading state */}
            {puzzleLoading && <PuzzleSolvingIndicator />}

            {/* Result section */}
            {displayPuzzleResult && !puzzleLoading && (
              <div className="flex flex-col gap-4">
                {/* Solve Another button */}
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-foreground tracking-[-0.01em]">Puzzle Solution</h2>
                  <button
                    onClick={handleSolveAnother}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary text-foreground text-sm font-medium hover:bg-muted transition-all duration-200 hover:shadow-md active:scale-95 border border-border"
                  >
                    <BiRefresh className="w-4 h-4" />
                    Solve Another
                  </button>
                </div>

                {/* Result Cards */}
                {(displayPuzzleResult?.puzzle_restated ?? '').length > 0 && (
                  <PuzzleResultCard
                    icon={<TbPuzzle className="w-4 h-4 text-muted-foreground" />}
                    title="Puzzle Restated"
                    content={displayPuzzleResult?.puzzle_restated ?? ''}
                  />
                )}

                {(displayPuzzleResult?.reasoning ?? '').length > 0 && (
                  <PuzzleResultCard
                    icon={<TbBrain className="w-4 h-4 text-muted-foreground" />}
                    title="Step-by-Step Reasoning"
                    content={displayPuzzleResult?.reasoning ?? ''}
                  />
                )}

                {(displayPuzzleResult?.solution ?? '').length > 0 && (
                  <PuzzleResultCard
                    icon={<FiCheckCircle className="w-4 h-4 text-foreground" />}
                    title="Solution"
                    content={displayPuzzleResult?.solution ?? ''}
                    accent
                  />
                )}

                {(displayPuzzleResult?.verification ?? '').length > 0 && (
                  <PuzzleResultCard
                    icon={<FiShield className="w-4 h-4 text-muted-foreground" />}
                    title="Verification"
                    content={displayPuzzleResult?.verification ?? ''}
                  />
                )}

                {/* Bottom solve another button for long results */}
                <div className="flex justify-center pt-2 pb-4">
                  <button
                    onClick={handleSolveAnother}
                    className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all duration-200 active:scale-95"
                  >
                    <BiRefresh className="w-4 h-4" />
                    Solve Another Puzzle
                  </button>
                </div>
              </div>
            )}
          </main>
        )}

        {/* Agent Status */}
        <AgentStatusSection isActive={isLoading} hasError={hasError} mode={mode} />
      </div>
    </ErrorBoundary>
  )
}
