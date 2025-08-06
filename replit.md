# Mail360 Manager

## Overview

Mail360 Manager is a full-stack email management application built for sending single and bulk emails through Zoho's email service. The application provides a modern web interface for managing multiple email accounts, sending individual emails, and performing bulk email operations with detailed result tracking. It features a React frontend with shadcn/ui components and an Express.js backend with PostgreSQL database integration using Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system variables
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **Form Handling**: React Hook Form with Zod validation resolvers

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints for email operations and account management
- **Validation**: Zod schemas for request/response validation
- **Authentication**: Token-based authentication with Zoho OAuth2

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Connection**: Neon Database serverless PostgreSQL
- **Migrations**: Drizzle Kit for database schema management
- **Session Storage**: PostgreSQL-based session storage with connect-pg-simple
- **File Storage**: JSON files for email account configurations

### Authentication and Authorization
- **OAuth Provider**: Zoho OAuth2 for email service access
- **Token Management**: Refresh token flow with automatic token renewal
- **Session Handling**: Server-side session management with PostgreSQL storage
- **Account Management**: Multi-account support with credential isolation

### External Service Integrations

#### Email Service Integration
- **Provider**: Zoho Mail API for email sending capabilities
- **Authentication**: OAuth2 with client credentials and refresh tokens
- **Features**: Single email sending, bulk email operations, delivery tracking

#### Development and Deployment
- **Development**: Replit environment with hot reload and error overlays
- **Database**: Neon Database for managed PostgreSQL hosting
- **Monitoring**: Built-in request logging and error tracking

### Core Features
- **Single Email Sending**: Individual email composition and delivery
- **Bulk Email Operations**: Mass email sending with recipient management
- **Result Tracking**: Detailed delivery status and error reporting
- **Account Management**: Multiple Zoho account configuration and switching
- **Responsive Design**: Mobile-first UI with adaptive layouts

### Design Patterns
- **Repository Pattern**: Storage abstraction layer for data operations
- **Factory Pattern**: Database connection and ORM instance management
- **Middleware Pattern**: Express.js middleware for logging and error handling
- **Hook Pattern**: Custom React hooks for data fetching and state management