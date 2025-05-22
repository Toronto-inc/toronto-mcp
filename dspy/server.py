from fastapi import FastAPI
from pydantic import BaseModel
import dspy
from pipeline import qa_pipeline
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Use the OpenAI GPT-4o model for DSPy
lm = dspy.LM('openai/gpt-4o', api_key=OPENAI_API_KEY)
dspy.configure(lm=lm)

app = FastAPI()

class Query(BaseModel):
    question: str

@app.post("/chat")
def chat(query: Query):
    answer = qa_pipeline.forward(query.question)
    return {"answer": answer} 