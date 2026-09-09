# Steganaliz v2.0 — Deployment Guide

## Prerequisites
- GitHub account (code pushed to a repo)
- MongoDB Atlas account (free)
- Render account (free tier or $7/mo Starter)
- Vercel account (free — already deployed for v1)

---

## Step 1 — MongoDB Atlas

1. Go to https://cloud.mongodb.com → **New Project** → name it `steganaliz`
2. **Build a Database** → **M0 Free** → choose a region close to your Render region
3. **Security → Database Access** → Add new user → username + strong password → **Read and Write**
4. **Security → Network Access** → Add IP Address → **Allow Access From Anywhere** (0.0.0.0/0)
5. **Deployment → Database** → Connect → **Drivers** → Node.js → copy the connection string

Connection string format: