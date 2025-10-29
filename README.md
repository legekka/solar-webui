# Solar WebUI

A modern React dashboard for managing distributed llama.cpp deployments through solar-host and solar-control.

## Features

- Dashboard view of all solar-hosts and instances
- Real-time log streaming via WebSocket
- Instance management (start, stop, restart, create, delete)
- Host management (add, remove, test connectivity)
- OpenAI API testing interface
- Modern UI with Tailwind CSS

## Installation

```bash
# Install dependencies
npm install
```

## Configuration

Create a `.env` file:

```bash
VITE_API_URL=http://localhost:8000
VITE_API_KEY=your-gateway-api-key
```

## Development

```bash
# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

## Building for Production

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── main.tsx              # Entry point
├── App.tsx               # Main application component
├── index.css             # Global styles with Tailwind
├── api/
│   ├── client.ts         # Axios client configuration
│   └── types.ts          # TypeScript type definitions
├── components/
│   ├── Dashboard.tsx     # Main dashboard
│   ├── HostCard.tsx      # Host display card
│   ├── InstanceCard.tsx  # Instance display card
│   ├── LogViewer.tsx     # Real-time log viewer
│   ├── AddHostModal.tsx  # Add host modal
│   └── CreateInstanceModal.tsx  # Create instance modal
├── hooks/
│   ├── useWebSocket.ts   # WebSocket management hook
│   └── useInstances.ts   # Instance data management hook
└── lib/
    └── utils.ts          # Utility functions
```

## Usage

1. Configure your solar-control API endpoint and key
2. Add solar-hosts through the "Add Host" button
3. Create and manage llama-server instances
4. View real-time logs from running instances
5. Test the OpenAI-compatible API gateway

## Technology Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Axios
- Lucide Icons

