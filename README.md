# Auto-GC: Autonomous General Contractor Platform

An enterprise-grade **Agentic GC Platform** that serves as a "Digital Twin" for construction projects. Multi-agent orchestration transforms SMS, voice calls, and site photos into real-time project intelligence.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                 ORCHESTRATOR AGENT                   │
│            (Brain - State & Delegation)              │
├──────────┬──────────┬──────────┬────────────────────┤
│ Comm     │ Vision   │Logistics │  Client Portal     │
│ Agent    │ Agent    │ Agent    │  Agent             │
│ Twilio   │ GPT-4o-V │ Gantt   │  EOD Summaries     │
│ Deepgram │ Gemini   │ Bidding │  Push Notifs       │
└──────────┴──────────┴──────────┴────────────────────┘
         ↕               ↕              ↕
┌─────────────────────────────────────────────────────┐
│              SUPABASE (PostgreSQL)                   │
│   Projects │ Milestones │ Subs │ Comms │ Media      │
└─────────────────────────────────────────────────────┘
```

## Stack

| Layer     | Technology                              |
|-----------|----------------------------------------|
| Frontend  | Next.js 15 (App Router), Tailwind, Shadcn/UI |
| Backend   | FastAPI (Python 3.12)                  |
| Database  | Supabase (PostgreSQL, Auth, Storage)   |
| Agents    | LangGraph multi-agent orchestration    |
| Voice/SMS | Twilio, Deepgram STT                  |
| Vision    | GPT-4o Vision / Gemini Pro Vision      |
| Payments  | Stripe Connect                         |

## Quick Start

```bash
# Backend
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend && npm install && npm run dev
```

## Project Structure

```
Auto-GC/
├── frontend/          # Next.js 15 App Router
├── backend/           # FastAPI Python service
│   ├── app/
│   │   ├── agents/    # LangGraph multi-agent system
│   │   ├── api/       # REST endpoints
│   │   ├── models/    # SQLAlchemy ORM models
│   │   ├── services/  # Business logic
│   │   └── integrations/  # Twilio, Stripe, Deepgram
│   └── migrations/    # Alembic DB migrations
├── packages/shared/   # Shared types & constants
└── docs/              # Architecture docs
```
