import OpenAI from "openai";

// Initialize OpenAI client
const client = new OpenAI({
    apiKey: "YOUR_API_KEY", // Replace with your actual OpenAI API key
});

// Interface for structured context
interface ContextItem {
    id: number;
    text: string;
}

// Step 1: Generate embedding for retrieval
async function generateEmbedding(text: string) {
    try {
        const response = await client.embeddings.create({
            model: "text-embedding-ada-002",
            input: text,
        });
        if (!response.data?.[0]?.embedding) throw new Error("Embedding generation failed");
        return response.data[0].embedding;
    } catch (error) {
        throw new Error(`Embedding error: ${error.message}`);
    }
}

// Step 2: Mock database query (simulating retrieval)
async function queryDatabase(embedding: number[]): Promise<{ text: string }[]> {
    // Simulate vector similarity search with mock data
    const mockResults = [
        {
            text: "In the 2024 Qatar GP qualifying, Verstappen impeded Russell, leading to a penalty dropping him from pole. Russell took pole but Verstappen won the race.",
        },
        {
            text: "Verstappen accused Russell of exaggerating the incident to stewards, saying he 'lost all respect.' Russell claimed Verstappen threatened him post-meeting.",
        },
    ];
    return Promise.resolve(mockResults);
}

// Step 3: Preprocess context
function preprocessContext(text: string): string {
    const cleaned = text.trim().replace(/\s+/g, " ");
    // Truncate if too long (e.g., for efficiency in real scenarios)
    return cleaned.length > 200 ? cleaned.slice(0, 197) + "..." : cleaned;
}

// Step 4: Generate response with CoT
async function generateResponse(question: string, context: ContextItem[]) {
    const contextString = context.length
        ? context.map((item) => `Doc ${item.id}: ${item.text}`).join("\n")
        : "No context provided.";

    const prompt = `
        You are an expert in Formula 1 racing. Answer using Chain of Thought reasoning:
        1. Summarize the context or note its absence.
        2. Identify key factors or arguments.
        3. Reason step-by-step to address the question.
        4. Conclude with a clear final answer.

        Context:
        ${contextString}

        Question: ${question}

        Format:
        [Step 1]
        Summary...
        [Step 2]
        Factors...
        [Step 3]
        Reasoning...
        [Final Answer]
        Answer...
    `;

    const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: "Follow the instructions precisely." },
            { role: "user", content: prompt },
        ],
        temperature: 0.5, // Controlled reasoning
        max_tokens: 1200,
    });

    return response.choices[0].message.content;
}

// Main function to process a question
async function askQuestion(question: string): Promise<string> {
    // CoT Step 1: Generate embedding
    const embedding = await generateEmbedding(question);

    // CoT Step 2: Retrieve context
    const rawContext = await queryDatabase(embedding);
    if (!rawContext.length) console.warn("No context retrieved; proceeding anyway");

    // CoT Step 3: Preprocess context
    const processedContext = rawContext.map((doc, idx) => ({
        id: idx,
        text: preprocessContext(doc.text),
    }));

    // CoT Step 4: Generate reasoned response
    const response = await generateResponse(question, processedContext);
    return response;
}

// Run the program
async function run() {
    const question = "Why are George Russell and Max Verstappen arguing after Qatar 2024?";
    try {
        console.log(`Processing question: "${question}"\n`);
        const answer = await askQuestion(question);
        console.log("Answer:\n", answer);
    } catch (error) {
        console.error("Error:", error.message);
    }
}

run();