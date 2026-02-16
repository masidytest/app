export interface Workspace {
  id: string
  name: string
  plan: "free" | "pro" | "enterprise"
  membersCount: number
}

export interface Project {
  id: string
  name: string
  description: string
  status: "building" | "live" | "paused" | "draft"
  workspaceId: string
  createdAt: string
  updatedAt: string
}

export interface Deployment {
  id: string
  projectId: string
  status: "live" | "building" | "failed" | "stopped"
  url: string
  createdAt: string
  commit: string
}

export interface AIMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
}

export const dummyWorkspaces: Workspace[] = [
  { id: "ws-1", name: "My Workspace", plan: "pro", membersCount: 3 },
  { id: "ws-2", name: "Acme Corp", plan: "enterprise", membersCount: 12 },
]

export const dummyProjects: Project[] = [
  {
    id: "proj-1",
    name: "AI Customer Support Bot",
    description: "An intelligent support chatbot that handles tier-1 support tickets automatically.",
    status: "live",
    workspaceId: "ws-1",
    createdAt: "2026-01-15T10:00:00Z",
    updatedAt: "2026-02-10T14:30:00Z",
  },
  {
    id: "proj-2",
    name: "Lead Scoring Engine",
    description: "ML-powered lead scoring that integrates with your CRM.",
    status: "building",
    workspaceId: "ws-1",
    createdAt: "2026-02-01T09:00:00Z",
    updatedAt: "2026-02-14T11:00:00Z",
  },
  {
    id: "proj-3",
    name: "Content Generator",
    description: "AI content generation pipeline for blog posts and social media.",
    status: "draft",
    workspaceId: "ws-1",
    createdAt: "2026-02-12T16:00:00Z",
    updatedAt: "2026-02-12T16:00:00Z",
  },
  {
    id: "proj-4",
    name: "Invoice Processor",
    description: "Automated invoice parsing and data extraction using vision AI.",
    status: "live",
    workspaceId: "ws-2",
    createdAt: "2025-12-20T08:00:00Z",
    updatedAt: "2026-02-08T19:00:00Z",
  },
]

export const dummyDeployments: Deployment[] = [
  {
    id: "dep-1",
    projectId: "proj-1",
    status: "live",
    url: "https://support-bot.masidy.app",
    createdAt: "2026-02-10T14:30:00Z",
    commit: "a1b2c3d",
  },
  {
    id: "dep-2",
    projectId: "proj-1",
    status: "stopped",
    url: "https://support-bot-prev.masidy.app",
    createdAt: "2026-02-05T09:00:00Z",
    commit: "e4f5g6h",
  },
  {
    id: "dep-3",
    projectId: "proj-2",
    status: "building",
    url: "https://lead-scoring-dev.masidy.app",
    createdAt: "2026-02-14T11:00:00Z",
    commit: "i7j8k9l",
  },
]

export const dummyAIMessages: AIMessage[] = [
  {
    id: "msg-1",
    role: "user",
    content: "Build me an AI-powered customer support chatbot that can handle common questions about our product, process refund requests, and escalate complex issues to human agents.",
    timestamp: "2026-02-10T10:00:00Z",
  },
  {
    id: "msg-2",
    role: "assistant",
    content: "I'll build that for you. Here's what I'm creating:\n\n1. **Chat Interface** - A clean, embeddable widget with real-time messaging\n2. **Knowledge Base Integration** - RAG pipeline to answer product questions\n3. **Refund Processing** - Automated refund workflow with approval logic\n4. **Escalation System** - Smart routing to human agents when confidence is low\n\nI'm setting up the project structure now. You'll see the preview update in real-time.",
    timestamp: "2026-02-10T10:00:30Z",
  },
  {
    id: "msg-3",
    role: "user",
    content: "Great! Can you also add analytics to track resolution rates?",
    timestamp: "2026-02-10T10:05:00Z",
  },
  {
    id: "msg-4",
    role: "assistant",
    content: "Absolutely! I'm adding a dashboard with:\n- **Resolution rate** tracking (auto vs. human)\n- **Response time** metrics\n- **Customer satisfaction** scores\n- **Topic clustering** to identify common issues\n\nThe analytics dashboard is now being built into the admin panel.",
    timestamp: "2026-02-10T10:05:15Z",
  },
]

export const pricingPlans = [
  {
    name: "Starter",
    price: "$0",
    period: "/month",
    description: "For individuals exploring AI app building.",
    features: [
      "1 project",
      "100 AI builder messages/month",
      "Community support",
      "Sandbox testing",
      "Shared deployments",
    ],
    cta: "Get Started Free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/month",
    description: "For teams shipping AI apps to production.",
    features: [
      "Unlimited projects",
      "5,000 AI builder messages/month",
      "Priority support",
      "Custom domains",
      "Production deployments",
      "Team collaboration",
      "API access",
    ],
    cta: "Start Pro Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For organizations with advanced requirements.",
    features: [
      "Everything in Pro",
      "Unlimited AI messages",
      "SSO & SAML",
      "Dedicated infrastructure",
      "SLA guarantees",
      "Custom integrations",
      "Onboarding support",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
]

export const faqItems = [
  {
    question: "How does Masidy work?",
    answer: "Simply describe what you want to build in plain English. Our AI Builder agent will design the architecture, write the code, set up the infrastructure, and deploy your app. You interact only through conversation and simple action buttons.",
  },
  {
    question: "Do I need to know how to code?",
    answer: "No coding skills are required. Masidy's AI handles all the technical work. You just describe your requirements, review the results, test in the sandbox, and deploy when ready.",
  },
  {
    question: "What kind of apps can I build?",
    answer: "You can build any AI-powered SaaS application: chatbots, data processing pipelines, content generators, analytics dashboards, automation tools, and more. If it involves AI and runs on the web, Masidy can build it.",
  },
  {
    question: "How are deployments handled?",
    answer: "Each project gets a sandbox for testing and a production deployment with a unique URL. You can also connect custom domains. All infrastructure is fully managed by Masidy.",
  },
  {
    question: "Can I export my code?",
    answer: "Yes. Enterprise plan users can export the full source code of their projects at any time. The code is clean, well-structured, and ready for self-hosting if needed.",
  },
]
