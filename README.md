# Newsdeck 📰

A real-time news dashboard application with TweetDeck-style columns and persistent data storage. Perfect for monitoring multiple news sources, workflows, and data streams in a single, organized interface.

[![CI](https://github.com/markussandin1/Newsdeck/actions/workflows/ci.yml/badge.svg)](https://github.com/markussandin1/Newsdeck/actions/workflows/ci.yml)
[![Deploy](https://github.com/markussandin1/Newsdeck/actions/workflows/deploy.yml/badge.svg)](https://github.com/markussandin1/Newsdeck/actions/workflows/deploy.yml)

## ✨ Features

- **📊 Dashboard Management**: Create and organize multiple dashboards
- **📑 Column-based Layout**: TweetDeck-style columns for organized content viewing
- **⚡ Real-time Updates**: Auto-refresh every 5 seconds for live data
- **💾 Persistent Storage**: Vercel KV (Redis) or Upstash Redis for reliable data persistence
- **🔧 Admin Interface**: Easy-to-use admin panel for data management
- **🌐 API Integration**: RESTful API for external workflow integration
- **📱 Responsive Design**: Works on desktop and mobile devices
- **🎯 Workflow Ready**: Designed for n8n, Zapier, and custom API integrations

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Vercel account (for deployment)

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

4. **Open in browser:**
   - Application: http://localhost:3000
   - Admin panel: http://localhost:3000/admin

### Deployment to Vercel

See the complete deployment guide in [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step instructions.

**Note:** Vercel KV is now available through the [Vercel Marketplace](https://vercel.com/marketplace/category/storage). Alternative storage options like Upstash Redis, PlanetScale, and Supabase are also supported.

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
├── app/                    # Next.js 15 App Router
│   ├── api/               # API routes
│   │   ├── columns/       # Column management
│   │   └── dashboards/    # Dashboard management
│   ├── admin/             # Admin interface
│   └── dashboard/         # Dashboard views
├── components/            # React components
├── lib/                   # Utilities and database
│   ├── db-persistent.ts   # Vercel KV integration
│   ├── db.ts              # Database interface
│   └── types.ts           # TypeScript definitions
└── .github/               # GitHub workflows and templates
```

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: TailwindCSS, PostCSS
- **Database**: Vercel KV/Upstash Redis with in-memory fallback
- **Deployment**: Vercel with GitHub Actions
- **API**: REST endpoints for external integrations

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
# Vercel KV Database (optional for local development)
KV_REST_API_URL=your_kv_rest_api_url
KV_REST_API_TOKEN=your_kv_rest_api_token
```

Without these variables, the app uses in-memory storage for development.

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

### Current (POC/MVP)
- ✅ Basic dashboard and column management
- ✅ Vercel KV persistence
- ✅ Admin interface
- ✅ API endpoints for external integration

### Future Enhancements
- 🔐 User authentication and authorization
- 🏢 Multi-tenant support
- 📊 Analytics and reporting
- 🎨 Custom themes and layouts
- 🔄 Real-time WebSocket updates
- 📱 Mobile app
- ☁️ GCP migration (Cloud SQL, Firebase Auth)

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

**Built with ❤️ using Next.js 15 and deployed on Vercel**
