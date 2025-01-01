from flask import Flask, request, jsonify
from PyPDF2 import PdfReader
from langchain.text_splitter import RecursiveCharacterTextSplitter
import os
from langchain_google_genai import GoogleGenerativeAIEmbeddings
import google.generativeai as genai
from langchain_community.vectorstores.faiss import FAISS
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.chains.question_answering import load_qa_chain
from langchain.prompts import PromptTemplate
from dotenv import load_dotenv
from werkzeug.utils import secure_filename

load_dotenv()
os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

from flask_cors import CORS

app = Flask(__name__)

CORS(app, 
     resources={r"/*": {
         "origins": ["http://localhost:3000"],
         "methods": ["GET", "POST", "OPTIONS"],
         "allow_headers": ["Content-Type", "Accept"],
         "expose_headers": ["Content-Type"],
         "max_age": 3600,
     }})

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'pdf'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_pdf_text(pdf_files):
    text = ""
    for pdf_path in pdf_files:
        try:
            pdf_reader = PdfReader(pdf_path)
            for page in pdf_reader.pages:
                text += page.extract_text()
        except Exception as e:
            raise Exception(f"Error processing file {pdf_path}: {str(e)}")
    return text

def get_text_chunks(text):
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    chunks = text_splitter.split_text(text)
    return chunks

def get_vector_store(text_chunks):
    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
    vector_store = FAISS.from_texts(text_chunks, embedding=embeddings)
    vector_store.save_local("faiss_index")

def get_conversational_chain():
    prompt_template = """
    Answer the following question in a concise and informative manner, drawing inferences and making reasonable assumptions based on the information presented within the PDFs:\n\n
    If the answer cannot be directly found within the provided PDFs:\n
    1. Analyze the provided information to identify relevant concepts, trends, and relationships. \n
    2. Use your understanding of these elements to generate a plausible and well-supported answer. \n
    3. Clearly state any assumptions made in arriving at the answer. \n
    Context:\n {context}?\n
    Question: \n{question}\n
    Answer:
    """
    
    model = ChatGoogleGenerativeAI(model="gemini-pro", temperature=0.3)
    prompt = PromptTemplate(template=prompt_template, input_variables=["context", "question"])
    chain = load_qa_chain(model, chain_type="stuff", prompt=prompt)
    
    return chain

def process_question(user_question):
    embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
    
    if not os.path.exists("faiss_index"):
        raise Exception("FAISS index not found. Please process PDF files first.")
    
    try:
        new_db = FAISS.load_local("faiss_index", embeddings, allow_dangerous_deserialization=True)
        docs = new_db.similarity_search(user_question)
    except ValueError as e:
        raise Exception(f"Error loading FAISS index: {str(e)}")

    chain = get_conversational_chain()

    try:
        response = chain({"input_documents": docs, "question": user_question}, return_only_outputs=True)
        return response["output_text"]
    except Exception as e:
        raise Exception(f"Error generating response: {str(e)}")

@app.route('/upload', methods=['POST', 'OPTIONS'])
def upload_files():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'CORS preflight response'}), 200

    if 'files' not in request.files:
        return jsonify({'error': 'No files provided'}), 400
    
    files = request.files.getlist('files')
    if not files or files[0].filename == '':
        return jsonify({'error': 'No files selected'}), 400

    saved_files = []
    try:
        for file in files:
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(filepath)
                saved_files.append(filepath)

        raw_text = get_pdf_text(saved_files)
        if not raw_text:
            return jsonify({'error': 'No text extracted from PDF files'}), 400

        text_chunks = get_text_chunks(raw_text)
        get_vector_store(text_chunks)

        for filepath in saved_files:
            os.remove(filepath)

        return jsonify({'message': 'Files processed successfully'}), 200

    except Exception as e:
        for filepath in saved_files:
            if os.path.exists(filepath):
                os.remove(filepath)
        return jsonify({'error': str(e)}), 500

@app.route('/ask', methods=['POST'])
def ask_question():
    data = request.get_json()
    if not data or 'question' not in data:
        return jsonify({'error': 'No question provided'}), 400

    try:
        answer = process_question(data['question'])
        return jsonify({'answer': answer}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)