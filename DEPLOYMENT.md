# AI Receptionist SaaS - Deployment Guide

## Quick Start (Development)

### 1. Set up Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Run the SQL in `supabase-schema.sql` in the SQL Editor
3. Enable the `vector` extension in Database > Extensions
4. Copy your project URL and anon key

### 2. Set up Environment Variables
```bash
cd aura-monorepo/apps/web
cp .env.example .env.local
```

Fill in your environment variables:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Vapi
VAPI_API_KEY=your-vapi-api-key
VAPI_WEBHOOK_SECRET=your-webhook-secret

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. Deploy Edge Function
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy the edge function
supabase functions deploy process-knowledge-base
```

### 4. Install Dependencies & Run
```bash
cd aura-monorepo
npm install
cd apps/web
npm run dev
```

## Production Deployment

### 1. Vercel Deployment
1. Push your code to GitHub
2. Connect your repo to Vercel
3. Add all environment variables in Vercel dashboard
4. Deploy!

### 2. Supabase Production
1. Upgrade to Pro plan for production features
2. Configure custom domain
3. Set up database backups
4. Configure RLS policies

### 3. Vapi Configuration
1. Set webhook URL to: `https://your-domain.com/api/vapi/webhooks`
2. Set function URL to: `https://your-domain.com/api/vapi/functions`
3. Configure webhook secret

## Core Features Implemented

✅ **Authentication**: Supabase Auth with RLS
✅ **Assistant Creation**: Full Vapi integration
✅ **Knowledge Base**: RAG with pgvector
✅ **Live Calls**: Webhook handlers
✅ **Function Calls**: searchKnowledgeBase, transferCall
✅ **Database Schema**: Complete with RLS policies
✅ **API Routes**: RESTful endpoints
✅ **Background Processing**: Edge functions

## Next Steps (Frontend)

1. **Authentication Pages**: Login/signup forms
2. **Dashboard**: Call analytics and logs
3. **Onboarding Wizard**: Step-by-step assistant setup
4. **Knowledge Management**: Upload and edit interface
5. **Q&A Management**: Add/edit specific answers
6. **Settings**: Business info and billing

## Architecture Benefits

- **Scalable**: Serverless architecture scales automatically
- **Secure**: Row-level security and proper auth
- **Fast**: Edge functions for real-time processing
- **Cost-effective**: Pay only for what you use
- **Maintainable**: Clean separation of concerns

## Performance Optimizations

- Vector search with proper indexing
- Background processing for embeddings
- Caching at multiple levels
- Edge deployment for low latency
- Efficient database queries with RLS

Ready to build the frontend? The backend foundation is solid! 🚀