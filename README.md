# Voter - Real-time Meeting & Voting System

**Voter** is a robust, real-time web application designed to facilitate structured meetings. It allows users to raise hands (queueing), react to topics, and participate in voting sessions. The system is built with a focus on low latency, clean architecture, and type safety using a modern TypeScript full-stack approach.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Stack](https://img.shields.io/badge/stack-NestJS_React_Tailwind-green.svg)

## 🌟 Key Features

### 🎤 Queue Management
* **Dual-Channel Queue:** Users can raise their hand for a **New Topic** or a **Reply**.
* **Smart Priority:** "Reply" requests are prioritized over new topics to maintain conversation flow.
* **Timestamp Ordering:** Within the same category, users are sorted by the time they raised their hand.

### 🗳️ Voting System
* **Admin Controls:** Admins can start Open or Anonymous voting sessions.
* **Real-time Status:** Admins see vote progress (e.g., "12/15 voted") in real-time.
* **Results:** Automatic result revelation once all active users have cast their votes or the admin closes the session.

### 🛡️ Admin & Moderation
* **Role-based Access:** Admins are defined via environment variables.
* **Moderation Tools:** Admins can lower hands, clear reactions, and force-stop voting sessions.
* **Isolation:** Admins do not participate in voting to ensure neutrality.

### ⚡ Technical Highlights
* **Type Safety:** Shared DTOs between Backend and Frontend via a Monorepo workspace.
* **Dockerized:** Optimized multi-stage Docker builds for production deployment.

---

## 🏗️ Architecture & Project Structure

The project is organized as a **Turborepo** monorepo, ensuring code sharing and optimized build processes.

### Directory Structure

```text
.
├── apps/
│   ├── backend/            # NestJS WebSocket Server
│   │   ├── src/
│   │   ├── Dockerfile      # Multi-stage build (Hoisted node_modules)
│   │   └── ...
│   │
│   └── frontend/           # React + Vite SPA
│       ├── src/
│       │   ├── components/ # Shadcn/UI & Feature components
│       │   ├── hooks/      # Custom hooks (useGameState)
│       │   └── lib/        # Socket instance
│       ├── nginx.conf      # Nginx proxy config
│       └── Dockerfile      # Multi-stage build (Nginx serving static files)
│
├── packages/
│   └── shared-types/       # Shared TypeScript Interfaces & DTOs
│       ├── src/
│       └── package.json
│
├── turbo.json              # Monorepo build pipeline config
└── docker-compose.yml      # Local development orchestration
