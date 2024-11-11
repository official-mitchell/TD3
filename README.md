# Tactical Drone Defense Dashboard

## Project Overview

The **Tactical Drone Defense Dashboard** is a simulation of an autonomous drone defense system interface, designed to showcase real-time tracking, identification, and engagement of incoming drone threats. The dashboard is designed as a low Size, Weight, and Power (SWaP) system, ideal for integration into autonomous weapons platforms, and simulates the full "detect-track-identify-defeat" kill chain.

This dashboard represents a potential user interface for operators, utilizing real-time telemetry data to track drone activity, visually display status changes, and allow the operator to engage identified targets as they approach. Built with mobile functionality and a PWA setup, it is ideal for field use on mobile devices.

## Key Features

- **Real-Time Drone Tracking**: Drones are displayed on a map interface, with real-time data showing their location, heading, and status.
- **Kill Chain Simulation**: Drones progress through a simulated kill chain with statuses: **Detected**, **Identified**, **Confirmed**, and **Engagement Ready**.
- **Engagement Controls**: Operators can manually select targets, view drone details, and engage threats via a "FIRE" button, with visual feedback on each engagement.
- **Telemetry Data Visualization**: Real-time speed, altitude, and engagement data are visualized on the dashboard.
- **Offline Capability**: The application is a Progressive Web App (PWA) with offline caching and background sync for queued commands when offline.

## Tech Stack

### Frontend

- **[React](https://reactjs.org/)** + **[TypeScript](https://www.typescriptlang.org/)**: The core framework and language for building a responsive, type-safe user interface.
- **[Material UI](https://mui.com/)**: Provides a consistent design and rapid prototyping of components.
- **[Zustand](https://github.com/pmndrs/zustand)** + **[Immer.js](https://immerjs.github.io/immer/)**: State management for handling real-time updates from Websockets, using Immer.js for efficient, immutable state updates.
- **[Leaflet](https://leafletjs.com/)**: A map visualization library to display real-time drone locations and line of fire, ideal for a tactical interface.
- **[D3.js](https://d3js.org/)**: Used to create dynamic telemetry visualizations, such as speed and engagement status indicators.
- **[Socket.IO-client](https://socket.io/)**: Enables real-time, event-based messaging from the backend for telemetry updates, with automatic reconnection and fallback handling.

### Backend

- **[Node.js](https://nodejs.org/)** + **[Express](https://expressjs.com/)**: The server framework, handling HTTP requests and Websocket connections for real-time communication.
- **[Socket.IO](https://socket.io/)**: Powers Websocket connections, sending simulated drone telemetry data to the frontend.
- **[Morgan](https://github.com/expressjs/morgan)**: A request logger middleware for logging incoming requests, useful for monitoring and debugging.
- **[MongoDB Atlas](https://www.mongodb.com/cloud/atlas)** + **[Mongoose](https://mongoosejs.com/)**: Cloud-hosted, NoSQL database for storing telemetry logs, drone engagement records, and mission zone data, with Mongoose for schema validation.

### Infrastructure

- **[Docker](https://www.docker.com/)** + **Docker Compose**: Containerizes frontend, backend, and MongoDB services for consistent development and deployment environments.
- **[Kubernetes](https://kubernetes.io/)** (AWS EKS): Manages deployment, scaling, and service discovery, with autoscaling configured for the Websocket server.
- **AWS Services**:
  - **[AWS EKS](https://aws.amazon.com/eks/)**: Kubernetes orchestration for production deployment.
  - **[AWS S3](https://aws.amazon.com/s3/)** and **[CloudFront](https://aws.amazon.com/cloudfront/)**: Stores and delivers static assets with low latency.
  - **[MongoDB Atlas](https://www.mongodb.com/cloud/atlas)** (cloud-hosted) for database storage.

### PWA (Progressive Web App)

- **[Workbox](https://developers.google.com/web/tools/workbox)**: Manages service workers for offline caching, background sync, and a cache-first strategy for static assets. It uses IndexedDB to store telemetry logs, enabling offline retrieval.

## Installation and Setup

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/yourusername/tactical-drone-defense-dashboard.git
   cd tactical-drone-defense-dashboard
   ```

2. **Install Dependencies**:
   Run the following commands to install dependencies in both frontend and backend:

   ```bash
    npm install
    nx run frontend:install
    nx run backend:install
   ```

3. **Environment Variables**:
   Configure environment variables for MongoDB URI, Websocket URL, and any other necessary keys. Create .env files in the root of the frontend and backend.

4. **Run locally with Docker Compose**:
   This will start the frontend, backend, and MongoDB services in Docker containers.

   ```bash
   docker compose down -v
    docker compose up --build
   ```

5. **Run Frontend and Backend Separately**:
   Alternatively, you can run each service individually:
   ```bash
   # Run backend
   nx serve backend
   ```

## Usage

1. **Map Visualization**:

   - The map displays real-time drone data, showing the location of the weapons platform, line of fire, and incoming drones.
   - Drones cycle through statuses, progressing from **Detected** to **Engagement Ready** as they approach.

2. **Engagement and Control Panel**:

   - Use the "Next" and "Previous" buttons to cycle between confirmed targets.
   - The "FIRE" button becomes active when a target is **Engagement Ready**, allowing the operator to neutralize threats.

3. **Telemetry Visualizations**:

   - D3.js-powered indicators provide real-time feedback on drone speed, altitude, and engagement status, updating continuously as data arrives from the backend.

4. **Offline and Background Sync**:
   - When offline, the application continues to display cached data and queues commands (such as "FIRE") until the connection is restored, then synchronizes commands.

---

## Deployment

### Frontend Deployment with Vercel

The frontend is deployed on **Vercel**, utilizing continuous deployment from GitHub:

1. Connect your GitHub repo to Vercel.
2. Set the **Root Directory** to `apps/frontend` and configure the **Build Command**.
3. Add necessary environment variables for backend URLs.

### Backend Deployment with Render

The backend is deployed on **Render** with Websockets:

1. Connect the GitHub repo to Render.
2. Set the **Root Directory** to `apps/backend` and configure build and start commands.
3. Add environment variables for MongoDB, Websockets, and other required configurations.

### MongoDB Atlas Integration

MongoDB Atlas hosts the database, accessible by both frontend and backend. Ensure MongoDB URI is set as an environment variable in both Vercel and Render.

---

## Future Enhancements

- **AI-Based Target Prioritization**: Add AI logic to prioritize high-threat targets based on speed, altitude, and threat level.
- **Expanded Offline Features**: Increase offline capabilities with enhanced data caching and logging.
- **Detailed Engagement Analytics**: Provide operator feedback on kill rate, response time, and effectiveness based on historical telemetry data.
- **Extended Map Features**: Include terrain data or simulate environmental factors affecting drone engagement.
