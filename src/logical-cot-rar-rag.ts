import OpenAI from "openai";

// Initialize OpenAI client
const client = new OpenAI({
    apiKey: "YOUR_API_KEY", // Replace with your actual OpenAI API key
});

// Interface for context items
interface ContextItem {
    id: number;
    text: string;
    timestamp: number; // For context retention
}

// Context store for retention and efficiency
class ContextStore {
    private contexts: Map<string, ContextItem[]> = new Map();
    private maxAgeMs = 60 * 60 * 1000; // 1-hour retention

    add(question: string, items: ContextItem[]) {
        const key = this.hashQuestion(question);
        this.contexts.set(key, items.map(item => ({ ...item, timestamp: Date.now() })));
    }

    get(question: string): ContextItem[] | null {
        const key = this.hashQuestion(question);
        const items = this.contexts.get(key);
        if (!items || items.some(item => Date.now() - item.timestamp >= this.maxAgeMs)) {
            this.contexts.delete(key);
            return null;
        }
        return items;
    }

    private hashQuestion(question: string): string {
        return question.split("").reduce((a, c) => a + c.charCodeAt(0), 0).toString();
    }
}

const contextStore = new ContextStore();

// CoT Step 1: Generate embedding with caching (RAG preparation)
async function generateEmbedding(text: string, cache: Map<string, number[]>): Promise<number[]> {
    console.log("[CoT Step 1] Generating/checking embedding...");
    if (cache.has(text)) {
        console.log("[CoT Step 1] Cached embedding retrieved.");
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

// CoT Step 2: Retrieve context (RAG + RAR integration)
async function retrieveContext(embedding: number[], question: string): Promise<ContextItem[]> {
    console.log("[CoT Step 2] Retrieving augmented context (RAG)...");
    const cachedContext = contextStore.get(question);
    if (cachedContext) {
        console.log("[CoT Step 2] Using retained context.");
        return cachedContext;
    }

    // Mock retrieval (replace with real vector DB in production)
    const rawContext = [
        { text: "2024 Qatar GP qualifying: Verstappen impeded Russell, penalized one grid spot. Russell took pole; Verstappen won race." },
        { text: "Verstappen accused Russell of exaggerating to stewards, lost respect. Russell claimed Verstappen threatened him." },
    ];
    const processedContext = rawContext.map((doc, idx) => ({ id: idx, text: doc.text, timestamp: 0 }));
    contextStore.add(question, processedContext);
    console.log("[CoT Step 2] Retrieved context:", rawContext.map(c => c.text));
    return processedContext;
}

// CoT Step 3: Preprocess context efficiently
function preprocessContext(context: ContextItem[]): ContextItem[] {
    console.log("[CoT Step 3] Preprocessing context...");
    const processed = context.map(item => ({
        ...item,
        text: item.text.trim().slice(0, 150), // Efficient token limit
    }));
    console.log("[CoT Step 3] Processed context:", processed.map(c => c.text));
    return processed;
}

// CoT Step 4: Generate response with RAR + RAG + CoT
async function generateResponse(question: string, context: ContextItem[]): Promise<string> {
    console.log("[CoT Step 4] Generating response with RAR + RAG...");
    const contextString = context.map(c => `Doc ${c.id}: ${c.text}`).join("\n") || "No context.";

    const prompt = `
        You are a logical reasoning AI using Retrieval-Augmented Reasoning (RAR) and Generation (RAG). Follow Chain of Thought (CoT):
        1. Summarize retrieved context logically.
        2. Identify key premises from context and question.
        3. Reason step-by-step using retrieved context to augment logical deduction.
        4. Conclude with a precise answer.

        Context (Retrieved):
        ${contextString}

        Question: ${question}

        Format:
        [Step 1: Context Summary]
        ...
        [Step 2: Key Premises]
        ...
        [Step 3: Augmented Reasoning]
        ...
        [Step 4: Conclusion]
        ...
    `;

    const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: "Reason logically with retrieved context." },
            { role: "user", content: prompt },
        ],
        temperature: 0.3, // High precision for logic
        max_tokens: 800, // Efficient token usage
    });
    console.log("[CoT Step 4] Response generated.");
    return response.choices[0].message.content;
}

// Main reasoning function
async function reasonLogically(question: string, embeddingCache: Map<string, number[]>): Promise<string> {
    try {
        // CoT Step 1: Embedding for retrieval
        const embedding = await generateEmbedding(question, embeddingCache);

        // CoT Step 2: Retrieve context (RAG)
        const rawContext = await retrieveContext(embedding, question);

        // CoT Step 3: Preprocess for efficiency
        const processedContext = preprocessContext(rawContext);

        // CoT Step 4: Generate with RAR + RAG
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
    console.log(`Reasoning for: "${question}"\n`);
    const answer = await reasonLogically(question, embeddingCache);
    console.log("\nAnswer:\n", answer);

    // Test context retention and efficiency
    console.log("\nRe-running to test retention...");
    const cachedAnswer = await reasonLogically(question, embeddingCache);
    console.log("\nCached Answer:\n", cachedAnswer);
}

run();