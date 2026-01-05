# OneWise Backend

The backend API server for OneWise, providing RESTful APIs, real-time WebSocket communication, and database integration for the mentorship platform. Built with Express.js, TypeScript, and Socket.io.

## Features

- **RESTful API**: Express.js server with TypeScript
- **Real-time Communication**: Socket.io for live mentorship sessions
- **Database Integration**: Supabase PostgreSQL
- **Authentication**: JWT-based auth via Supabase
- **Security**: Helmet, CORS, input validation with Zod
- **Code Execution**: Integrated code execution environment
- **Logging**: Morgan for request logging

## Tech Stack

- **Framework**: Express.js with TypeScript
- **Real-time**: Socket.io
- **Database**: Supabase (PostgreSQL)
- **Validation**: Zod
- **Security**: Helmet, CORS
- **Logging**: Morgan
- **Development**: ts-node-dev for hot reload

## Prerequisites

- Node.js >= 18.18.0
- npm, yarn, or pnpm
- Supabase account and project

## Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

## Environment Setup

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Configure the following variables in `.env`:
```env
# Supabase project credentials
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# API configuration
PORT=4000
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:3000
SOCKET_CORS_ORIGINS=http://localhost:3000

# Optional: log level (info | debug | warn | error)
LOG_LEVEL=info
```

## Running the Application

### Development
```bash
npm run dev
```
The server will start on http://localhost:4000 with hot reload.

### Production Build
```bash
npm run build
npm run start
```

### Type Checking
```bash
npm run typecheck
```

## API Endpoints

### Authentication
- `GET /auth/me` - Get current user info
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout

### Sessions
- `GET /sessions` - List user sessions
- `POST /sessions` - Create new session
- `GET /sessions/:id` - Get session details
- `PUT /sessions/:id` - Update session
- `DELETE /sessions/:id` - Delete session

### Users
- `GET /users` - List users
- `GET /users/:id` - Get user profile
- `PUT /users/:id` - Update user profile

### Code Execution
- `POST /execute` - Execute code (if enabled)

## WebSocket Events

### Connection
- `connection` - Client connects
- `disconnect` - Client disconnects

### Sessions
- `join-session` - Join a mentorship session
- `leave-session` - Leave a session
- `code-change` - Real-time code updates
- `cursor-move` - Cursor position updates

### Messages
- `send-message` - Send chat message
- `receive-message` - Receive chat message

## Project Structure

```
backend/
├── src/
│   ├── index.ts                 # Server entry point
│   ├── app.ts                   # Express app configuration
│   ├── config/                  # Configuration files
│   ├── controllers/             # Route handlers
│   ├── middleware/              # Express middleware
│   ├── models/                  # Data models
│   ├── routes/                  # API routes
│   ├── services/                # Business logic services
│   ├── socket/                  # Socket.io handlers
│   ├── types/                   # TypeScript definitions
│   └── utils/                   # Utility functions
├── supabase/                    # Supabase migrations/seeds
├── CODE_EXECUTION_SETUP.md      # Code execution setup guide
├── .env.example                # Environment variables template
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
└── render.yaml                 # Render deployment config
```

## Database Schema

The application uses Supabase for data storage. Key tables include:

- `users` - User profiles and authentication
- `sessions` - Mentorship sessions
- `messages` - Chat messages
- `code_snippets` - Shared code snippets

## Code Execution

The backend includes an optional code execution environment. See `CODE_EXECUTION_SETUP.md` for setup instructions.

## Deployment

### Render
1. Connect your GitHub repository
2. Use the `render.yaml` configuration
3. Configure environment variables
4. Deploy as a web service

### Other Platforms
- **Railway**: Node.js deployment
- **Heroku**: Standard Node.js app
- **AWS/GCP/Azure**: Containerized deployment

## Scripts

- `npm run dev`: Start development server with hot reload
- `npm run build`: Compile TypeScript to JavaScript
- `npm run start`: Start production server
- `npm run typecheck`: Run TypeScript type checking

## Health Check

The application includes a health check endpoint at `/health` for monitoring.

## Security

- CORS configured for frontend origin
- Helmet for security headers
- Input validation with Zod
- JWT token verification
- Rate limiting (can be added)

## Contributing

1. Follow TypeScript best practices
2. Run type checking before committing
3. Add proper error handling
4. Document new API endpoints
5. Update this README for changes
