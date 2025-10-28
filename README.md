# Recoverly

AI-powered recovery companion for orthopedic rehabilitation.

## Overview

Recoverly helps users manage pain and movement limitations through personalized exercise protocols, progress tracking, and adaptive recovery plans.

## Tech Stack

- **Frontend:** React Native + Expo (iOS-focused)
- **Backend:** Firebase (Auth, Firestore, Cloud Functions)
- **UI Components:** React Native Paper (Material Design 3)
- **State Management:** Zustand
- **Navigation:** Expo Router
- **Payment Processing:** Stripe (coming soon)
- **AI Integration:** OpenAI GPT-4 (via Cloud Functions)

## Getting Started

### Prerequisites

- Node.js (v20.19.4 or higher recommended)
- npm or yarn
- Xcode (for iOS development)
- Expo CLI

### Installation

1. Clone the repository:
```bash
git clone git@github.com:KellyStrad-X/Recoverly.git
cd Recoverly
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your Firebase and API keys
```

4. Start the development server:
```bash
npm start
# Press 'i' for iOS simulator
```

## Project Structure

```
recoverly-app/
├── app/                # Expo Router navigation
│   ├── (auth)/        # Authentication screens
│   ├── (tabs)/        # Main app tabs
│   └── _layout.tsx    # Root layout
├── src/
│   ├── components/    # Reusable UI components
│   ├── config/        # Firebase configuration
│   ├── stores/        # Zustand state stores
│   ├── services/      # API and business logic
│   ├── hooks/         # Custom React hooks
│   ├── types/         # TypeScript types
│   └── constants/     # App constants
└── assets/            # Images and static assets
```

## Features

### MVP (Current Development)

- [x] Project setup and configuration
- [x] Welcome screen with app overview
- [ ] User authentication (Email/Password, Google OAuth)
- [ ] AI-powered intake conversation
- [ ] Personalized exercise protocols
- [ ] Progress tracking with pain scores
- [ ] Session logging
- [ ] Subscription management (Stripe)

### Future Roadmap

- [ ] Dark mode support
- [ ] Android support
- [ ] Vision-based form assessment
- [ ] PT partner module
- [ ] Social features and accountability

## Development

### Available Scripts

- `npm start` - Start Expo development server
- `npm run ios` - Run on iOS simulator
- `npm run android` - Run on Android emulator
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Code Style

This project uses ESLint and Prettier for code quality and formatting. Configuration files are included in the project.

## Safety & Legal

**Important:** Recoverly provides general exercise guidance only and is not a medical device. Users should consult healthcare professionals for persistent pain or serious conditions.

## License

Proprietary - All rights reserved

## Contact

For questions or support, please contact the development team.

---

Built with ❤️ using React Native and Firebase