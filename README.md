# Voter - Real-time Meeting & Voting Assistant

**Voter** is a robust, real-time web application designed to streamline meeting management. It allows participants to join via a WebSocket connection, raise hands with priority queuing (Topics vs. Replies), express reactions, and participate in parliamentary-style voting sessions initiated by administrators.

Built with a **"Clean Architecture"** mindset, this project leverages a modern TypeScript monorepo stack to ensure type safety, scalability, and maintainability.

---

## 🚀 Key Features

### 👤 User Experience
- **Real-time Interaction:** Instant connection via WebSockets (Socket.io).
- **Priority Queueing:**
  - **Topics:** Standard queue for new questions.
  - **Replies:** Higher priority queue for direct responses to the current speaker.
  - *Automatic sorting based on type and timestamp.*
- **Reactions:** Users can toggle reactions (e.g., "Like") to show agreement without interrupting.
- **Voting Interface:**
  - Pop-up modal when a vote starts.
  - Options: YES / NO / ABSTAIN.

### 🛡️ Admin Capabilities
- **Session Management:** Admins are recognized automatically based on configuration.
- **Queue Control:** Ability to lower individual hands or clear all reactions.
- **Voting Control:**
  - Start **Open** (Public) or **Anonymous** voting sessions.
  - Live progress tracking (voter count).
  - Stop voting and reveal results globally.

---

## 🏗 Architecture & Tech Stack

The project is structured as a **Monorepo** using **Turborepo** to manage dependencies and build pipelines efficiently.

### **Frontend (`apps/frontend`)**
- **Framework:** [Next.js](https://nextjs.org/) (React, App Router)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/) (built on Base UI) for a clean, accessible, and "boxy" aesthetic (Lyra theme).
- **State Management:** Custom React Hooks + Socket.io Client.

### **Backend (`apps/backend`)**
- **Framework:** [NestJS](https://nestjs.com/)
- **Communication:** `WebSocketGateway` (Socket.io).
- **State:** In-Memory Singleton Service (Clean separation of business logic and transport layer).
- **Validation:** Strict DTOs.

### **Shared Kernel (`packages/shared-types`)**
- A dedicated TypeScript package containing interfaces, types, and DTOs.
- Ensures **Type Safety** across the entire stack (Frontend & Backend share the exact same contracts).

### **Infrastructure**
- **Docker:** Multi-stage builds for optimized production images.
- **Reverse Proxy:** Nginx (serving Frontend) + Traefik (Edge Router & SSL).

---

## 📂 Project Structure

```bash
.
├── apps
│   ├── backend             # NestJS WebSocket Server
│   │   ├── src
│   │   │   ├── app.gateway.ts  # Controller (WebSocket Events)
│   │   │   ├── app.service.ts  # Domain Logic & State
│   │   │   └── ...
│   │   └── Dockerfile
│   │
│   └── frontend            # Next.js Client
│       ├── src
│       │   ├── components      # shadcn/ui & Feature components
│       │   ├── hooks           # useGameState (Logic layer)
│       │   └── lib             # Socket singleton
│       ├── nginx.conf          # Production serving config
│       └── Dockerfile
│
├── packages
│   └── shared-types        # The Contract between FE and BE
│       └── src
│           └── index.ts    # Exported Interfaces (User, VoteSession, DTOs)
│
├── docker-compose.yml      # Local production orchestration
└── turbo.json              # Monorepo build pipeline config
```

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v20+)
- [pnpm](https://pnpm.io/) (Required for workspace management)
- Docker & Docker Compose (optional for local dev, required for prod)

### 1. Installation
Clone the repository and install dependencies using pnpm:

```bash
git clone <repo-url>
cd voter
pnpm install
```

### 2. Development Mode
Run both the backend and frontend simultaneously in hot-reload mode:

```bash
pnpm dev
```
- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3001

### 3. Configuration
Create a `.env` file in `apps/backend/` (or set environment variables in your deployment):

```env
# Comma separated list of usernames who get Admin privileges
ADMINS=Viktor,Admin,Boss
PORT=3001
```

---

## 🐳 Deployment (Docker)

The project is designed to be containerized. It uses **Traefik** as a reverse proxy for automatic SSL and routing.

### Production Build
To spin up the stack locally or on a VPS:

```bash
# 1. Build and start containers
docker compose up -d --build

# 2. Check logs
docker compose logs -f
```

*Note: The `docker-compose.yml` is configured to work with an external `proxy_network` and Traefik. Ensure Traefik is running if you use the default production compose file.*

---

## 🤝 Contributing

1.  **Shared Types First:** If you modify data structures, always update `packages/shared-types` first, then rebuild (`pnpm build`).
2.  **Clean Code:** Keep the frontend "dumb" (display logic) and the hook/backend "smart" (business logic).

## 📄 License

This project is open-source and available under the MIT License.
