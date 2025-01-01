# q-a-multiple-pdf

This project allows users to upload PDF files and interact with them via a question-answering chatbot interface using Nextjs. The chatbot processes the content of the manuals and provides AI-generated responses to user queries.

## Quick Start

### 1. Clone the Repository
Clone the project repository to your local machine:

```bash
git clone https://github.com/yourusername/q-a-multiple-pdf.git
cd q-a-multiple-pdf
```
### 2. Set Up a Virtual Environment
Create and activate a virtual environment for the project:
For Linux/macOS
```
python -m venv venv
source venv/bin/activate
```


 For Windows
```
conda create -p venv python == 3.10
conda activate .\venv\
```

### 3. Install Dependencies
Install the required Python packages from the requirements.txt file:
```
pip install -r requirements.txt
```


### 4. Add API Key in .env
Create a .env file and add your Google API key to it:
```
GOOGLE_API_KEY=your-google-api-key-here
```

### 5. Run the Application
Start the backend:
```
python app.py
```

### 6. Run the web app
Start the backend:
```
cd client
npm run dev
```
