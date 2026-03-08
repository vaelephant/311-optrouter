"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, Copy } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

const codeSnippets: Record<string, string> = {
  curl: `curl https://OptRouter.ai/api/v1/chat/completions \\
  -H "Authorization: Bearer sk-or-v1-..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "openai/gpt-4o",
    "messages": [
      {"role": "user", "content": "Hello"}
    ]
  }'`,
  python: `import openai

client = openai.OpenAI(
    base_url="https://OptRouter.ai/api/v1",
    api_key="sk-or-v1-...",
)

response = client.chat.completions.create(
    model="openai/gpt-4o",
    messages=[
        {"role": "user", "content": "Hello"}
    ]
)

print(response.choices[0].message.content)`,
  javascript: `const response = await fetch(
  "https://OptRouter.ai/api/v1/chat/completions",
  {
    method: "POST",
    headers: {
      Authorization: "Bearer sk-or-v1-...",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o",
      messages: [
        { role: "user", content: "Hello" }
      ],
    }),
  }
);

const data = await response.json();
console.log(data.choices[0].message.content);`,
}

export function QuickStart() {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState("curl")

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippets[activeTab])
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-medium text-card-foreground">
          快速开始
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="size-3 text-success" />
              已复制
            </>
          ) : (
            <>
              <Copy className="size-3" />
              复制
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-7 bg-secondary mb-3">
            <TabsTrigger value="curl" className="text-[11px] h-5 px-2.5 font-mono">cURL</TabsTrigger>
            <TabsTrigger value="python" className="text-[11px] h-5 px-2.5 font-mono">Python</TabsTrigger>
            <TabsTrigger value="javascript" className="text-[11px] h-5 px-2.5 font-mono">JavaScript</TabsTrigger>
          </TabsList>
          {Object.entries(codeSnippets).map(([lang, code]) => (
            <TabsContent key={lang} value={lang}>
              <div className="rounded-lg bg-secondary/50 border border-border p-4 overflow-x-auto">
                <pre className="text-[11px] leading-relaxed font-mono text-foreground/80">
                  <code>{code}</code>
                </pre>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
