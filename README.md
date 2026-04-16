# Kernal - When AI Gets Stuck, Humans Step In

A modern landing page for Kernal, a platform that connects AI builders with human solvers when AI encounters tasks it can't handle.

## 🚀 Features

- **Hero Section**: Bold messaging with clear CTAs
- **Three Steps to Resolution**: Visual explanation of the platform workflow
- **For Builders & Solvers**: Dual value propositions with benefits
- **Integration Example**: Code snippet showing how easy it is to integrate
- **Recent Bounties**: Showcase of active bounties with pricing
- **Footer CTA**: Email signup for users to stay connected
- **Fully Responsive**: Mobile-friendly design

## 🛠️ Tech Stack

- **Frontend**: React 18
- **Styling**: Tailwind CSS
- **Build Tool**: Create React App

## 📁 Project Structure

```
/app/
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js          # Main landing page component
│   │   ├── App.css         # Component styles
│   │   ├── index.js        # React entry point
│   │   └── index.css       # Global styles with Tailwind
│   ├── package.json
│   ├── tailwind.config.js
│   └── postcss.config.js
└── README.md
```

## 🎨 Design Features

- **Bold Typography**: Large, impactful headlines
- **Black & White Color Scheme**: Clean, professional aesthetic
- **Clear Hierarchy**: Easy-to-scan sections
- **Interactive Elements**: Hover states on buttons and cards
- **Accessibility**: Proper test IDs for all interactive elements

## 🔧 Development

The application is configured to run via Supervisor:

```bash
# Check service status
sudo supervisorctl status

# Restart frontend
sudo supervisorctl restart frontend
```

Frontend runs on port 3000 and is accessible via the preview URL.

## 📝 Sections Overview

1. **Header**: Navigation with logo and menu items (Builders, Solvers, Pricing, Docs)
2. **Hero**: Main value proposition with dual CTAs
3. **Three Steps**: AI Hit a Wall → Escalate Instantly → Problem Solved
4. **For Builders/Solvers**: Split section showing benefits for each user type
5. **Integration**: Code example showing SDK usage
6. **Recent Bounties**: List of active bounties with prices ($20, $120, $40)
7. **Footer CTA**: Newsletter signup
8. **Footer**: Company info and links

## ⚡ Quick Start

The application is already configured and running. All buttons are placeholders as requested.

## 📄 License

© 2025 Kernal. All rights reserved.
