import dspy
import httpx
import openai
import os
import pandas as pd
import io
from dotenv import load_dotenv
from typing import List, Dict, Any
import pprint

# Load environment variables from .env file
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client = openai.Client(api_key=OPENAI_API_KEY)

CKAN_BASE = "https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action"
MAX_SAMPLE_ROWS = 10  # Number of sample rows to send to LLM

# --- DSPy Signatures ---
class KeywordExtractionSignature(dspy.Signature):
    question: str = dspy.InputField()
    keywords: str = dspy.OutputField()

class DatasetSelectionSignature(dspy.Signature):
    question: str = dspy.InputField()
    dataset_summaries: list = dspy.InputField()
    best_index: int = dspy.OutputField()

class AnswerSynthesisSignature(dspy.Signature):
    question: str = dspy.InputField()
    context: dict = dspy.InputField()
    answer: str = dspy.OutputField()

# --- DSPy Modules ---
class KeywordExtractor(dspy.Module):
    def __init__(self):
        super().__init__()
        self.predict = dspy.Predict(KeywordExtractionSignature)

    def forward(self, question):
        print(f"[KeywordExtractor] Extracting keywords from question: {question}")
        result = self.predict(question=question)
        print(f"[KeywordExtractor] Extracted keywords: {result.keywords}")
        return result

class DatasetSelector(dspy.Module):
    def __init__(self):
        super().__init__()
        self.predict = dspy.Predict(DatasetSelectionSignature)

    def forward(self, question, dataset_summaries):
        print(f"[DatasetSelector] Selecting dataset for question: {question}")
        print(f"[DatasetSelector] Dataset summaries: {dataset_summaries}")
        result = self.predict(question=question, dataset_summaries=dataset_summaries)
        print(f"[DatasetSelector] Selected index: {result.best_index}")
        return result

class AnswerSynthesizer(dspy.Module):
    def __init__(self):
        super().__init__()
        self.predict = dspy.Predict(AnswerSynthesisSignature)

    def forward(self, question, context):
        print(f"[AnswerSynthesizer] Synthesizing answer for question: {question}")
        print(f"[AnswerSynthesizer] Context keys: {list(context.keys())}")
        # Print the actual context and question for debugging
        pp = pprint.PrettyPrinter(depth=3, compact=True, width=120)
        print("[AnswerSynthesizer] --- LLM INPUT START ---")
        print(f"Question: {question}")
        print("Context:")
        pp.pprint(context)
        print("[AnswerSynthesizer] --- LLM INPUT END ---")
        result = self.predict(question=question, context=context)
        print(f"[AnswerSynthesizer] Synthesized answer: {result.answer}")
        return result

# --- Main Pipeline Module ---
class CKANChatQA(dspy.Module):
    def __init__(self):
        super().__init__()
        self.keyword_extractor = KeywordExtractor()
        self.dataset_selector = DatasetSelector()
        self.answer_synthesizer = AnswerSynthesizer()

    def search_datasets(self, keywords: str) -> Dict[str, Any]:
        print(f"[CKANChatQA] Searching datasets with keywords: {keywords}")
        url = f"{CKAN_BASE}/package_search?q={keywords}"
        resp = httpx.get(url)
        return resp.json().get("result", {})

    def get_package(self, package_id: str) -> Dict[str, Any]:
        print(f"[CKANChatQA] Fetching package details for: {package_id}")
        url = f"{CKAN_BASE}/package_show?id={package_id}"
        resp = httpx.get(url)
        return resp.json().get("result", {})

    def get_csv_sample_and_count(self, url: str, nrows: int = MAX_SAMPLE_ROWS):
        print(f"[CKANChatQA] Downloading CSV sample from: {url}")
        # Download the CSV file
        resp = httpx.get(url)
        resp.raise_for_status()
        # Read a sample
        sample = pd.read_csv(io.BytesIO(resp.content), nrows=nrows)
        # Count total rows efficiently
        total = sum(1 for _ in io.StringIO(resp.text)) - 1  # minus header
        print(f"[CKANChatQA] Sampled {len(sample)} rows, total rows: {total}")
        return sample, total

    def forward(self, question: str) -> str:
        try:
            print(f"[CKANChatQA] Received question: {question}")
            # 1. Extract keywords
            keywords_pred = self.keyword_extractor(question)
            # Simplify keywords for CKAN search: use only the first keyword
            keyword_list = [k.strip() for k in keywords_pred.keywords.split(",") if k.strip()]
            if keyword_list:
                search_query = keyword_list[0]
            else:
                search_query = keywords_pred.keywords
            print(f"[CKANChatQA] Using search query: {search_query}")

            # 2. Search datasets
            search_result = self.search_datasets(search_query)
            # --- Only consider datasets with at least one CSV resource ---
            def has_csv_resource(ds):
                return any(
                    r.get("format", "").lower() == "csv" and r.get("url", "").endswith(".csv")
                    for r in ds.get("resources", [])
                )
            datasets = [ds for ds in search_result.get("results", []) if has_csv_resource(ds)][:5]
            if not datasets:
                print("[CKANChatQA] No datasets with CSV resources found.")
                return "No datasets with CSV resources found."

            # 3. Prepare concise dataset summaries
            dataset_summaries = [
                f"[{i}] Title: {ds.get('title', '')}\nDescription: {ds.get('notes', '')[:200]}\nFormats: {', '.join([r.get('format', '') for r in ds.get('resources', [])])}"
                for i, ds in enumerate(datasets)
            ]
            print(f"[CKANChatQA] Prepared {len(dataset_summaries)} dataset summaries (CSV only).")

            # 4. Select best dataset
            ds_pred = self.dataset_selector(question, dataset_summaries)
            idx = ds_pred.best_index
            print(f"[CKANChatQA] Selected dataset index: {idx}")
            if not (0 <= idx < len(datasets)):
                print(f"[CKANChatQA] Invalid index {idx}, defaulting to 0.")
                idx = 0

            package = datasets[idx]
            package_id = package["id"]

            # 5. Get package details
            package_details = self.get_package(package_id)

            # 6. Find suitable resource (prefer CSV)
            resources = package_details.get("resources", [])
            csv_resource = next(
                (r for r in resources if r.get("format", "").lower() == "csv" and r.get("url", "").endswith(".csv")),
                None
            )
            if csv_resource:
                sample, total = self.get_csv_sample_and_count(csv_resource["url"], nrows=MAX_SAMPLE_ROWS)
                context = {
                    "resource_name": csv_resource.get("name"),
                    "columns": list(sample.columns),
                    "sample_rows": sample.to_dict(orient="records"),
                    "total_rows": total,
                    "resource_url": csv_resource["url"],
                }
                answer_pred = self.answer_synthesizer(question, context)
                print(f"[CKANChatQA] Final answer: {answer_pred.answer}")
                return answer_pred.answer
            else:
                print(f"[CKANChatQA] No suitable CSV resource found in package '{package.get('title', package_id)}'.")
                return f"No suitable CSV data file found in package '{package.get('title', package_id)}'."

        except Exception as e:
            print(f"[CKANChatQA] Exception occurred: {str(e)}")
            return f"An error occurred while processing your question: {str(e)}"

qa_pipeline = CKANChatQA()

