#!/bin/bash

echo "\uD83D\uDE80 Deploying Blog Platform Journaling App..."

# Deploy backend
echo "\uD83D\uDCE6 Deploying backend..."
cd backend
vercel --prod --yes

# Deploy frontend
echo "\uD83C\uDF10 Deploying frontend..."
cd ..
vercel --prod --yes

echo "\u2705 Deployment complete!"
echo "\uD83D\uDD17 Frontend: https://your-app.vercel.app"
echo "\uD83D\uDD17 Backend: https://blog-platform-backend.vercel.app"
