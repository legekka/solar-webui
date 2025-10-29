# Solar WebUI

A modern React dashboard for managing distributed llama.cpp deployments through solar-host and solar-control.

## Preview

### Real-Time Routing Visualization
Watch your API requests flow through the system in real-time with an interactive network graph.

![Live Routing Graph](preview_live_routing.png)

### Dashboard & Instance Management
Manage all your hosts and llama.cpp instances from a beautiful, unified interface.

![Dashboard View](preview_dashboard.png)

## Features

- **Real-time routing visualization** - Interactive network graph showing API request flow
- **Dashboard view** - Manage all solar-hosts and llama.cpp instances
- **Live log streaming** - Real-time WebSocket log viewer for each instance
- **Instance management** - Start, stop, restart, create, edit, and delete instances
- **Host management** - Add, remove, and monitor solar-host connections
- **Nord dark theme** - Beautiful arctic-inspired color scheme
- **Modern UI** - Built with React, TypeScript, Vite, and Tailwind CSS

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

## Production Deployment

### Option 1: Docker (Recommended)

**Quick Start:**

```bash
# Create .env file
cp .env.example .env
# Edit .env with your production values

# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

**Docker Environment Variables:**

Create a `.env` file with:

```bash
# Solar Control URL - use host.docker.internal if solar-control is on the host
VITE_SOLAR_CONTROL_URL=http://host.docker.internal:8015

# Solar Control API Key
VITE_SOLAR_CONTROL_API_KEY=your-solar-control-api-key

# Optional: Change the port (default: 5173)
PORT=5173
```

**Important Docker Notes:**

- The webui will be accessible on `http://localhost:5173` (or your custom PORT)
- Uses `host.docker.internal` to access solar-control running on the host machine
- Environment variables are baked into the build at container startup
- Rebuild the image if you change API endpoints: `docker-compose up -d --build`

### Option 2: Build for Production (Native)

```bash
npm run build
```

This creates optimized static files in the `dist/` directory.

### Option 3: Serve in Production (Native)

**Using the built-in server (recommended for quick deployment)**

```bash
npm run serve
```

This serves the production build on `http://0.0.0.0:5173`

**Using a dedicated static file server:**

Install `serve` globally:
```bash
npm install -g serve
serve -s dist -p 5173
```

**Using nginx:**

Point nginx to the `dist/` directory:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/solar-webui/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Option 4: Deploy to Cloud Platforms

The `dist/` folder can be deployed to:
- **Vercel**: `vercel --prod`
- **Netlify**: `netlify deploy --prod`
- **GitHub Pages**
- **AWS S3 + CloudFront**
- Any static hosting service

### Important Notes for All Deployment Methods

- ⚠️ Environment variables are embedded at **build time** (Vite requirement)
- Make sure your `.env` file has production URLs before building
- For Docker: Rebuild the image if you change API endpoints (`docker-compose up -d --build`)
- For native: Re-run `npm run build` if you change `.env` values

## Project Structure

```
src/
├── main.tsx                    # Entry point
├── App.tsx                     # Main app with routing and navigation
├── index.css                   # Global styles with Nord theme
├── api/
│   ├── client.ts               # Axios client configuration
│   └── types.ts                # TypeScript type definitions
├── components/
│   ├── RoutingGraph.tsx        # Real-time routing visualization
│   ├── Dashboard.tsx           # Hosts & instances dashboard
│   ├── HostCard.tsx            # Host display card
│   ├── InstanceCard.tsx        # Instance display card
│   ├── LogViewer.tsx           # Real-time log viewer modal
│   ├── AddHostModal.tsx        # Add host modal
│   ├── AddInstanceModal.tsx    # Create instance modal
│   └── EditInstanceModal.tsx   # Edit instance modal
├── hooks/
│   ├── useWebSocket.ts         # WebSocket management hook
│   ├── useInstances.ts         # Instance data management hook
│   ├── useHostStatus.ts        # Real-time host status updates
│   └── useRoutingEvents.ts     # Routing event stream handler
└── lib/
    └── utils.ts                # Utility functions (Nord theme helpers)
```

## Usage

1. **Configure** your solar-control API endpoint and key in `.env`
2. **Navigate** to the Routing page (default view) to monitor request flow
3. **Add Hosts** through the "Hosts & Instances" page
4. **Manage Instances** - Create, start, stop, edit, or delete llama-server instances
5. **View Logs** - Click the log icon on any instance for real-time output
6. **Monitor Performance** - Watch the routing graph to see load distribution

## Technology Stack

- **React 18** - Modern UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework with Nord theme
- **React Flow** - Interactive node-based graphs for routing visualization
- **Axios** - HTTP client for API communication
- **Lucide Icons** - Beautiful icon library
- **Zustand** - Lightweight state management

