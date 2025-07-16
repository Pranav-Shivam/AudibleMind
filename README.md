# AudibleMind - AI-Powered Document Analysis

A comprehensive document analysis platform that combines PDF processing with AI-powered conversations and educational interactions.

## Features

### Document Processing
- Upload PDF documents and extract content
- Automatic chunking of documents into manageable sections
- Intelligent paragraph extraction and processing

### AI Conversation System
- **Interactive Chat Interface**: Click on any document chunk to start an AI-powered conversation
- **Multi-Persona Learning**: Engage with AI personas including:
  - **Pranav**: Expert explainer providing layered explanations
  - **Shivam**: Beginner learner asking basic questions
  - **Prem**: Advanced learner asking deep technical questions
- **Flexible LLM Support**: Choose between local Ollama models or OpenAI
- **Customizable Conversations**: Set custom descriptions and questions for each persona

### Chat Integration
- **Chunk-to-Chat Flow**: Click any document chunk to open the chat interface
- **Pre-filled Content**: Chunk content automatically populates the conversation input
- **Modal Interface**: Clean, focused chat experience in a modal overlay
- **Export Capabilities**: Export conversations as markdown for documentation

## Technology Stack

### Backend
- **FastAPI**: High-performance web framework
- **CouchDB**: Document storage and retrieval
- **Ollama**: Local LLM integration
- **OpenAI API**: Cloud-based LLM support

### Frontend
- **React**: Modern UI framework
- **Vite**: Fast build tool
- **Tailwind CSS**: Utility-first styling
- **React Router**: Client-side routing

## Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- CouchDB
- Ollama (for local LLM support)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd AudibleMind
   ```

2. **Backend Setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   python main.py
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

### Usage

1. **Upload a Document**: Navigate to the home page and upload a PDF
2. **View Chunks**: The document will be processed into chunks
3. **Start Conversations**: Click on any chunk to open the AI conversation interface
4. **Customize**: Adjust LLM settings, personas, and questions as needed
5. **Export**: Save conversations as markdown for future reference

## API Endpoints

### Document Processing
- `POST /api/v1/upload` - Upload and process documents
- `GET /api/v1/document/{id}/chunks` - Retrieve document chunks

### Chat System
- `POST /api/v1/generate-conversation` - Generate AI conversations

## Configuration

### Environment Variables
- `OPENAI_API_KEY`: OpenAI API key for cloud LLM support
- `COUCHDB_URL`: CouchDB connection string
- `OLLAMA_BASE_URL`: Ollama server URL (default: http://localhost:11434)

### LLM Models
- **Local Models**: LLaMA3, DeepSeek, and other Ollama models
- **Cloud Models**: GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.