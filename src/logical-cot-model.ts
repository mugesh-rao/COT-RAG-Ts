import OpenAI from "openai";

// Initialize OpenAI client
const client = new OpenAI({
    apiKey: "YOUR_API_KEY", // Replace with your actual OpenAI API key
});

// Interface for context items
interface ContextItem {
    id: number;
    text: string;
    timestamp: number; // For context retention management
}

// Efficient in-memory context store
class ContextStore {
    private contexts: Map<string, ContextItem[]> = new Map(); // Key: question hash, Value: context items
    private maxAgeMs = 60 * 60 * 1000; // 1-hour retention

    // Add or update context for a question
    add(question: string, items: ContextItem[]) {
        const key = this.hashQuestion(question);
        this.contexts.set(key, items.map(item => ({
            ...item,
            timestamp: Date.now(),
        })));
    }

    // Retrieve context if still valid
    get(question: string): ContextItem[] | null {
        const key = this.hashQuestion(question);
        const items = this.contexts.get(key);
        if (!items) return null;
        const now = Date.now();
        if (items.every(item => now - item.timestamp < this.maxAgeMs)) {
            return items;
        }
        this.contexts.delete(key); // Clear expired context
        return null;
    }

    // Simple hash for question uniqueness
    private hashQuestion(question: string): string {
        return question.toLowerCase().split("").reduce((a, c) => a + c.charCodeAt(0), 0).toString();
    }
}

const contextStore = new ContextStore();

// CoT Step 1: Generate embedding (with caching)
async function generateEmbedding(text: string, cache: Map<string, number[]>): Promise<number[]> {
    console.log("[CoT Step 1] Generating/checking embedding...");
    if (cache.has(text)) {
        console.log("[CoT Step 1] Using cached embedding.");
        return cache.get(text)!;
    }
    const response = await client.embeddings.create({
        model: "text-embedding-ada-002",
        input: text,
    });
    const embedding = response.data?.[0]?.embedding;
    if (!embedding) throw new Error("Embedding failed");
    cache.set(text, embedding);
    console.log("[CoT Step 1] New embedding generated.");
    return embedding;
}

// CoT Step 2: Retrieve context (mock DB with store integration)
async function queryDatabase(embedding: number[], question: string): Promise<ContextItem[]> {
    console.log("[CoT Step 2] Retrieving context...");
    const cachedContext = contextStore.get(question);
    if (cachedContext) {
        console.log("[CoT Step 2] Using retained context from store.");
        return cachedContext;
    }

    // Mock database simulation
    const rawContext = [
        { text: "In the 2024 Qatar GP qualifying, Max Verstappen impeded George Russell, earning a penalty. Russell took pole, Verstappen won the race." },
        { text: "Verstappen accused Russell of exaggerating to stewards, losing respect. Russell claimed Verstappen threatened him." },
    ];
    const processedContext = rawContext.map((doc, idx) => ({ id: idx, text: doc.text, timestamp: 0 }));
    contextStore.add(question, processedContext);
    console.log("[CoT Step 2] Retrieved and stored new context:", rawContext.map(c => c.text));
    return processedContext;
}

// CoT Step 3: Preprocess context efficiently
function preprocessContext(context: ContextItem[]): ContextItem[] {
    console.log("[CoT Step 3] Preprocessing context...");
    const processed = context.map(item => ({
        ...item,
        text: item.text.trim().slice(0, 200), // Efficient truncation
    }));
    console.log("[CoT Step 3] Preprocessed context:", processed.map(c => c.text));
    return processed;
}

// CoT Step 4: Generate logical CoT response
async function generateResponse(question: string, context: ContextItem[]): Promise<string> {
    console.log("[CoT Step 4] Generating logical response...");
    const contextString = context.map(c => `Doc ${c.id}: ${c.text}`).join("\n") || "No context.";

    const prompt = `
        You are a logical reasoning AI. Answer using Chain of Thought:
        1. Summarize the context logically.
        2. Extract key premises or events.
        3. Deduce the answer step-by-step, ensuring logical consistency.
        4. State a concise conclusion.

        Context:
        ${contextString}

        Question: ${question}

        Format:
        [Step 1: Context Summary]
        ...
        [Step 2: Key Premises]
        ...
        [Step 3: Logical Deduction]
        ...
        [Step 4: Conclusion]
        ...
    `;

    const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: "Reason logically and concisely." },
            { role: "user", content: prompt },
        ],
        temperature: 0.4, // Favor logical precision
        max_tokens: 1000,
    });
    console.log("[CoT Step 4] Response generated.");
    return response.choices[0].message.content;
}

// Main CoT reasoning function
async function reasonLogically(question: string, embeddingCache: Map<string, number[]>): Promise<string> {
    try {
        const embedding = await generateEmbedding(question, embeddingCache);
        const rawContext = await queryDatabase(embedding, question);
        const processedContext = preprocessContext(rawContext);
        const response = await generateResponse(question, processedContext);
        return response;
    } catch (error) {
        console.error("[Error] Reasoning failed:", error.message);
        throw error;
    }
}

// Run the model
async function run() {
    const question = "Why are George Russell and Max Verstappen arguing after Qatar 2024?";
    const embeddingCache = new Map<string, number[]>();
    console.log(`Reasoning logically for: "${question}"\n`);
    const answer = await reasonLogically(question, embeddingCache);
    console.log("\nAnswer:\n", answer);

    // Demonstrate context retention
    console.log("\nRe-running with same question to test context retention...");
    const cachedAnswer = await reasonLogically(question, embeddingCache);
    console.log("\nCached Answer:\n", cachedAnswer);
}

run();