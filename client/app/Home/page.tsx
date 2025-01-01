"use client";
import { useState, useRef, KeyboardEvent } from "react";
import "./styles.css";

export default function Page() {
  const [files, setFiles] = useState<File[]>([]);
  const [showUploadSection, setShowUploadSection] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const chatRef = useRef(null);

  type ChatMessage = {
    role: string;
    content: string;
  };

  const API_URL = 'http://127.0.0.1:5000';

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files);
      setFiles((prevFiles) => [...prevFiles, ...newFiles]);
      setError(null);
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setFiles((prevFiles) =>
      prevFiles.filter((_, index) => index !== indexToRemove)
    );
  };

  const handleSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    if (files.length === 0) {
      setError("Please select at least one file.");
      console.error("No files selected for upload.");
      setIsLoading(false);
      return;
    }

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
      console.log(`File added to FormData: ${file.name}`);
    });

    try {
      console.log("Sending request to upload files...");
      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors',
      });

      console.log("Response received:", response);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Upload error response:", errorData);
        throw new Error(errorData.error || 'Failed to process files');
      }

      const data = await response.json();
      console.log("Files processed successfully:", data);
      
      setShowUploadSection(false);
      setChatHistory([
        { 
          role: "assistant", 
          content: "Files processed successfully. You can now ask questions about the documents." 
        }
      ]);

      if (chatRef.current) {
        (chatRef.current as HTMLDivElement).scrollTop = (
          chatRef.current as HTMLDivElement
        ).scrollHeight;
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      console.error("Error processing files:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserInput = async (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;

    const userMessage = (event.target as HTMLInputElement).value;
    if (userMessage.trim() === "") return;

    (event.target as HTMLInputElement).value = "";
    setChatHistory(prev => [...prev, { role: "user", content: userMessage }]);
    
    try {
      console.log("Sending user question:", userMessage);
      const response = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Accept': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({ question: userMessage }),
      });

      console.log("Response received for question:", response);

      if (!response.ok) {
        console.error("Error response from ask endpoint");
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      console.log("Response data received:", data);
      
      setChatHistory(prev => [...prev, { role: "assistant", content: data.answer }]);

      if (chatRef.current) {
        (chatRef.current as HTMLDivElement).scrollTop = (
          chatRef.current as HTMLDivElement
        ).scrollHeight;
      }
    } catch (error) {
      setChatHistory(prev => [...prev, { 
        role: "assistant", 
        content: "Sorry, I encountered an error processing your question. Please try again." 
      }]);
      console.error("Error processing message:", error);
    }
  };

  return (
    <div className="container bg-[#0F1116] min-h-screen text-white">
      <main className="main p-4 max-w-4xl mx-auto">
        <h1 className="title text-3xl font-bold text-center mb-8">Chat with Your Documents</h1>
        <div className="all flex flex-col mt-10 justify-center items-center">
          {showUploadSection ? (
            <div className="left flex flex-col justify-center items-center align-center w-full max-w-md">
              <form onSubmit={handleSubmit} className="w-full">
                <div className="fileInput flex flex-col justify-center items-center mb-6">
                  <label htmlFor="file" className="mb-2">Upload your documents (PDF only)</label>
                  <input
                    type="file"
                    id="file"
                    onChange={handleFileChange}
                    accept=".pdf"
                    multiple
                    className="w-full p-2 border border-gray-600 rounded"
                  />
                </div>
                
                {error && (
                  <div className="error text-red-500 text-center mb-4">{error}</div>
                )}

                <div className="selectedFiles mb-6">
                  {files.map((file, index) => (
                    <div key={index} className="fileItem flex justify-between items-center bg-gray-800 p-2 rounded mb-2">
                      <span className="truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="removeFile ml-2 text-red-500 hover:text-red-400"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div className="btn flex justify-center">
                  <button
                    className="button-8 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded disabled:opacity-50"
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? "Processing..." : "Submit & Process"}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="right w-full max-w-2xl">
              <div className="chatContainer bg-gray-900 p-4 rounded-lg mb-4 h-[500px] overflow-y-auto" ref={chatRef}>
                {chatHistory.map((message, index) => (
                  <div 
                    key={index} 
                    className={`message mb-4 p-3 rounded ${
                      message.role === "assistant" 
                        ? "bg-gray-800" 
                        : "bg-blue-900"
                    }`}
                  >
                    <span className="role font-bold">{message.role === "assistant" ? "AI" : "You"}:</span>{" "}
                    {message.content}
                  </div>
                ))}
              </div>

              <input
                type="text"
                placeholder="Ask me anything..."
                onKeyDown={handleUserInput}
                className="w-full p-3 rounded bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
