# Overview

CarbonShift is a blockchain-based sustainable commuting incentive system built as a full-stack web application. The app rewards users with Green Tokens (GTN) for eco-friendly transportation choices like walking, cycling, and using public transport. Users can connect their crypto wallets, log trips, earn tokens based on distance and transport mode, and redeem rewards from local Bengaluru partners through a marketplace interface.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: shadcn/ui components built on Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with custom design tokens focused on eco-friendly green/white theme
- **State Management**: TanStack Query (React Query) for server state management and API caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Blockchain Integration**: Web3 wallet connection through browser wallets (MetaMask) on Sepolia testnet

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints for user authentication, trip logging, and data retrieval
- **Request Handling**: Express middleware for JSON parsing, logging, and error handling
- **Development Setup**: tsx for TypeScript execution in development, esbuild for production builds

## Data Storage Solutions
- **Database**: PostgreSQL configured through Drizzle ORM
- **ORM**: Drizzle with Zod schema validation for type-safe database operations
- **Connection**: Neon serverless PostgreSQL adapter for cloud database connectivity
- **Schema Management**: Drizzle Kit for database migrations and schema synchronization
- **Development Fallback**: In-memory storage implementation for local development

## Authentication and Authorization
- **Web3 Authentication**: Wallet-based authentication using browser wallet connections
- **Session Management**: Wallet address-based user identification without traditional passwords
- **User Creation**: Automatic user creation on first wallet connection
- **Trip Attribution**: User trips linked by wallet address for token calculation

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Drizzle ORM**: Type-safe database toolkit with PostgreSQL dialect support

### Blockchain Infrastructure  
- **Ethereum Sepolia Testnet**: Test network for smart contract interactions
- **MetaMask Integration**: Browser wallet connection for user authentication
- **Smart Contract**: GreenToken.sol contract for token balance queries and transactions

### Development Tools
- **Replit Integration**: Vite plugins for development environment and error handling
- **TypeScript Compiler**: Strict type checking across client, server, and shared code
- **Build Tools**: Vite for frontend bundling, esbuild for server-side compilation

### UI Component Libraries
- **Radix UI**: Headless component primitives for accessibility and customization
- **Lucide React**: Icon library for consistent iconography
- **Embla Carousel**: Touch-friendly carousel component for UI interactions