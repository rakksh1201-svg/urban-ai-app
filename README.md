# ENVIQ AI - Environmental Intelligence for South India

A modern web application built with React, TypeScript, and Vite for environmental monitoring and IoT sensor management.

## Features

- Real-time environmental monitoring
- AI-powered chatbot assistance
- IoT sensor integration
- Dashboard for data visualization
- Mobile-responsive design
- Progressive Web App (PWA) support

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:8080`

### Building

```bash
npm run build
```

### Testing

```bash
npm run test      # Run tests once
npm run test:watch # Watch mode
```

## Project Structure

- `/src` - Source code
  - `/components` - React components
  - `/pages` - Page components
  - `/integrations` - External service integrations (Supabase, etc.)
  - `/hooks` - Custom React hooks
  - `/lib` - Utility functions
  - `/data` - Static data

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Components**: Shadcn/ui, Radix UI
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **State Management**: React Query
- **Forms**: React Hook Form
- **Charts**: Recharts
- **PWA**: vite-plugin-pwa

## Supabase Setup

This project uses Supabase for backend services. Configure your Supabase credentials in `/src/integrations/supabase/client.ts`.

## License

MIT
