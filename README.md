# Newsdeck 📰

A real-time news dashboard application with TweetDeck-style columns and persistent data storage. Perfect for monitoring multiple news sources, workflows, and data streams in a single, organized interface.

[![CI](https://github.com/markussandin1/Newsdeck/actions/workflows/ci.yml/badge.svg)](https://github.com/markussandin1/Newsdeck/actions/workflows/ci.yml)
[![Deploy](https://github.com/markussandin1/Newsdeck/actions/workflows/deploy.yml/badge.svg)](https://github.com/markussandin1/Newsdeck/actions/workflows/deploy.yml)

## ✨ Features

- **📊 Dashboard Management**: Create and organize multiple dashboards
- **📑 Column-based Layout**: TweetDeck-style columns for organized content viewing
- **⚡ Real-time Updates**: Server-Sent Events (SSE) for instant live updates
- **💾 Persistent Storage**: PostgreSQL on Google Cloud SQL for reliable data persistence
- **🔧 Admin Interface**: Easy-to-use admin panel for data management
- **🌐 API Integration**: RESTful API for external workflow integration
- **📱 Responsive Design**: Works on desktop and mobile devices
- **🎯 Workflow Ready**: Designed for n8n, Zapier, and custom API integrations
- **🔍 API Logging**: Built-in request logging for debugging and monitoring

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Google Cloud account (for deployment)
- PostgreSQL database (Google Cloud SQL recommended)

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/markussandin1/Newsdeck.git
   cd Newsdeck
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your DATABASE_URL
   ```

5. **Open in browser:**
   - Application: http://localhost:3000
   - Admin panel: http://localhost:3000/admin
   - API Logs: http://localhost:3000/admin/api-logs

### Deployment to Google Cloud

The application is deployed on Google Cloud Run with Cloud SQL (PostgreSQL) for data persistence.

See the complete deployment guide in [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step instructions.

## 📋 API Documentation

### Create a Column
```bash
POST /api/columns
Content-Type: application/json

{
  "title": "Breaking News",
  "description": "Latest breaking news updates"
}
```

### Add Data to Column
```bash
POST /api/columns/{column-id}
Content-Type: application/json

[
  {
    "id": "news-001",
    "title": "Breaking News Title",
    "description": "News description...",
    "source": "workflows",
    "timestamp": "2025-01-01T00:00:00.000Z",
    "newsValue": 5,
    "category": "breaking",
    "severity": "high",
    "location": {
      "municipality": "Stockholm",
      "county": "Stockholm"
    }
  }
]
```

### Get Column Data
```bash
GET /api/columns/{column-id}
```

### List All Columns
```bash
GET /api/columns
```

## 🏗️ Architecture

```
├── app/                      # Next.js 15 App Router
│   ├── api/                 # API routes
│   │   ├── columns/         # Column management
│   │   ├── dashboards/      # Dashboard management
│   │   ├── workflows/       # Workflow ingestion endpoint
│   │   └── admin/           # Admin API endpoints
│   ├── admin/               # Admin interface
│   │   ├── page.tsx         # Main admin panel
│   │   └── api-logs/        # API request logs viewer
│   └── dashboard/           # Dashboard views
├── components/              # React components
├── lib/                     # Utilities and database
│   ├── db-postgresql.ts     # PostgreSQL integration
│   ├── db.ts                # Database interface
│   ├── events.ts            # Server-Sent Events
│   └── types.ts             # TypeScript definitions
├── migrations/              # Database migrations
└── .github/                 # GitHub workflows and templates
```

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: TailwindCSS, PostCSS
- **Database**: PostgreSQL (Google Cloud SQL)
- **Real-time**: Server-Sent Events (SSE)
- **Deployment**: Google Cloud Run with GitHub Actions CI/CD
- **Authentication**: NextAuth.js with Google OAuth
- **API**: REST endpoints for external integrations
- **Logging**: Built-in API request logging and monitoring

## 🔌 Workflow Integration

Newsdeck is designed to work seamlessly with workflow automation tools:

### n8n Integration
```javascript
// HTTP Request Node Configuration
URL: https://your-domain.vercel.app/api/columns/{your-column-id}
Method: POST
Headers: Content-Type: application/json
Body: {
  "id": "{{$json.id}}",
  "title": "{{$json.title}}",
  "description": "{{$json.description}}",
  "timestamp": "{{$json.timestamp}}",
  "newsValue": {{$json.newsValue}},
  "category": "{{$json.category}}"
}
```

### Zapier Integration
Use Webhooks by Zapier to send POST requests to your column endpoints.

### Custom API Integration
Any system that can send HTTP POST requests can integrate with Newsdeck.

## 🏃‍♂️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Project Structure

- **Database Layer**: Abstracted through `lib/db.ts` for easy migration
- **API Routes**: RESTful endpoints in `app/api/`
- **Components**: Reusable React components in `components/`
- **Types**: Centralized TypeScript definitions in `lib/types.ts`

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Authentication (NextAuth.js)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# API Security
API_KEY=your-api-key-for-workflows

# Build Configuration (optional)
DOCKER_BUILD=false  # Set to true when building Docker images
```

### Database Migrations

Run migrations to set up the database schema:

```bash
# Run all migrations
npm run migrate

# Or run specific migration
DATABASE_URL="..." npx tsx scripts/run-migration.js migrations/001-*.sql
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Issue Templates

We provide templates for:
- 🐛 [Bug Reports](./.github/ISSUE_TEMPLATE/bug_report.md)
- ✨ [Feature Requests](./.github/ISSUE_TEMPLATE/feature_request.md)
- 🔌 [Workflow Integration Help](./.github/ISSUE_TEMPLATE/workflow_integration.md)

## 🗺️ Roadmap

### Current Features
- ✅ Dashboard and column management
- ✅ PostgreSQL persistence (Google Cloud SQL)
- ✅ Admin interface with API logging
- ✅ API endpoints for external integration
- ✅ Real-time updates via Server-Sent Events (SSE)
- ✅ Google OAuth authentication
- ✅ Request logging and debugging tools

### Future Enhancements
- 🏢 Multi-tenant support
- 📊 Advanced analytics and reporting
- 🎨 Custom themes and layouts
- 📱 Mobile app (React Native)
- 🔔 Push notifications
- 📈 Usage metrics and dashboards
- 🌍 Multi-region deployment

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

- 📖 **Documentation**: Check [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment help
- 🐛 **Bug Reports**: Use our [bug report template](./.github/ISSUE_TEMPLATE/bug_report.md)
- 💡 **Feature Requests**: Use our [feature request template](./.github/ISSUE_TEMPLATE/feature_request.md)
- 🔌 **Integration Help**: Use our [workflow integration template](./.github/ISSUE_TEMPLATE/workflow_integration.md)

## 🎯 Use Cases

- **News Monitoring**: Track multiple news sources and topics
- **Workflow Monitoring**: Monitor automation workflow outputs
- **Data Streaming**: Real-time data from APIs and webhooks  
- **Team Dashboards**: Shared dashboards for team collaboration
- **Event Tracking**: Monitor events from multiple systems

---

**Built with ❤️ using Next.js 15 and deployed on Google Cloud Run**
