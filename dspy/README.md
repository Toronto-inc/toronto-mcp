# DSPy Server for Toronto MCP

This folder contains a Python server using [dspy](https://github.com/stanfordnlp/dspy) to orchestrate tool calls to the MCP server (TypeScript) and provide a natural language interface for querying Toronto Open Data (CKAN) resources.

## Setup

1. **Install Python 3.9+** (recommended: use [pyenv](https://github.com/pyenv/pyenv) or [conda](https://docs.conda.io/en/latest/)).
2. **Create a virtual environment:**
   ```sh
   python3 -m venv .venv
   source .venv/bin/activate
   ```
3. **Install dependencies:**
   ```sh
   pip install -r requirements.txt
   ```
4. **Set up your OpenAI API key:**
   - Create a file called `.env` in the `dspy/` directory with the following contents:
     ```
     OPENAI_API_KEY=sk-...your-key...
     ```
   - The server uses `python-dotenv` to load this automatically.

## Running the Server

```sh
uvicorn server:app --reload
```

## Usage

Send a POST request to `/chat` with a JSON body:

```json
{
  "question": "How many bike lanes are there in toronto?"
}
```

## Configuration

- The server expects the MCP server to be running and accessible (see `server.py` for configuration).

## Python Environment & .gitignore

- The `.venv/` folder (your Python virtual environment), `__pycache__/`, `*.pyc`, and `.DS_Store` are all ignored by git (see the project `.gitignore`).
- **Do not commit your virtual environment or Python bytecode files.**

## Extending

- See `pipeline.py` for the DSPy pipeline logic.
- Add new modules or tool integrations as needed.

## Troubleshooting

- If you have issues with Python versions or dependencies, try deleting `.venv/` and recreating it.
- Make sure you are running the server from within the `dspy/` directory and that your virtual environment is activated (`source .venv/bin/activate`).
- If you see `ModuleNotFoundError`, double-check that you installed all dependencies with `pip install -r requirements.txt`.
