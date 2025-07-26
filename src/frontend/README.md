# SPIDERMAN Frontend

🕷️ Modern React-based frontend for the SPIDERMAN gambling site account finder system. Built with React 19, TypeScript, and TailwindCSS.

## 🚀 Features

- 📊 **Interactive Network Graph**: Visualize relationships between accounts and gambling sites
- 🎛️ **Real-time Dashboard**: Monitor crawling tasks and system health
- 📈 **Advanced Filtering**: Filter entities by type, bank, priority score, and more
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- 🎨 **Modern UI**: Built with Radix UI components and TailwindCSS
- 🌙 **Dark/Light Mode**: Theme switching support
- 📋 **Report Generation**: Generate and download PDF reports

## 🛠️ Tech Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 7.0
- **Styling**: TailwindCSS 4.1 + CSS-in-JS
- **UI Components**: Radix UI primitives
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router DOM 7
- **Data Visualization**: D3.js
- **HTTP Client**: Fetch API with TanStack Query
- **Notifications**: Sonner
- **Icons**: Lucide React

## 📁 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── bars/            # Navigation and sidebars
│   ├── reports/         # Report generation components
│   ├── ui/              # Base UI components (Radix + shadcn/ui)
│   └── views/           # Complex view components
├── features/            # Feature-specific components
│   └── network/         # Network graph features
├── hooks/               # Custom React hooks
├── lib/                 # Utilities and configurations
│   ├── api/             # API clients and types
│   ├── contexts/        # React contexts
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Helper functions
├── pages/               # Page components
└── main.tsx             # App entry point
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn/bun
- Backend API running on `http://localhost:8000`

### Installation

1. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   bun install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API endpoint
   ```

3. **Start development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   bun dev
   ```

4. **Open application**
   - Development: http://localhost:5173
   - Production build: `npm run build && npm run preview`

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_NAME=SPIDERMAN
VITE_APP_VERSION=1.0.0
```

### API Configuration

The frontend communicates with the backend API through:

```typescript
// src/lib/config.ts
export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 30000,
  retries: 3
}
```

## 📊 Key Components

### Network Graph
- **Location**: `src/components/views/network-graph-view.tsx`
- **Purpose**: Interactive D3.js-powered network visualization
- **Features**: Zoom, pan, node filtering, relationship highlighting

### Dashboard
- **Location**: `src/features/network/network-dashboard.tsx`
- **Purpose**: Real-time monitoring and task management
- **Features**: Task progress, system health, quick actions

### Filter System
- **Location**: `src/components/ui/multi-select-filter.tsx`
- **Purpose**: Advanced entity filtering capabilities
- **Features**: Multi-select, search, category grouping

## 🎨 Styling

### TailwindCSS Configuration

The project uses TailwindCSS 4.1 with custom configurations:

```javascript
// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        // ... custom color palette
      }
    }
  }
}
```

### Component Library

Built with shadcn/ui components for consistency:

```bash
# Add new shadcn/ui components
npx shadcn@latest add [component-name]
```

## 🔄 State Management

### TanStack Query Setup

```typescript
// src/lib/query-client.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 3,
      refetchOnWindowFocus: false
    }
  }
})
```

### API Integration

```typescript
// Example API hook
export const useNetworkGraph = (filters?: GraphFilters) => {
  return useQuery({
    queryKey: ['network-graph', filters],
    queryFn: () => graphApi.getEntities(filters),
    enabled: !!filters
  })
}
```

## 🧪 Development

### Available Scripts

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks

# Testing (when configured)
npm run test         # Run unit tests
npm run test:e2e     # Run end-to-end tests
```

### Code Quality

```bash
# Linting
npm run lint
npm run lint:fix

# Type checking
npm run type-check

# Format code
npm run format
```

### Development Workflow

1. **Component Development**: Use Storybook for isolated component development
2. **API Integration**: Use React Query dev tools for debugging
3. **Styling**: Use Tailwind CSS IntelliSense extension
4. **State Debugging**: React Developer Tools + TanStack Query devtools

## 📱 Responsive Design

The application is built mobile-first with responsive breakpoints:

- **Mobile**: 320px - 768px
- **Tablet**: 768px - 1024px  
- **Desktop**: 1024px+

### Key responsive features:
- Adaptive navigation (drawer on mobile, sidebar on desktop)
- Responsive data tables with horizontal scroll
- Mobile-optimized network graph interactions
- Touch-friendly UI components

## 🚀 Deployment

### Build for Production

```bash
# Create optimized build
npm run build

# Preview production build locally
npm run preview
```

### Environment-specific Builds

```bash
# Development build
NODE_ENV=development npm run build

# Production build  
NODE_ENV=production npm run build
```

### Docker Deployment

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
```

## 🔍 Debugging

### Common Issues

1. **API Connection Issues**
   - Check `VITE_API_BASE_URL` environment variable
   - Verify backend is running on correct port
   - Check browser network tab for CORS issues

2. **Build Issues**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Clear Vite cache: `npx vite --force`
   - Check TypeScript errors: `npm run type-check`

3. **Styling Issues**
   - Verify TailwindCSS classes are being generated
   - Check for CSS conflicts in browser dev tools
   - Ensure PostCSS configuration is correct

### Performance Optimization

- **Code Splitting**: Components are lazy-loaded where appropriate
- **Bundle Analysis**: Use `npm run build:analyze` to inspect bundle size
- **Image Optimization**: SVG icons and optimized assets
- **Caching**: Aggressive caching with TanStack Query

## 🤝 Contributing

1. Follow the existing code style and patterns
2. Use TypeScript strictly (no `any` types)
3. Write responsive, accessible components
4. Test components in isolation when possible
5. Update documentation for new features

### Component Development Guidelines

```typescript
// Example component structure
interface ComponentProps {
  required: string
  optional?: number
  children?: React.ReactNode
}

export const Component: React.FC<ComponentProps> = ({
  required,
  optional = 0,
  children
}) => {
  return (
    <div className="component-root">
      {/* Component implementation */}
    </div>
  )
}
```

## 📄 License

Part of the SPIDERMAN project - MIT License

---

Made with ⚛️ React and ❤️ for financial crime prevention
