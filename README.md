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

Copy `.env.example` to `.env` and configure your **solar-control** connection:

```bash
cp .env.example .env
# Then edit .env with your actual values
```

Example `.env` configuration:

```bash
# Solar Control API Configuration
VITE_SOLAR_CONTROL_URL=http://localhost:8015
VITE_SOLAR_CONTROL_API_KEY=your-solar-control-api-key
```

**Important Notes:**
- The `VITE_` prefix is **required** by Vite to expose these variables to the browser
- Point these to your **solar-control** instance, NOT individual solar-host servers
- `solar-control` acts as the gateway to all your solar-host instances

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

