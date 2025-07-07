"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, Bot, User, Loader2, Copy, Check, Menu, Code, Palette, Globe, Square } from "lucide-react"
import { cn } from "@/lib/utils"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import type { JSX } from "react/jsx-runtime"

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
}

interface ChatResponse {
  reply: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessage])

  const stopStreaming = () => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current)
      streamIntervalRef.current = null
      setIsStreaming(false)
      if (streamingMessage) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: streamingMessage,
          role: "assistant",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
        setStreamingMessage("")
      }
    }
  }

  const simulateStreaming = (text: string, callback: (fullText: string) => void) => {
    setIsStreaming(true)
    setStreamingMessage("")
    let currentIndex = 0
    const words = text.split(" ")

    streamIntervalRef.current = setInterval(() => {
      if (currentIndex < words.length) {
        const currentText = words.slice(0, currentIndex + 1).join(" ")
        setStreamingMessage(currentText)
        currentIndex++
      } else {
        clearInterval(streamIntervalRef.current!)
        streamIntervalRef.current = null
        setIsStreaming(false)
        setStreamingMessage("")
        callback(text)
      }
    }, 30)
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("https://multi-agents-backend.vercel.app/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userMessage.content }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: ChatResponse = await response.json()

      // Keep the original markdown formatting instead of removing it
      simulateStreaming(data.reply, (fullText) => {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: fullText,
          role: "assistant",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
      })
    } catch (error) {
      console.error("Error sending message:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content:
          "Sorry, I encountered an error. Please make sure the backend server is running on https://multi-agents-backend.vercel.app/api/chat",
        role: "assistant",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedCode(id)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  const formatMessage = (content: string) => {
    // Split content by code blocks first to preserve them
    const codeBlockRegex = /(```[\s\S]*?```)/g
    const parts = content.split(codeBlockRegex)

    return parts.map((part, index) => {
      // Handle code blocks
      if (part.startsWith("```") && part.endsWith("```")) {
        const codeContent = part.slice(3, -3)
        const lines = codeContent.split("\n")
        const language = lines[0].trim() || "text"
        const code = lines.slice(1).join("\n")
        const codeId = `code-${index}`

        return (
          <div key={index} className="my-4 rounded-lg overflow-hidden border border-gray-700">
            <div className="flex items-center justify-between bg-gray-800 px-4 py-2">
              <span className="text-sm font-medium text-gray-300">{language}</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(code, codeId)}
                  className="h-8 px-3 text-gray-300 hover:text-white hover:bg-gray-700"
                >
                  {copiedCode === codeId ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      <span className="text-xs">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      <span className="text-xs">Copy</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className="relative">
              <SyntaxHighlighter
                language={language.toLowerCase()}
                style={vscDarkPlus}
                customStyle={{
                  margin: 0,
                  padding: "16px",
                  background: "#1e1e1e",
                  fontSize: "14px",
                  lineHeight: "1.5",
                }}
                showLineNumbers={false}
                wrapLines={true}
                wrapLongLines={true}
              >
                {code}
              </SyntaxHighlighter>
            </div>
          </div>
        )
      }

      // Handle regular text with markdown formatting
      return (
        <div key={index} className="space-y-2">
          {formatTextWithMarkdown(part)}
        </div>
      )
    })
  }

  const formatTextWithMarkdown = (text: string) => {
    const lines = text.split("\n")
    const elements: React.ReactNode[] = []
    let currentList: React.ReactNode[] = []
    let listType: "ul" | "ol" | null = null

    const flushList = () => {
      if (currentList.length > 0) {
        if (listType === "ul") {
          elements.push(
            <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 my-2 ml-4">
              {currentList}
            </ul>,
          )
        } else if (listType === "ol") {
          elements.push(
            <ol key={`list-${elements.length}`} className="list-decimal list-inside space-y-1 my-2 ml-4">
              {currentList}
            </ol>,
          )
        }
        currentList = []
        listType = null
      }
    }

    lines.forEach((line, lineIndex) => {
      const trimmedLine = line.trim()

      // Skip empty lines
      if (!trimmedLine) {
        flushList()
        elements.push(<br key={`br-${lineIndex}`} />)
        return
      }

      // Handle headings
      if (trimmedLine.startsWith("#")) {
        flushList()
        const level = trimmedLine.match(/^#+/)?.[0].length || 1
        const headingText = trimmedLine.replace(/^#+\s*/, "")
        const HeadingTag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements

        const headingClasses = {
          1: "text-2xl font-bold mt-6 mb-4",
          2: "text-xl font-bold mt-5 mb-3",
          3: "text-lg font-bold mt-4 mb-2",
          4: "text-base font-bold mt-3 mb-2",
          5: "text-sm font-bold mt-2 mb-1",
          6: "text-sm font-bold mt-2 mb-1",
        }

        elements.push(
          <HeadingTag key={`heading-${lineIndex}`} className={headingClasses[level as keyof typeof headingClasses]}>
            {formatInlineMarkdown(headingText)}
          </HeadingTag>,
        )
        return
      }

      // Handle unordered lists
      if (trimmedLine.match(/^[-*+]\s/)) {
        if (listType !== "ul") {
          flushList()
          listType = "ul"
        }
        const listItemText = trimmedLine.replace(/^[-*+]\s/, "")
        currentList.push(
          <li key={`li-${lineIndex}`} className="text-sm">
            {formatInlineMarkdown(listItemText)}
          </li>,
        )
        return
      }

      // Handle ordered lists
      if (trimmedLine.match(/^\d+\.\s/)) {
        if (listType !== "ol") {
          flushList()
          listType = "ol"
        }
        const listItemText = trimmedLine.replace(/^\d+\.\s/, "")
        currentList.push(
          <li key={`li-${lineIndex}`} className="text-sm">
            {formatInlineMarkdown(listItemText)}
          </li>,
        )
        return
      }

      // Handle regular paragraphs
      flushList()
      if (trimmedLine) {
        elements.push(
          <p key={`p-${lineIndex}`} className="text-sm leading-relaxed mb-2">
            {formatInlineMarkdown(trimmedLine)}
          </p>,
        )
      }
    })

    // Flush any remaining list
    flushList()

    return elements
  }

  const formatInlineMarkdown = (text: string) => {
    // Handle inline code first to preserve it
    const parts = text.split(/(`[^`]+`)/g)

    return parts.map((part, index) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={index} className="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded text-sm font-mono">
            {part.slice(1, -1)}
          </code>
        )
      }

      // Handle bold and italic text
      let formattedText: React.ReactNode = part

      // Handle bold text (**text**)
      formattedText = part.split(/(\*\*[^*]+\*\*)/g).map((segment, segIndex) => {
        if (segment.startsWith("**") && segment.endsWith("**")) {
          return (
            <strong key={`${index}-${segIndex}`} className="font-bold">
              {segment.slice(2, -2)}
            </strong>
          )
        }

        // Handle italic text (*text*)
        return segment.split(/(\*[^*]+\*)/g).map((subSegment, subIndex) => {
          if (subSegment.startsWith("*") && subSegment.endsWith("*") && !subSegment.startsWith("**")) {
            return (
              <em key={`${index}-${segIndex}-${subIndex}`} className="italic">
                {subSegment.slice(1, -1)}
              </em>
            )
          }
          return subSegment
        })
      })

      return <span key={index}>{formattedText}</span>
    })
  }

  const newChat = () => {
    setMessages([])
    setInput("")
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden mr-2 text-white hover:bg-white/10"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center space-x-2">
              <Bot className="w-6 h-6 text-white" />
              <h1 className="text-xl font-bold text-white">AI Multi Agents</h1>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center p-8 overflow-y-auto">
              <div className="text-center max-w-2xl">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-4">How can I help you today?</h2>
                <p className="text-gray-600 mb-8">
                  I'm your AI assistant with specialized agents for content writing, digital marketing, and web
                  development.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-colors">
                    <Code className="w-6 h-6 text-blue-500 mb-2" />
                    <h3 className="font-medium text-gray-800 mb-1">Web Development</h3>
                    <p className="text-sm text-gray-600">Build websites, APIs, and applications</p>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg hover:border-green-300 cursor-pointer transition-colors">
                    <Palette className="w-6 h-6 text-green-500 mb-2" />
                    <h3 className="font-medium text-gray-800 mb-1">Content Writing</h3>
                    <p className="text-sm text-gray-600">Create engaging content and copy</p>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 cursor-pointer transition-colors">
                    <Globe className="w-6 h-6 text-purple-500 mb-2" />
                    <h3 className="font-medium text-gray-800 mb-1">Digital Marketing</h3>
                    <p className="text-sm text-gray-600">Strategy, campaigns, and analytics</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <ScrollArea ref={scrollAreaRef} className="h-full">
              <div className="max-w-4xl mx-auto px-4 py-6">
                <div className="space-y-6">
                  {messages.map((message) => (
                    <div key={message.id} className="group">
                      <div className={cn("flex gap-4", message.role === "user" ? "justify-end" : "justify-start")}>
                        {message.role === "assistant" && (
                          <Avatar className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 flex-shrink-0">
                            <AvatarFallback className="text-white">
                              <Bot size={16} />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={cn(
                            "max-w-[85%] rounded-2xl px-4 py-3",
                            message.role === "user"
                              ? "bg-blue-500 text-white ml-auto"
                              : "bg-white border border-gray-200 text-gray-800",
                          )}
                        >
                          <div className="prose prose-sm max-w-none">
                            {message.role === "assistant" ? (
                              <div className="leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                                {formatMessage(message.content)}
                              </div>
                            ) : (
                              <p className="text-sm leading-relaxed whitespace-pre-wrap m-0">{message.content}</p>
                            )}
                          </div>
                        </div>
                        {message.role === "user" && (
                          <Avatar className="w-8 h-8 bg-blue-500 flex-shrink-0">
                            <AvatarFallback className="text-white">
                              <User size={16} />
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    </div>
                  ))}
                  {isStreaming && streamingMessage && (
                    <div className="group">
                      <div className="flex gap-4 justify-start">
                        <Avatar className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 flex-shrink-0">
                          <AvatarFallback className="text-white">
                            <Bot size={16} />
                          </AvatarFallback>
                        </Avatar>
                        <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-white border border-gray-200 text-gray-800">
                          <div className="leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                            {formatMessage(streamingMessage)}
                            <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {isLoading && !isStreaming && (
                    <div className="group">
                      <div className="flex gap-4 justify-start">
                        <Avatar className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 flex-shrink-0">
                          <AvatarFallback className="text-white">
                            <Bot size={16} />
                          </AvatarFallback>
                        </Avatar>
                        <div className="rounded-2xl px-4 py-3 bg-gray-50">
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                            <span className="text-sm text-gray-500">Thinking...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Message AI Assistant..."
                  className="pr-12 py-3 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl resize-none"
                  disabled={isLoading}
                />
              </div>
              {isStreaming ? (
                <Button
                  onClick={stopStreaming}
                  className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-xl"
                  size="sm"
                >
                  <Square className="w-4 h-4" />
                  <span className="ml-1">Stop</span>
                </Button>
              ) : (
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-xl"
                  size="sm"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-2 text-center">
              AI can make mistakes. Consider checking important information.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
