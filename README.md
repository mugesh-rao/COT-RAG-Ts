# F1-AI: Retrieval-Augmented Generation (RAG) Application

## Overview

F1-AI is a Retrieval-Augmented Generation (RAG) application that leverages OpenAI's GPT-4 model and a vector database to provide context-aware answers to questions about Formula 1 racing. This project demonstrates how to build a RAG application using TypeScript, OpenAI, DataStax Astra DB, and Playwright.


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
