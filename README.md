# 📝 AI Notes App

AI Notes App is a modern note-taking application that integrates AI-powered features to enhance productivity. It allows users to create, edit, and organize notes with intelligent suggestions, AI chat, and more.

## ✨ Features

- **🖋️ Create and Edit Notes**: A rich text editor with formatting options.
- **🤖 AI Suggestions**: Get intelligent suggestions while writing.
- **💬 AI Chat**: Integrated chat for assistance and answers.
- **🖼️ Cover Images**: Add and adjust cover images for notes.
- **📄 Export to PDF**: Export notes as PDF files.
- **🔗 Link Management**: Insert and manage links within notes.
- **🗄️ SQLite Database**: Persistent storage for notes.
- **🖥️ Electron Integration**: Desktop application with Electron.

## ⚙️ Setup Instructions

### Prerequisites

- 🟢 **Node.js** (v16 or higher)
- 🟢 **npm** or **yarn**
- 🟢 **Electron** (installed globally)

### 🚀 Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-repo/ai-notes-app.git
   cd ai-notes-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up the environment**:
   - Create a `.env` file in the `frontend` directory.
   - Add your Gemini API key:
     ```properties
     VITE_GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
     ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Start the Electron app**:
   ```bash
   npm run electron
   ```

## 📂 Project Structure

```
frontend/
├── src/
│   ├── components/       # 🧩 React components
│   ├── utils/            # 🛠️ Utility functions
│   ├── types.ts          # 🗂️ TypeScript types
│   ├── App.tsx           # 🏠 Main application component
│   ├── main.tsx          # 🚪 React entry point
│   ├── main.js           # ⚡ Electron main process
│   ├── preload.js        # 🔒 Electron preload script
│   ├── gemini.ts         # 🤖 AI integration
│   └── index.html        # 🌐 HTML entry point
├── tailwind.config.js    # 🎨 Tailwind CSS configuration
├── vite.config.ts        # ⚙️ Vite configuration
├── tsconfig.json         # 🛠️ TypeScript configuration
├── package.json          # 📦 Project dependencies and scripts
└── README.md             # 📖 Project documentation
```

## 🔮 Future Plans

- **🛠️ Component Refactoring**: Separate the codebase into smaller, reusable components to improve maintainability.
- **🌟 Enhanced Features**:
  - Add support for **tables**, **images**, and **videos** in notes.
  - Implement **advanced search** and **filtering options**.
  - Introduce **collaborative editing** features.
- **🎨 UI Improvements**:
  - Add **themes** and **customization options**.
  - Improve **accessibility** and **responsiveness**.
- **🗄️ Database Enhancements**:
  - Add support for **multiple tables** and **relationships**.
  - Implement **data backup** and **restore functionality**.

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## 📜 License

This project is licensed under the MIT License. See the `LICENSE` file for details.
