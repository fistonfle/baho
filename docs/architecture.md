# Baho architecture overview

## High-level flow

```text
User device
  ├── Frontend (React + TypeScript)
  │     ├── onboarding
  │     ├── dashboard
  │     ├── audio lessons
  │     ├── reminders
  │     └── offline cache
  ├── REST API (Express)
  │     ├── auth endpoints
  │     ├── education content endpoints
  │     ├── FAQ endpoints
  │     └── admin/content review endpoints
  └── PostgreSQL database
        ├── users
        ├── categories
        ├── content
        ├── reminders
        ├── progress
        └── issues
```

## Design principles

- Kinyarwanda-first content
- Preventive and low-literacy friendly information
- Personalized recommendations based on user interests
- Offline-first experience for weak connectivity environments
- Simple and demonstrable MVP architecture

## Deployment plan

- Frontend: static deployment or Vite production build
- Backend: Node/Express on a small web server or container
- Database: PostgreSQL service
- Media: local asset hosting or cloud storage when needed
