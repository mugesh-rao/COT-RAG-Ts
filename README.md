# F1-AI: Retrieval-Augmented Generation (RAG) Application

## Overview

F1-AI is a Retrieval-Augmented Generation (RAG) application designed to provide context-aware, logically reasoned answers about Formula 1 racing. It leverages OpenAI's GPT-4 model with a reasoning model that follows Chain of Thought (CoT) principles, augmented by Retrieval-Augmented Reasoning (RAR) and Retrieval-Augmented Generation (RAG). The application retains context in memory for efficiency and uses a mock vector database (extendable to DataStax Astra DB) to retrieve relevant Formula 1 data. This project demonstrates an efficient, single-file TypeScript implementation for building advanced AI-driven Q&A systems.

# Key Features
Logical Reasoning: Employs step-by-step CoT reasoning for precise, logical answers.
Context Retention: Stores context in memory with a 1-hour expiration to enhance response quality.
RAR & RAG: Combines retrieved context with reasoning and generation for informed, accurate outputs.
Efficiency: Caches embeddings and minimizes API calls for faster performance.

## Configuration

You'll need to paste your OpenAI API key and DataStax Astra DB credentials into the relevant files, or create a `.env` file in the root directory with the following environment variables:

```bash
OPENAI_API_KEY=your-openai-api-key
ASTRA_DB_ID=your-astra-db-id
ASTRA_DB_REGION=your-astra-db-region
ASTRA_DB_USERNAME=your-astra-db-username
ASTRA_DB_PASSWORD=your-astra-db-password
```

You'll then need to make sure that these environment variables are referenced in your code and loaded correctly.

## Usage

You can modify the list of urls that I am scraping in the `src/ingest.ts` file. You can then run the following command to scrape the data:

```bash
npm run ingest
```

This will scrape the data from the urls and store it in the Astra DB.

You can then run the following command to test the RAG application using the query defined in the `src/answer.ts` file:

```bash
npm run answer
```
